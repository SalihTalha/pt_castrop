// Prayer time screen for IGMG Castrop-Rauxel Merkez Camii.
// Plain ES5 (no modules, fetch, Intl, let/const or arrow functions) so it runs
// on old TV browsers. The times come from prayer-times.js (PRAYER_TIMES); the
// colours, texts, languages, hadiths and background from settings.js
// (DISPLAY_SETTINGS), which admin.html writes.
(function () {
  var WEATHER_URL =
    "https://api.open-meteo.com/v1/forecast?latitude=51.55&longitude=7.3167" +
    "&current=temperature_2m,weather_code&timezone=Europe%2FBerlin";
  var WEATHER_EVERY_MS = 30 * 60 * 1000;
  var DATA_EVERY_MS = 60 * 60 * 1000;
  var URGENT_MS = 5 * 60 * 1000;
  var PRAYER_KEYS = ["imsak", "gunes", "ogle", "ikindi", "aksam", "yatsi"];

  // Labels used when settings.js does not set them (same as index.html).
  var TR_TEXTS = {
    mosqueName: "IGMG Castrop-Rauxel Merkez Camii",
    location: "Castrop-Rauxel, Almanya",
    title: "Namaz Vakitleri",
    imsak: "İmsak",
    gunes: "Güneş",
    ogle: "Öğle",
    ikindi: "İkindi",
    aksam: "Akşam",
    yatsi: "Yatsı",
    sabah: "Sabah namazı",
    countdown: "{vakit} Vaktine Kalan Süre",
    clock: "Saat",
    weather: "Hava Durumu",
    hadith: "Hadis-i Şerif",
    noData: "Bugün için vakit bilgisi yok"
  };

  // Hijri month names as Diyanet writes them, simplified (see simplify()).
  var HIJRI_KEYS = ["muharrem", "safer", "rebiulevvel", "rebiulahir", "cemaziyelevvel", "cemaziyelahir",
    "recep", "saban", "ramazan", "sevval", "zilkade", "zilhicce"];

  // Dates and weather words per language (not editable on admin.html).
  var LOCALES = {
    tr: {
      months: ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"],
      weekdays: ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"],
      weather: ["Açık", "Parçalı bulutlu", "Sisli", "Yağmurlu", "Karlı", "Fırtınalı", "Değişken", "Bilgi yok"],
      date: function (day, month, year, weekday) {
        return pad(day) + " " + month + " " + year + " " + weekday;
      }
    },
    de: {
      months: ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"],
      weekdays: ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"],
      weather: ["Klar", "Teilweise bewölkt", "Neblig", "Regen", "Schnee", "Gewitter", "Wechselhaft", "Keine Daten"],
      hijriMonths: ["Muharram", "Safar", "Rabi al-Awwal", "Rabi al-Achir", "Dschumada al-Ula", "Dschumada al-Achira",
        "Radschab", "Schaban", "Ramadan", "Schawwal", "Dhu l-Qada", "Dhu l-Hiddscha"],
      date: function (day, month, year, weekday) {
        return weekday + ", " + day + ". " + month + " " + year;
      },
      hijri: function (day, month, year) {
        return day + ". " + month + " " + year;
      }
    },
    ar: {
      rtl: true,
      months: ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"],
      weekdays: ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"],
      weather: ["صافٍ", "غائم جزئياً", "ضباب", "ممطر", "ثلوج", "عواصف رعدية", "متقلب", "لا توجد بيانات"],
      hijriMonths: ["محرم", "صفر", "ربيع الأول", "ربيع الآخر", "جمادى الأولى", "جمادى الآخرة",
        "رجب", "شعبان", "رمضان", "شوال", "ذو القعدة", "ذو الحجة"],
      date: function (day, month, year, weekday) {
        return weekday + "، " + day + " " + month + " " + year;
      },
      hijri: function (day, month, year) {
        return day + " " + month + " " + year + " هـ";
      }
    }
  };

  var settings = {};
  var shown = {};
  var needsFit = true;
  var testOffsetMs = 0;
  var pinnedLanguage = null;
  var weatherNow = null;
  var previewing = false;
  var pinnedHadith = null;

  function byId(id) {
    return document.getElementById(id);
  }

  // Returns true when the text changed.
  function setText(id, text) {
    var element = byId(id);
    if (!element || shown[id] === text) {
      return false;
    }
    shown[id] = text;
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
    element.appendChild(document.createTextNode(text));
    return true;
  }

  // For labels that may need shrinking to fit (long German or Arabic words).
  function setFitText(id, text) {
    if (setText(id, text)) {
      needsFit = true;
    }
  }

  function setClass(id, className) {
    var element = byId(id);
    if (!element || shown["class:" + id] === className) {
      return;
    }
    shown["class:" + id] = className;
    element.className = className;
  }

  function pad(value) {
    return value < 10 ? "0" + value : String(value);
  }

  // Germany is UTC+1, and UTC+2 from the last Sunday of March to the last
  // Sunday of October (switching at 01:00 UTC). Working this out here means
  // only the TV's clock has to be right, not its time zone setting.
  function berlinOffsetMs(utcMs) {
    var year = new Date(utcMs).getUTCFullYear();
    var isSummer = utcMs >= lastSundayAt1Utc(year, 2) && utcMs < lastSundayAt1Utc(year, 9);
    return (isSummer ? 2 : 1) * 3600000;
  }

  function lastSundayAt1Utc(year, month) {
    var lastDay = new Date(Date.UTC(year, month + 1, 0));
    return Date.UTC(year, month, lastDay.getUTCDate() - lastDay.getUTCDay(), 1);
  }

  // Berlin wall-clock time, read with the getUTC* methods.
  function toBerlin(utcMs) {
    return new Date(utcMs + berlinOffsetMs(utcMs));
  }

  function berlinToUtc(year, month, day, hours, minutes, seconds) {
    var wallMs = Date.UTC(year, month, day, hours, minutes, seconds);
    return wallMs - berlinOffsetMs(wallMs - 3600000);
  }

  function prayerToUtc(year, month, day, hhmm) {
    var parts = hhmm.split(":");
    return berlinToUtc(year, month, day, parseInt(parts[0], 10), parseInt(parts[1], 10), 0);
  }

  function getDay(year, month, day) {
    var data = window.PRAYER_TIMES;
    var date = new Date(Date.UTC(year, month, day));
    var key = date.getUTCFullYear() + "-" + pad(date.getUTCMonth() + 1) + "-" + pad(date.getUTCDate());
    return (data && data.days && data.days[key]) || null;
  }

  // "07:49" minus 30 minutes is "07:19".
  function minusMinutes(hhmm, minutes) {
    var parts = hhmm.split(":");
    var total = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10) - Math.round(minutes);
    total = ((total % 1440) + 1440) % 1440;
    return pad(Math.floor(total / 60)) + ":" + pad(total % 60);
  }

  function formatDuration(ms) {
    var total = Math.max(0, Math.floor(ms / 1000));
    return pad(Math.floor(total / 3600)) + ":" + pad(Math.floor(total / 60) % 60) + ":" + pad(total % 60);
  }

  // ---------- Languages ----------

  // The languages to rotate through: those chosen on admin.html that have texts.
  function languages() {
    var wanted = settings.languages || ["tr"];
    var list = [];
    var i;
    for (i = 0; i < wanted.length; i++) {
      if (LOCALES[wanted[i]] && (wanted[i] === "tr" || (settings.texts && settings.texts[wanted[i]]))) {
        list.push(wanted[i]);
      }
    }
    return list.length ? list : ["tr"];
  }

  // Depends only on the clock, so every TV switches language at the same time.
  function currentLanguage(nowMs) {
    if (pinnedLanguage) {
      return pinnedLanguage;
    }
    var list = languages();
    var seconds = Math.max(3, Number(settings.languageSeconds) || 10);
    return list[Math.floor(nowMs / 1000 / seconds) % list.length];
  }

  // Texts for one language; anything left empty falls back to Turkish.
  function textsFor(lang) {
    var texts = settings.texts || {};
    var own = texts[lang] || {};
    var tr = texts.tr || {};
    var result = {};
    var key;
    for (key in TR_TEXTS) {
      if (TR_TEXTS.hasOwnProperty(key)) {
        result[key] = own[key] || tr[key] || TR_TEXTS[key];
      }
    }
    return result;
  }

  // Keeps Arabic text in the right order inside the left-to-right page.
  function bidi(lang, text) {
    return LOCALES[lang].rtl ? "‫" + text + "‬" : text;
  }

  function simplify(text) {
    var map = { "ş": "s", "ç": "c", "ğ": "g", "ü": "u", "ö": "o", "ı": "i", "â": "a", "î": "i", "û": "u", "̇": "" };
    return text.toLowerCase().replace(/[şçğüöıâîû̇]/g, function (c) {
      return map[c];
    });
  }

  // Diyanet gives the Hijri date in Turkish ("1 Cemaziyelevvel 1448").
  function hijriDate(lang, text) {
    var match = /^(\d{1,2})\s+(\S+)\s+(\d{3,4})$/.exec(text || "");
    var locale = LOCALES[lang];
    var index = -1;
    var i;
    if (!match || !locale.hijri) {
      return text || "";
    }
    for (i = 0; i < HIJRI_KEYS.length; i++) {
      if (HIJRI_KEYS[i] === simplify(match[2])) {
        index = i;
      }
    }
    return index === -1 ? text : locale.hijri(parseInt(match[1], 10), locale.hijriMonths[index], match[3]);
  }

  // ---------- Hadiths ----------

  // The hadiths to rotate through (those with text), or null to hide the band.
  function hadithItems() {
    var hadiths = settings.hadiths;
    var items = [];
    var i, text;
    if (!hadiths || hadiths.enabled === false || !hadiths.items) {
      return null;
    }
    for (i = 0; i < hadiths.items.length; i++) {
      text = hadiths.items[i] && hadiths.items[i].text;
      if (text && (text.tr || text.de || text.ar)) {
        items.push(hadiths.items[i]);
      }
    }
    return items.length ? items : null;
  }

  // The hadith admin.html is editing, if it has text (only in its preview).
  function previewHadith(items) {
    var all = settings.hadiths.items;
    var item = pinnedHadith !== null && all ? all[pinnedHadith] : null;
    var i;
    for (i = 0; i < items.length; i++) {
      if (items[i] === item) {
        return item;
      }
    }
    return null;
  }

  // Which hadith to show. It depends only on the time, so all TVs agree.
  function hadithIndex(count, now, currentIndex, beforeImsak) {
    var change = settings.hadiths.change;
    var day = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 86400000);
    var minutes, n;
    if (change === "prayer" && currentIndex >= 0) {
      // Changes at each prayer time; before İmsak it is still yesterday's Yatsı.
      n = (beforeImsak ? day - 1 : day) * 6 + currentIndex;
    } else if (change === "hour" || change === "minutes") {
      minutes = change === "hour" ? 60 : Math.max(1, Number(settings.hadiths.minutes) || 30);
      n = Math.floor(now.getTime() / (minutes * 60000));
    } else {
      n = day;
    }
    // Each full round starts one hadith later, so with e.g. 6 hadiths and
    // 6 prayer times the same hadith does not come back at the same prayer.
    n += Math.floor(n / count);
    return ((n % count) + count) % count;
  }

  // The text in the current language, or else in the first language that has it.
  function pickLanguage(values, lang) {
    var order = [lang, "tr", "de", "ar"];
    var i;
    for (i = 0; i < order.length; i++) {
      if (values && values[order[i]]) {
        return order[i];
      }
    }
    return null;
  }

  function renderHadith(lang, item) {
    var textLang, text, source;
    setClass("screen", item ? "" : "no-hadith");
    if (!item) {
      return;
    }
    textLang = pickLanguage(item.text, lang);
    text = textLang ? item.text[textLang] : "";
    source = textLang && item.source && item.source[textLang] ? "— " + item.source[textLang] : "";
    if (shown["dir:hadith"] !== textLang) {
      shown["dir:hadith"] = textLang;
      byId("hadith-wrap").setAttribute("dir", textLang && LOCALES[textLang].rtl ? "rtl" : "ltr");
      needsFit = true;
    }
    setFitText("hadith-text", text);
    setFitText("hadith-source", source);
  }

  // ---------- Rendering ----------

  function render() {
    // Whole seconds, so the countdown matches the clock shown next to it.
    var nowMs = Math.floor((new Date().getTime() + testOffsetMs) / 1000) * 1000;
    var now = toBerlin(nowMs);
    var year = now.getUTCFullYear();
    var month = now.getUTCMonth();
    var date = now.getUTCDate();
    var today = getDay(year, month, date);
    var lang = currentLanguage(nowMs);
    var locale = LOCALES[lang];
    var t = textsFor(lang);
    var nextIndex = -1;
    var currentIndex = -1;
    var beforeImsak = false;
    var targetMs = 0;
    var items = hadithItems();
    var prayerMs, tomorrow, isUrgent, className, showSabah, i;

    setText("clock", pad(now.getUTCHours()) + ":" + pad(now.getUTCMinutes()) + ":" + pad(now.getUTCSeconds()));
    setFitText("mosque-name-text", bidi(lang, t.mosqueName));
    setFitText("location-text", bidi(lang, t.location));
    setFitText("title-text", bidi(lang, t.title));
    setFitText("clock-title", bidi(lang, t.clock));
    setFitText("weather-title", bidi(lang, t.weather));
    setFitText("hadith-title-text", bidi(lang, t.hadith));
    setFitText("date-text", bidi(lang, locale.date(date, locale.months[month], year, locale.weekdays[now.getUTCDay()])));
    setFitText("hijri-text", today && today.hicri ? bidi(lang, hijriDate(lang, today.hicri)) : " ");
    setFitText("weather-label-text", bidi(lang, locale.weather[weatherKind(weatherNow ? weatherNow.weather_code : null)]));

    for (i = 0; i < PRAYER_KEYS.length; i++) {
      setFitText("name-" + PRAYER_KEYS[i], bidi(lang, t[PRAYER_KEYS[i]]));
      setText("time-" + PRAYER_KEYS[i], today ? today[PRAYER_KEYS[i]] : "--:--");

      if (today) {
        prayerMs = prayerToUtc(year, month, date, today[PRAYER_KEYS[i]]);
        if (prayerMs <= nowMs) {
          currentIndex = i;
        } else if (nextIndex === -1) {
          nextIndex = i;
          targetMs = prayerMs;
        }
      }
    }

    if (today && nextIndex === -1) {
      // After Yatsı, count down to tomorrow's İmsak.
      tomorrow = getDay(year, month, date + 1) || today;
      nextIndex = 0;
      targetMs = prayerToUtc(year, month, date + 1, tomorrow.imsak);
    }

    if (today && currentIndex === -1) {
      // Before İmsak it is still Yatsı time.
      beforeImsak = true;
      currentIndex = PRAYER_KEYS.length - 1;
    }

    renderHadith(lang, items ? previewHadith(items) || items[hadithIndex(items.length, now, today ? currentIndex : -1, beforeImsak)] : null);

    // The congregational morning prayer, shown in the İmsak box.
    showSabah = today && settings.sabah && settings.sabah.enabled;
    if (showSabah) {
      setFitText("sabah-text", bidi(lang, t.sabah + " " + minusMinutes(today.gunes, Number(settings.sabah.minutes) || 0)));
    }

    if (!today) {
      setFitText("countdown-label-text", bidi(lang, t.noData));
      setText("countdown", "--:--:--");
      for (i = 0; i < PRAYER_KEYS.length; i++) {
        setClass("prayer-" + PRAYER_KEYS[i], "panel prayer");
      }
    } else {
      // In the last five minutes the next prayer's card blinks once a second.
      isUrgent = targetMs - nowMs <= URGENT_MS && Math.floor(nowMs / 1000) % 2 === 0;

      for (i = 0; i < PRAYER_KEYS.length; i++) {
        className = "panel prayer";
        if (i === 0 && showSabah) {
          className += " has-sabah";
        }
        if (i === nextIndex) {
          className += isUrgent ? " is-next is-urgent" : " is-next";
        }
        if (i === currentIndex) {
          className += " is-current";
        }
        setClass("prayer-" + PRAYER_KEYS[i], className);
      }

      setFitText("countdown-label-text", bidi(lang, t.countdown.replace("{vakit}", t[PRAYER_KEYS[nextIndex]])));
      setText("countdown", formatDuration(targetMs - nowMs));
    }

    if (needsFit) {
      needsFit = false;
      fitTexts();
    }
  }

  // Shrinks one-line labels that are wider than their space, and the hadith
  // until it fits its band.
  function fitTexts() {
    var em = byId("screen").offsetWidth / 96;
    var name, i;
    for (i = 0; i < PRAYER_KEYS.length; i++) {
      name = byId("name-" + PRAYER_KEYS[i]);
      fitWidth(name, byId("time-" + PRAYER_KEYS[i]).offsetLeft - name.parentNode.offsetLeft - 0.8 * em);
    }
    if (byId("sabah-line")) {
      fitWidth(byId("sabah-text"), byId("sabah-line").offsetWidth - 1.6 * em);
    }
    fitWidth(byId("countdown-label-text"), byId("countdown").offsetLeft - byId("countdown-label").offsetLeft - 1.5 * em);
    fitWidth(byId("mosque-name-text"), byId("brand").offsetWidth);
    fitWidth(byId("location-text"), byId("brand").offsetWidth);
    fitWidth(byId("title-text"), 20 * em);
    fitWidth(byId("hadith-title-text"), 10.3 * em);
    fitWidth(byId("clock-title"), 33 * em);
    fitWidth(byId("date-text"), 33 * em);
    fitWidth(byId("hijri-text"), 33 * em);
    fitWidth(byId("weather-title"), 33 * em);
    fitWidth(byId("weather-label-text"), 33 * em);
    fitHadith();
  }

  function fitWidth(element, maxPx) {
    if (!element) {
      return;
    }
    element.style.fontSize = "";
    element.style.verticalAlign = "";
    var width = element.offsetWidth;
    if (maxPx > 0 && width > maxPx) {
      element.style.fontSize = Math.floor((100 * maxPx) / width) / 100 + "em";
      element.style.verticalAlign = "middle";
    }
  }

  function fitHadith() {
    var wrap = byId("hadith-wrap");
    // The band's inner height; the table around the text grows with it.
    var maxPx = byId("hadith-panel").clientHeight - (0.4 * byId("screen").offsetWidth) / 96;
    var size = 2.1;
    wrap.style.fontSize = size + "em";
    while (maxPx > 0 && wrap.offsetHeight > maxPx && size > 0.8) {
      size = Math.round(size * 92) / 100;
      wrap.style.fontSize = size + "em";
    }
  }

  function tick() {
    render();
    // Wake just after the next full second so the clock never skips a second.
    setTimeout(tick, 1020 - (new Date().getTime() % 1000));
  }

  // ---------- Weather ----------

  function refreshWeather() {
    if (!window.XMLHttpRequest || !window.JSON) {
      showWeather(null);
      return;
    }

    var request = new XMLHttpRequest();
    request.onreadystatechange = function () {
      if (request.readyState !== 4) {
        return;
      }
      var current = null;
      try {
        current = JSON.parse(request.responseText).current;
      } catch (error) {
        current = null;
      }
      showWeather(current && typeof current.temperature_2m === "number" ? current : null);
    };

    try {
      request.open("GET", WEATHER_URL, true);
      request.send();
    } catch (error) {
      showWeather(null);
    }
  }

  function showWeather(current) {
    weatherNow = current;
    setText("weather-temp", current ? current.temperature_2m.toFixed(1).replace(".", ",") + " °C" : "--,- °C");
  }

  // Index into LOCALES[...].weather.
  function weatherKind(code) {
    if (code === null || code === undefined) {
      return 7;
    }
    if (code <= 1) {
      return 0;
    }
    if (code <= 3) {
      return 1;
    }
    if (code === 45 || code === 48) {
      return 2;
    }
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
      return 3;
    }
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
      return 4;
    }
    if (code >= 95) {
      return 5;
    }
    return 6;
  }

  // ---------- Settings ----------

  // Load settings.js and prayer-times.js again every hour, so changes saved on
  // admin.html reach the TV without a page reload. If loading fails, the
  // current data stays.
  function refreshData() {
    if (previewing) {
      // admin.html's preview supplies its own (unsaved) settings.
      return;
    }
    reloadScript("settings.js", function () {
      applySettings(window.DISPLAY_SETTINGS);
    });
    reloadScript("prayer-times.js", render);
  }

  function reloadScript(name, done) {
    var script = document.createElement("script");
    script.src = name + "?v=" + new Date().getTime();
    script.onload = script.onerror = function () {
      script.parentNode.removeChild(script);
      done();
    };
    document.body.appendChild(script);
  }

  function hexToRgb(hex) {
    var match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || "");
    return match ? [parseInt(match[1], 16), parseInt(match[2], 16), parseInt(match[3], 16)] : null;
  }

  function mix(a, b, amount) {
    return [
      Math.round(a[0] + (b[0] - a[0]) * amount),
      Math.round(a[1] + (b[1] - a[1]) * amount),
      Math.round(a[2] + (b[2] - a[2]) * amount)
    ];
  }

  function hex(rgb) {
    return "#" + (16777216 + rgb[0] * 65536 + rgb[1] * 256 + rgb[2]).toString(16).slice(1);
  }

  // Solid colour first for browsers without rgba(), then the see-through one.
  function background(rgb, alpha) {
    alpha = Math.max(0, Math.min(1, alpha));
    return "background:" + hex(rgb) + ";background:rgba(" + rgb.join(",") + "," + alpha + ");";
  }

  function setCss(css) {
    var style = byId("settings-style");
    if (!style) {
      style = document.createElement("style");
      style.id = "settings-style";
      document.getElementsByTagName("head")[0].appendChild(style);
    }
    if (style.styleSheet) {
      style.styleSheet.cssText = css;
    } else {
      while (style.firstChild) {
        style.removeChild(style.firstChild);
      }
      style.appendChild(document.createTextNode(css));
    }
  }

  // Applies DISPLAY_SETTINGS. Missing values keep the defaults in style.css.
  // backdropSrc lets admin.html preview a background before it is saved.
  function applySettings(newSettings, backdropSrc, logo2Src) {
    var s = newSettings || {};
    var image = s.backgroundImage || {};
    var logo = s.secondLogo || {};
    var white = [255, 255, 255];
    var bg = hexToRgb(s.backgroundColor);
    var panel = hexToRgb(s.panelColor);
    var next = hexToRgb(s.nextColor);
    var text = hexToRgb(s.textColor);
    var highlight = hexToRgb(s.highlightColor);
    var topBar, topText, bottomBar, bottomText, bottomNumber;
    var alpha = typeof s.panelOpacity === "number" ? s.panelOpacity : 0.7;
    var backdrop = byId("backdrop");
    var src, ratio, logoWidth, logoHeight;

    settings = s;

    if (bg && panel && next && text && highlight) {
      topBar = hexToRgb(s.topBarColor) || panel;
      topText = hexToRgb(s.topBarTextColor) || text;
      bottomBar = hexToRgb(s.bottomBarColor) || mix(panel, next, 0.5);
      bottomText = hexToRgb(s.bottomBarTextColor) || text;
      bottomNumber = hexToRgb(s.bottomBarNumberColor) || highlight;
      setCss(
        "html,body{background:" + hex(bg) + ";}" +
        "body{color:" + hex(text) + ";}" +
        ".panel{" + background(panel, alpha) + "border-color:" + hex(mix(panel, white, 0.65)) + ";}" +
        ".label,#location,#weather-label,#hadith-source{color:" + hex(mix(text, panel, 0.25)) + ";}" +
        "#hijri,#hadith-title,.prayer.is-next .prayer-time{color:" + hex(highlight) + ";}" +
        ".prayer.is-next{" + background(next, alpha + 0.12) + "border-color:" + hex(highlight) + ";}" +
        ".prayer.is-urgent{" + background(mix(next, white, 0.15), alpha + 0.2) + "border-color:#ffffff;}" +
        ".prayer.is-urgent .prayer-name,.prayer.is-urgent .prayer-time{color:" + hex(mix(highlight, white, 0.5)) + ";}" +
        ".prayer.is-current{" + background(mix(panel, white, 0.72), alpha + 0.22) + "color:#111f22;}" +
        "#topbar{" + background(topBar, alpha) + "color:" + hex(topText) + ";}" +
        "#topbar #location{color:" + hex(mix(topText, topBar, 0.25)) + ";}" +
        "#countdown-panel{" + background(bottomBar, alpha + 0.05) + "color:" + hex(bottomText) + ";}" +
        "#countdown{color:" + hex(bottomNumber) + ";}"
      );
    }

    document.title = textsFor("tr").mosqueName + " Namaz Vakitleri";

    if (image.enabled === false) {
      backdrop.style.display = "none";
    } else {
      // The version changes whenever admin.html saves a new background.jpg,
      // so the TV loads the new image instead of a cached one.
      src = backdropSrc || "background.jpg" + (s.version ? "?v=" + s.version : "");
      if (backdrop.getAttribute("src") !== src) {
        backdrop.setAttribute("src", src);
      }
      backdrop.style.display = "block";
    }

    // The second logo replaces the title on the right of the top bar: 4em
    // high like the first logo, narrowed if wider than 20em, centred in its box.
    if (logo.enabled && logo.width > 0 && logo.height > 0 && (logo2Src || logo.version)) {
      ratio = logo.width / logo.height;
      logoHeight = 4;
      logoWidth = logoHeight * ratio;
      if (logoWidth > 20) {
        logoWidth = 20;
        logoHeight = logoWidth / ratio;
      }
      byId("logo2").style.width = logoWidth + "em";
      byId("logo2").style.height = logoHeight + "em";
      byId("logo2").style.marginTop = (5.4 - logoHeight) / 2 + "em";
      src = logo2Src || "logo2.png?v=" + logo.version;
      if (byId("logo2").getAttribute("src") !== src) {
        byId("logo2").setAttribute("src", src);
      }
      setClass("topbar", logo.white === false ? "panel has-logo2 logo2-plain" : "panel has-logo2");
    } else {
      setClass("topbar", "panel");
    }

    needsFit = true;
    render();
  }

  // Everything is sized in em, so one base font size scales the 96em x 54em
  // screen to fit the TV.
  function fitToScreen() {
    var width = window.innerWidth || document.documentElement.clientWidth;
    var height = window.innerHeight || document.documentElement.clientHeight;
    var size = Math.floor(Math.min(width / 96, height / 54) * 10) / 10;
    document.body.style.fontSize = size + "px";
    byId("screen").style.marginTop = Math.max(0, Math.floor((height - size * 54) / 2)) + "px";
    fitTexts();
  }

  // For testing from the browser console:
  //   setPrayerDisplayTime("13:20") or setPrayerDisplayTime("2026-12-31 23:58")
  //   clearPrayerDisplayTime()
  window.setPrayerDisplayTime = function (value) {
    var match = /^(?:(\d{4})-(\d{2})-(\d{2}) )?(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(value);
    if (!match) {
      return;
    }
    var now = toBerlin(new Date().getTime());
    var targetMs = berlinToUtc(
      match[1] ? parseInt(match[1], 10) : now.getUTCFullYear(),
      match[1] ? parseInt(match[2], 10) - 1 : now.getUTCMonth(),
      match[1] ? parseInt(match[3], 10) : now.getUTCDate(),
      parseInt(match[4], 10),
      parseInt(match[5], 10),
      match[6] ? parseInt(match[6], 10) : 0
    );
    testOffsetMs = targetMs - new Date().getTime();
    render();
  };

  window.clearPrayerDisplayTime = function () {
    testOffsetMs = 0;
    render();
  };

  // Used by the live preview on admin.html.
  window.applyDisplaySettings = function (newSettings, backdropSrc, logo2Src) {
    previewing = true;
    applySettings(newSettings, backdropSrc, logo2Src);
  };
  window.refreshPrayerDisplay = render;
  window.setPreviewHadith = function (index) {
    pinnedHadith = typeof index === "number" ? index : null;
    render();
  };
  window.setDisplayLanguage = function (lang) {
    pinnedLanguage = LOCALES[lang] ? lang : null;
    render();
  };

  applySettings(window.DISPLAY_SETTINGS);
  fitToScreen();
  window.onresize = fitToScreen;
  tick();
  refreshWeather();
  setInterval(refreshWeather, WEATHER_EVERY_MS);
  setInterval(refreshData, DATA_EVERY_MS);
})();

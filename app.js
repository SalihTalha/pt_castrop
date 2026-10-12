// Prayer time screen for IGMG Castrop-Rauxel Merkez Camii.
// Plain ES5 (no modules, fetch, Intl, let/const or arrow functions) so it runs
// on old TV browsers. The times come from prayer-times.js (PRAYER_TIMES), the
// colours, texts and background from settings.js (DISPLAY_SETTINGS).
(function () {
  var WEATHER_URL =
    "https://api.open-meteo.com/v1/forecast?latitude=51.55&longitude=7.3167" +
    "&current=temperature_2m,weather_code&timezone=Europe%2FBerlin";
  var WEATHER_EVERY_MS = 30 * 60 * 1000;
  var DATA_EVERY_MS = 60 * 60 * 1000;
  var URGENT_MS = 5 * 60 * 1000;

  var PRAYERS = [
    { key: "imsak", label: "İmsak" },
    { key: "gunes", label: "Güneş" },
    { key: "ogle", label: "Öğle" },
    { key: "ikindi", label: "İkindi" },
    { key: "aksam", label: "Akşam" },
    { key: "yatsi", label: "Yatsı" }
  ];
  var MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
  var WEEKDAYS = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

  var shown = {};
  var testOffsetMs = 0;

  function byId(id) {
    return document.getElementById(id);
  }

  function setText(id, text) {
    if (shown[id] === text) {
      return;
    }
    shown[id] = text;
    var element = byId(id);
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
    element.appendChild(document.createTextNode(text));
  }

  function setClass(id, className) {
    if (shown["class:" + id] === className) {
      return;
    }
    shown["class:" + id] = className;
    byId(id).className = className;
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

  function formatDuration(ms) {
    var total = Math.max(0, Math.floor(ms / 1000));
    return pad(Math.floor(total / 3600)) + ":" + pad(Math.floor(total / 60) % 60) + ":" + pad(total % 60);
  }

  function render() {
    // Whole seconds, so the countdown matches the clock shown next to it.
    var nowMs = Math.floor((new Date().getTime() + testOffsetMs) / 1000) * 1000;
    var now = toBerlin(nowMs);
    var year = now.getUTCFullYear();
    var month = now.getUTCMonth();
    var date = now.getUTCDate();
    var today = getDay(year, month, date);
    var nextIndex = -1;
    var currentIndex = -1;
    var targetMs = 0;
    var prayerMs, tomorrow, isUrgent, className, i;

    setText("clock", pad(now.getUTCHours()) + ":" + pad(now.getUTCMinutes()) + ":" + pad(now.getUTCSeconds()));
    setText("date", pad(date) + " " + MONTHS[month] + " " + year + " " + WEEKDAYS[now.getUTCDay()]);
    setText("hijri", (today && today.hicri) || "");

    for (i = 0; i < PRAYERS.length; i++) {
      setText("time-" + PRAYERS[i].key, today ? today[PRAYERS[i].key] : "--:--");

      if (today) {
        prayerMs = prayerToUtc(year, month, date, today[PRAYERS[i].key]);
        if (prayerMs <= nowMs) {
          currentIndex = i;
        } else if (nextIndex === -1) {
          nextIndex = i;
          targetMs = prayerMs;
        }
      }
    }

    if (!today) {
      setText("countdown-label", "Bugün için vakit bilgisi yok");
      setText("countdown", "--:--:--");
      for (i = 0; i < PRAYERS.length; i++) {
        setClass("prayer-" + PRAYERS[i].key, "panel prayer");
      }
      return;
    }

    if (nextIndex === -1) {
      // After Yatsı, count down to tomorrow's İmsak.
      tomorrow = getDay(year, month, date + 1) || today;
      nextIndex = 0;
      targetMs = prayerToUtc(year, month, date + 1, tomorrow.imsak);
    }

    if (currentIndex === -1) {
      // Before İmsak it is still Yatsı time.
      currentIndex = PRAYERS.length - 1;
    }

    // In the last five minutes the next prayer's card blinks once a second.
    isUrgent = targetMs - nowMs <= URGENT_MS && Math.floor(nowMs / 1000) % 2 === 0;

    for (i = 0; i < PRAYERS.length; i++) {
      className = "panel prayer";
      if (i === nextIndex) {
        className += isUrgent ? " is-next is-urgent" : " is-next";
      }
      if (i === currentIndex) {
        className += " is-current";
      }
      setClass("prayer-" + PRAYERS[i].key, className);
    }

    setText("countdown-label", PRAYERS[nextIndex].label + " Vaktine Kalan Süre");
    setText("countdown", formatDuration(targetMs - nowMs));
  }

  function tick() {
    render();
    // Wake just after the next full second so the clock never skips a second.
    setTimeout(tick, 1020 - (new Date().getTime() % 1000));
  }

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
    setText("weather-temp", current ? current.temperature_2m.toFixed(1).replace(".", ",") + " °C" : "--,- °C");
    setText("weather-label", current ? weatherLabel(current.weather_code) : "Bilgi yok");
  }

  function weatherLabel(code) {
    if (code <= 1) {
      return "Açık";
    }
    if (code <= 3) {
      return "Parçalı bulutlu";
    }
    if (code === 45 || code === 48) {
      return "Sisli";
    }
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
      return "Yağmurlu";
    }
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
      return "Karlı";
    }
    if (code >= 95) {
      return "Fırtınalı";
    }
    return "Değişken";
  }

  // Load settings.js and prayer-times.js again every hour, so changes saved on
  // admin.html reach the TV without a page reload. If loading fails, the
  // current data stays.
  function refreshData() {
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
  function applySettings(settings, backdropSrc) {
    var s = settings || {};
    var image = s.backgroundImage || {};
    var white = [255, 255, 255];
    var bg = hexToRgb(s.backgroundColor);
    var panel = hexToRgb(s.panelColor);
    var next = hexToRgb(s.nextColor);
    var text = hexToRgb(s.textColor);
    var highlight = hexToRgb(s.highlightColor);
    var alpha = typeof s.panelOpacity === "number" ? s.panelOpacity : 0.7;
    var backdrop = byId("backdrop");
    var src;

    if (bg && panel && next && text && highlight) {
      setCss(
        "html,body{background:" + hex(bg) + ";}" +
        "body{color:" + hex(text) + ";}" +
        ".panel{" + background(panel, alpha) + "border-color:" + hex(mix(panel, white, 0.65)) + ";}" +
        ".label,#location,#weather-label{color:" + hex(mix(text, panel, 0.25)) + ";}" +
        "#title-sub,#hijri,#countdown,.prayer.is-next .prayer-time{color:" + hex(highlight) + ";}" +
        ".prayer.is-next{" + background(next, alpha + 0.12) + "border-color:" + hex(highlight) + ";}" +
        ".prayer.is-urgent{" + background(mix(next, white, 0.15), alpha + 0.2) + "border-color:#ffffff;}" +
        ".prayer.is-urgent .prayer-name,.prayer.is-urgent .prayer-time{color:" + hex(mix(highlight, white, 0.5)) + ";}" +
        ".prayer.is-current{" + background(mix(panel, white, 0.72), alpha + 0.22) + "color:#111f22;}" +
        "#countdown-panel{" + background(mix(panel, next, 0.5), alpha + 0.05) + "}"
      );
    }

    if (s.mosqueName) {
      setText("mosque-name", s.mosqueName);
      document.title = s.mosqueName + " Namaz Vakitleri";
    }
    if (s.location) {
      setText("location", s.location);
    }

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
  }

  // Everything is sized in em, so one base font size scales the 96em x 54em
  // screen to fit the TV.
  function fitToScreen() {
    var width = window.innerWidth || document.documentElement.clientWidth;
    var height = window.innerHeight || document.documentElement.clientHeight;
    var size = Math.floor(Math.min(width / 96, height / 54) * 10) / 10;
    document.body.style.fontSize = size + "px";
    byId("screen").style.marginTop = Math.max(0, Math.floor((height - size * 54) / 2)) + "px";
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
  window.applyDisplaySettings = applySettings;
  window.refreshPrayerDisplay = render;

  applySettings(window.DISPLAY_SETTINGS);
  fitToScreen();
  window.onresize = fitToScreen;
  tick();
  refreshWeather();
  setInterval(refreshWeather, WEATHER_EVERY_MS);
  setInterval(refreshData, DATA_EVERY_MS);
})();

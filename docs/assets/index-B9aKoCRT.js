(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))r(a);new MutationObserver(a=>{for(const n of a)if(n.type==="childList")for(const s of n.addedNodes)s.tagName==="LINK"&&s.rel==="modulepreload"&&r(s)}).observe(document,{childList:!0,subtree:!0});function i(a){const n={};return a.integrity&&(n.integrity=a.integrity),a.referrerPolicy&&(n.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?n.credentials="include":a.crossOrigin==="anonymous"?n.credentials="omit":n.credentials="same-origin",n}function r(a){if(a.ep)return;a.ep=!0;const n=i(a);fetch(a.href,n)}})();const l={mosqueName:"Yavuz Sultan Selim Camii",subtitle:"Namaz Vakitleri",city:"Heidelberg",country:"Almanya",timezone:"Europe/Berlin",coordinates:{latitude:49.4094,longitude:8.6947}},y={prayerTimesMs:1e3*60*60*6,weatherMs:1e3*60*30,tickMs:1e3},$="[data-fit]";let T=0;function C(t=document){window.cancelAnimationFrame(T),T=window.requestAnimationFrame(()=>F(t))}function F(t=document){const e=Array.from(t.querySelectorAll($));for(const r of e)P(r);const i=Array.from(t.querySelectorAll("[data-fit-boundary]"));for(const r of i)K(r)}function P(t){const e=window.getComputedStyle(t),i=Number(t.dataset.fitMax)||parseFloat(e.fontSize),r=Number(t.dataset.fitMin)||10,a=t.dataset.fitWrap==="true";if(!Number.isFinite(i)||t.clientWidth<=0||t.clientHeight<=0)return;t.style.fontSize=`${i}px`,t.style.whiteSpace=a?"normal":"nowrap",t.style.overflowWrap=a?"anywhere":"normal",t.style.wordBreak=a?"break-word":"normal";let n=r,s=i,c=r;for(let o=0;o<14;o+=1){const u=(n+s)/2;t.style.fontSize=`${u}px`,z(t)?(c=u,n=u):s=u}t.style.fontSize=`${Math.floor(c*100)/100}px`}function z(t){const e=t.scrollWidth<=t.clientWidth+1,i=t.scrollHeight<=t.clientHeight+12,r=t.closest("[data-fit-boundary]");if(!r)return e&&i;const a=t.getBoundingClientRect(),n=r.getBoundingClientRect(),s=a.left>=n.left-1&&a.right<=n.right+1&&a.top>=n.top-1&&a.bottom<=n.bottom+1;return e&&i&&s}function K(t){const e=Array.from(t.querySelectorAll($));for(let i=0;i<10&&E(t);i+=1){let r=!1;for(const a of e){const n=parseFloat(window.getComputedStyle(a).fontSize),s=Number(a.dataset.fitMin)||10,c=Math.max(s,n*.92);c<n&&(a.style.fontSize=`${Math.floor(c*100)/100}px`,r=!0)}if(!r)break}}function E(t){return t.scrollWidth>t.clientWidth+1||t.scrollHeight>t.clientHeight+12}const N="heidelberg-prayer-times-v1",Y="/prayer_time/prayer-times.json";async function R(){try{const t=await fetch(Y,{cache:"no-cache"});if(!t.ok)throw new Error(`Local prayer-times file returned ${t.status}`);const e=await t.json(),i=e.days;return L(i),g(i,H(e),new Date(e.generatedAt))}catch{const e=O();return e?g(e.days,"Yerel dosya okunamadı, kayıtlı Diyanet verisi gösteriliyor.",new Date(e.fetchedAt)):g(B,"Yerel Diyanet verisi okunamadı, örnek Heidelberg vakitleri gösteriliyor.",null)}}function H(t){const e=new Intl.DateTimeFormat("de-DE",{timeZone:l.timezone,year:"numeric"}).format(new Date);return t.includedYears.includes(Number(e))?null:`Yerel Diyanet dosyasında ${t.includedYears.join(", ")} verisi var.`}function L(t){localStorage.setItem(N,JSON.stringify({fetchedAt:new Date().toISOString(),days:t}))}function O(){const t=localStorage.getItem(N);if(!t)return null;try{const e=JSON.parse(t);return Array.isArray(e.days)?e:null}catch{return null}}function g(t,e,i){const r=new Date,a=k(r),n=k(W(r,1)),s=t.find(o=>o.MiladiTarihKisa===a)??t[0]??null,c=t.find(o=>o.MiladiTarihKisa===n)??t[t.findIndex(o=>o.MiladiTarihKisa===(s==null?void 0:s.MiladiTarihKisa))+1]??null;return{today:s,tomorrow:c,allDays:t,error:e,fetchedAt:i}}function k(t){return new Intl.DateTimeFormat("de-DE",{timeZone:l.timezone,day:"2-digit",month:"2-digit",year:"numeric"}).format(t)}function W(t,e){const i=new Date(t);return i.setDate(i.getDate()+e),i}const B=[{HicriTarihKisa:"22.12.1447",HicriTarihKisaIso8601:null,HicriTarihUzun:"22 Zilhicce 1447",HicriTarihUzunIso8601:null,AyinSekliURL:"https://namazvakti.diyanet.gov.tr/images/sondordun.gif",MiladiTarihKisa:"08.06.2026",MiladiTarihKisaIso8601:"08.06.2026",MiladiTarihUzun:"08 Haziran 2026 Pazartesi",MiladiTarihUzunIso8601:"2026-06-08T00:00:00.0000000+02:00",GreenwichOrtalamaZamani:3,Aksam:"21:35",Gunes:"05:13",GunesBatis:"21:28",GunesDogus:"05:20",Ikindi:"17:46",Imsak:"03:42",KibleSaati:"11:24",Ogle:"13:29",Yatsi:"22:56"}],h=new URL("https://api.open-meteo.com/v1/forecast");h.searchParams.set("latitude",String(l.coordinates.latitude));h.searchParams.set("longitude",String(l.coordinates.longitude));h.searchParams.set("current","temperature_2m,weather_code");h.searchParams.set("timezone",l.timezone);async function U(){var t,e;try{const i=await fetch(h,{cache:"no-store"});if(!i.ok)throw new Error(`Weather API returned ${i.status}`);const r=await i.json(),a=((t=r.current)==null?void 0:t.weather_code)??null;return{temperature:((e=r.current)==null?void 0:e.temperature_2m)??null,code:a,label:q(a),fetchedAt:new Date}}catch{return{temperature:null,code:null,label:"Bilgi yok",fetchedAt:null}}}function q(t){return t===null?"Bilgi yok":[0,1].includes(t)?"Açık":[2,3].includes(t)?"Parçalı bulutlu":[45,48].includes(t)?"Sisli":[51,53,55,56,57,61,63,65,66,67,80,81,82].includes(t)?"Yağmurlu":[71,73,75,77,85,86].includes(t)?"Karlı":[95,96,99].includes(t)?"Fırtınalı":"Değişken"}const b={Imsak:"İmsak",Gunes:"Güneş",Ogle:"Öğle",Ikindi:"İkindi",Aksam:"Akşam",Yatsi:"Yatsı"},_=["Imsak","Gunes","Ogle","Ikindi","Aksam","Yatsi"];function Z(t,e,i,r=!1){return _.map(a=>({key:a,label:b[a],time:t[a],isNext:a===e,isCurrent:a===i,isUrgent:r&&a===e}))}function j(t){return{time:new Intl.DateTimeFormat("tr-TR",{timeZone:l.timezone,hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:!1}).format(t),date:new Intl.DateTimeFormat("tr-TR",{timeZone:l.timezone,day:"2-digit",month:"long",year:"numeric",weekday:"long"}).format(t)}}function G(t,e,i){if(!e)return{nextKey:null,currentKey:null,label:"Vakit bekleniyor",remaining:"--:--:--",remainingMs:null,isFinalFiveMinutes:!1};const r=_.map(o=>({key:o,date:w(t,e[o])})),a=r.find(o=>o.date.getTime()>t.getTime()),n=[...r].reverse().find(o=>o.date.getTime()<=t.getTime());if(a){const o=a.date.getTime()-t.getTime();return{nextKey:a.key,currentKey:(n==null?void 0:n.key)??null,label:`${b[a.key]} Vaktine Kalan Süre`,remaining:M(o),remainingMs:o,isFinalFiveMinutes:o<=300*1e3}}const c=(i?w(D(t,1),i.Imsak):w(D(t,1),e.Imsak)).getTime()-t.getTime();return{nextKey:"Imsak",currentKey:(n==null?void 0:n.key)??"Yatsi",label:`${b.Imsak} Vaktine Kalan Süre`,remaining:M(c),remainingMs:c,isFinalFiveMinutes:c<=300*1e3}}function V(t){return t?new Intl.DateTimeFormat("tr-TR",{timeZone:l.timezone,hour:"2-digit",minute:"2-digit",hour12:!1}).format(t):"--:--"}function w(t,e){var o,u,v;const[i,r]=e.split(":").map(Number),a=new Intl.DateTimeFormat("en-CA",{timeZone:l.timezone,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(t),n=Number((o=a.find(m=>m.type==="year"))==null?void 0:o.value),s=Number((u=a.find(m=>m.type==="month"))==null?void 0:u.value),c=Number((v=a.find(m=>m.type==="day"))==null?void 0:v.value);return new Date(n,s-1,c,i,r,0,0)}function M(t){const e=Math.max(0,Math.floor(t/1e3)),i=Math.floor(e/3600),r=Math.floor(e%3600/60),a=e%60;return[i,r,a].map(n=>String(n).padStart(2,"0")).join(":")}function D(t,e){const i=new Date(t);return i.setDate(i.getDate()+e),i}const x=document.querySelector("#app");if(!x)throw new Error("App root was not found");const S=x,J="/prayer_time/logo.png";let d={today:null,tomorrow:null,error:null,fetchedAt:null},p={temperature:null,code:null,label:"Yükleniyor"};async function Q(){X(),f(),await Promise.all([I(),A()]),f(),window.setInterval(()=>f(),y.tickMs),window.setInterval(I,y.prayerTimesMs),window.setInterval(A,y.weatherMs)}async function I(){d=await R(),f()}async function A(){p=await U(),f()}function f(){var a,n,s;const t=tt(),e=j(t),i=G(t,d.today,d.tomorrow),r=d.today?Z(d.today,i.nextKey,i.currentKey,i.isFinalFiveMinutes):[];S.innerHTML=`
    <main class="screen" aria-label="${l.mosqueName} namaz vakitleri">
      <div class="ambient ambient-one"></div>
      <div class="ambient ambient-two"></div>
      <section class="topbar">
        <div class="brand-lockup" data-fit-boundary aria-label="${l.mosqueName}">
          <div class="brand-mark">
            <img class="brand-logo" src="${J}" alt="" />
          </div>
          <div class="brand-copy">
            <p class="location" data-fit data-fit-min="12">${l.city}, ${l.country}</p>
            <h1 data-fit data-fit-min="18">${l.mosqueName}</h1>
          </div>
        </div>
        <div class="title-panel" data-fit-boundary>
          <p data-fit data-fit-min="18">${l.subtitle}</p>
          <strong data-fit data-fit-min="18">Diyanet</strong>
        </div>
      </section>

      <section class="content-grid">
        <div class="prayer-grid">
          ${at(r)}
        </div>

        <aside class="info-stack">
          <section class="clock-panel" data-fit-boundary aria-label="Saat ve tarih">
            <p class="eyebrow" data-fit data-fit-min="12">Saat</p>
            <div class="live-clock" data-fit data-fit-min="24">${e.time}</div>
            <div class="date-line" data-fit data-fit-min="14">${((a=d.today)==null?void 0:a.MiladiTarihUzun)??e.date}</div>
            <div class="hijri-line" data-fit data-fit-min="12">${((n=d.today)==null?void 0:n.HicriTarihUzun)??""}</div>
          </section>

          <section class="detail-panel" aria-label="Hava durumu ve kible">
            <div class="weather-block" data-fit-boundary>
              <p class="eyebrow" data-fit data-fit-min="12">Hava Durumu</p>
              <div class="weather-main">
                ${it(p.code)}
                <div>
                  <strong data-fit data-fit-min="18">${rt(p.temperature)}</strong>
                  <span data-fit data-fit-min="11">${p.label}</span>
                </div>
              </div>
            </div>
            <div class="qibla-block" data-fit-boundary>
              <p class="eyebrow" data-fit data-fit-min="12">Kıble Saati</p>
              <strong data-fit data-fit-min="18">${((s=d.today)==null?void 0:s.KibleSaati)||"--:--"}</strong>
              <span data-fit data-fit-min="11">Son veri ${V(d.fetchedAt)}</span>
            </div>
          </section>
        </aside>
      </section>

      <section class="countdown-panel" data-fit-boundary aria-live="polite">
        <span data-fit data-fit-min="18">${i.label}</span>
        <strong data-fit data-fit-min="20">${i.remaining}</strong>
      </section>

      ${d.error?`<div class="status-line">${d.error}</div>`:""}
    </main>
  `,C(S)}function X(){window.setPrayerDisplayTime=t=>{window.__PRAYER_DISPLAY_TEST_TIME__=t,f()},window.clearPrayerDisplayTime=()=>{window.__PRAYER_DISPLAY_TEST_TIME__=null,f()}}function tt(){const t=window.__PRAYER_DISPLAY_TEST_TIME__;return t==null||t===""?new Date:et(t)??new Date}function et(t){if(t instanceof Date)return Number.isNaN(t.getTime())?null:new Date(t);if(typeof t=="number"){const a=new Date(t);return Number.isNaN(a.getTime())?null:a}const e=t.trim(),i=e.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);if(i){const a=new Date;return a.setHours(Number(i[1]),Number(i[2]),Number(i[3]??"0"),0),a}const r=new Date(e);return Number.isNaN(r.getTime())?null:r}function at(t){return t.length?t.map(e=>`
        <article class="prayer-card ${e.isNext?"is-next":""} ${e.isCurrent?"is-current":""} ${e.isUrgent?"is-urgent":""}" data-fit-boundary>
          <span data-fit data-fit-min="16">${e.label}</span>
          <strong data-fit data-fit-min="28">${e.time}</strong>
        </article>
      `).join(""):Array.from({length:6}).map(()=>`
          <article class="prayer-card skeleton">
            <span data-fit data-fit-min="14">Yükleniyor</span>
            <strong data-fit data-fit-min="20">--:--</strong>
          </article>
        `).join("")}function it(t){const e=nt(t);return e==="weather-sun"?`
      <svg class="weather-icon" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
        <circle cx="32" cy="32" r="14" fill="#f3d46a" />
        <g stroke="#f3d46a" stroke-width="5" stroke-linecap="round">
          <path d="M32 7v7" />
          <path d="M32 50v7" />
          <path d="M7 32h7" />
          <path d="M50 32h7" />
          <path d="M14 14l5 5" />
          <path d="M45 45l5 5" />
          <path d="M50 14l-5 5" />
          <path d="M19 45l-5 5" />
        </g>
      </svg>
    `:e==="weather-rain"?`
      <svg class="weather-icon" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
        <path d="M20 45h29c7 0 12-5 12-11s-5-11-12-11h-1C46 14 38 8 29 10c-8 1-14 8-14 16h-1C8 26 3 31 3 37s5 8 17 8Z" fill="#d7f0ef" />
        <g stroke="#8fd7ff" stroke-width="5" stroke-linecap="round">
          <path d="M22 51v8" />
          <path d="M34 51v8" />
          <path d="M46 51v8" />
        </g>
      </svg>
    `:e==="weather-snow"?`
      <svg class="weather-icon" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
        <path d="M20 45h29c7 0 12-5 12-11s-5-11-12-11h-1C46 14 38 8 29 10c-8 1-14 8-14 16h-1C8 26 3 31 3 37s5 8 17 8Z" fill="#d7f0ef" />
        <g fill="#ffffff">
          <circle cx="23" cy="56" r="3" />
          <circle cx="35" cy="56" r="3" />
          <circle cx="47" cy="56" r="3" />
        </g>
      </svg>
    `:`
    <svg class="weather-icon" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <path d="M20 45h29c7 0 12-5 12-11s-5-11-12-11h-1C46 14 38 8 29 10c-8 1-14 8-14 16h-1C8 26 3 31 3 37s5 8 17 8Z" fill="#d7f0ef" />
    </svg>
  `}function nt(t){return t===null?"weather-unknown":[0,1].includes(t)?"weather-sun":[51,53,55,56,57,61,63,65,66,67,80,81,82].includes(t)?"weather-rain":[71,73,75,77,85,86].includes(t)?"weather-snow":"weather-cloud"}function rt(t){return t===null?"--.- °C":`${t.toFixed(1).replace(".",",")} °C`}Q();

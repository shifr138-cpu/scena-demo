/* Сцена за сценой — логика сайта.
   Данные: Supabase (если в assets/config.js указаны URL и ключ) или демо-режим в браузере.
   Всё, что пришло от пользователя или из базы, выводится через esc()/textContent. */
(function () {
  'use strict';
  var CFG = window.SCENA_CONFIG || {};
  var C = window.SCENA || { acts: [], lessons: [], tiers: {}, achievements: [], loglines: [] };
  var ACTS = C.acts, LESSONS = C.lessons, TIERS = C.tiers, ACH = C.achievements;
  var byId = {}; LESSONS.forEach(function (l, i) { l.idx = i; byId[l.id] = l; });
  var PAGE = document.body.getAttribute('data-page') || '';
  var RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var qs = new URLSearchParams(location.search);

  // ---------- мелочи ----------
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return [].slice.call((c || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var nb = function (s) { return String(s).replace(/(^|[\s(«])([а-яёА-ЯЁa-zA-Z]{1,2}) /g, '$1$2 ').replace(/ ([—–])/g, ' $1'); };
  var T = function (s) { return nb(esc(s)); };
  var rub = function (n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ₽'; };
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var go = function (url) { location.href = url; };
  var icon = function (id, cls) { return '<svg class="ic' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#i-' + id + '"/></svg>'; };
  var plural = function (n, a, b, c) { var m10 = n % 10, m100 = n % 100; return m10 === 1 && m100 !== 11 ? a : (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? b : c); };
  var loaded = {};
  function loadScript(src) {
    if (loaded[src]) return loaded[src];
    loaded[src] = new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = src; s.onload = res;
      s.onerror = function () { delete loaded[src]; rej(new Error('Не удалось загрузить ' + src)); };
      document.head.appendChild(s);
    });
    return loaded[src];
  }
  var EMAIL = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

  // куда возвращаться после входа: только свои страницы, без внешних адресов
  function safeNext() {
    var n = qs.get('next');
    if (n === 'kassa') return 'kassa.html?t=' + (TIERS[qs.get('t')] ? qs.get('t') : 'guide');
    if (n === 'urok' && byId[qs.get('id')]) return 'urok.html?id=' + qs.get('id');
    return 'kabinet.html';
  }

  // ---------- всплывашки ----------
  var toastEl, toastQ = [], toastBusy = false;
  function toast(title, text, art) {
    toastQ.push([title, text, art]); if (!toastBusy) nextToast();
  }
  function nextToast() {
    var t = toastQ.shift(); if (!t) { toastBusy = false; return; }
    toastBusy = true;
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
    toastEl.innerHTML = (t[2] || ART.star) + '<div><b>' + T(t[0]) + '</b>' + (t[1] ? '<span>' + T(t[1]) + '</span>' : '') + '</div>';
    requestAnimationFrame(function () { toastEl.classList.add('on'); });
    setTimeout(function () { toastEl.classList.remove('on'); setTimeout(nextToast, 450); }, 3200);
  }

  // ---------- рисунки наград (вырезанная бумага) ----------
  var ART = {
    sheet: '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="30" fill="#3d3159"/><g transform="rotate(-7 32 32)"><rect x="19" y="13" width="26" height="36" rx="2" fill="#f3ecda"/><path d="M24 23h16M24 29h16M24 35h10" stroke="#9d97a5" stroke-width="2.5" stroke-linecap="round"/></g><circle cx="31" cy="14" r="3.6" fill="#ec8a74"/></svg>',
    quill: '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="30" fill="#4f5226"/><path d="M45 12C30 14 21 27 20 44l4 1c2-15 9-25 21-33Z" fill="#d6ccf3"/><path d="M20 44 16 52" stroke="#f3ecda" stroke-width="3" stroke-linecap="round"/><path d="M41 17C33 22 27 31 24 42" stroke="#5a4a82" stroke-width="2" fill="none"/></svg>',
    mask: '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="30" fill="#5a4a82"/><path d="M16 20c10-5 22-5 32 0 0 14-6 26-16 26S16 34 16 20Z" fill="#f3ecda"/><path d="M22 26c2-2 6-2 8 0M34 26c2-2 6-2 8 0" stroke="#1a1420" stroke-width="3" stroke-linecap="round" fill="none"/><path d="M26 36c4 3 8 3 12 0" stroke="#ec8a74" stroke-width="3" stroke-linecap="round" fill="none"/></svg>',
    cards: '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="30" fill="#4f5226"/><rect x="12" y="18" width="18" height="26" rx="2" fill="#b6a8dd" transform="rotate(-12 21 31)"/><rect x="23" y="16" width="18" height="26" rx="2" fill="#f3ecda"/><rect x="34" y="18" width="18" height="26" rx="2" fill="#ec8a74" transform="rotate(12 43 31)"/></svg>',
    door: '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="30" fill="#3d3159"/><path d="M21 52V24a11 11 0 0 1 22 0v28Z" fill="#7c7f3c"/><path d="M25 52V25a7 7 0 0 1 14 0v27" fill="#4f5226"/><circle cx="35" cy="38" r="2.4" fill="#d7db62"/><path d="M14 52h36" stroke="#f3ecda" stroke-width="3" stroke-linecap="round"/></svg>',
    star: '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="30" fill="#4f5226"/><path d="m32 13 5.6 12 13 1.4-9.7 8.8 2.7 12.8L32 41.4 20.4 48l2.7-12.8-9.7-8.8 13-1.4Z" fill="#d7db62"/></svg>',
    curtain: '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="30" fill="#2a2140"/><path d="M14 17h17v32c-6-2-12-10-17-12Z" fill="#b6a8dd"/><path d="M50 17H33v32c6-2 12-10 17-12Z" fill="#b6a8dd"/><path d="M12 15h40v6H12z" fill="#ec8a74"/><circle cx="32" cy="40" r="5" fill="#f2c27d"/></svg>'
  };

  // ---------- данные: демо-режим ----------
  function demoAPI() {
    var KEY = 'scena-demo-v2', S = { user: null, enr: null, prog: {} };
    try { var raw = localStorage.getItem(KEY); if (raw) S = Object.assign(S, JSON.parse(raw)); } catch (e) {}
    var save = function () { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
    return {
      mode: 'demo',
      init: function () { return Promise.resolve(S.user); },
      user: function () { return S.user; },
      signIn: function (p) { return wait(500).then(function () { S.user = { id: 'demo', email: p.email, name: p.name }; save(); return { mode: 'demo' }; }); },
      signOut: function () { S.user = null; save(); return Promise.resolve(); },
      enrollment: function () { return Promise.resolve(S.user && S.enr ? S.enr : null); },
      buy: function (t) { return wait(1300).then(function () { S.enr = { tariff: t, status: 'paid' }; save(); }); },
      progress: function () { return Promise.resolve(S.user ? (S.prog || {}) : {}); },
      saveProgress: function (id, patch) { S.prog[id] = Object.assign({}, S.prog[id], patch); save(); return Promise.resolve(); },
      lesson: function (id) {
        var L = byId[id]; if (!L) return Promise.resolve(null);
        if (!L.free && !(S.user && S.enr)) return Promise.resolve(null);
        return loadScript('demo-content.js').then(function () { return (window.SCENA_CONTENT || {})[id] || null; });
      },
      ask: function (q) { return wait(600).then(function () { (S.asked = S.asked || []).push(Object.assign({ at: Date.now() }, q)); save(); }); },
      reset: function () { try { localStorage.removeItem(KEY); } catch (e) {} }
    };
  }

  // ---------- данные: Supabase ----------
  function supaAPI() {
    var sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    var U = null;
    var chk = function (r) { if (r.error) throw r.error; return r.data; };
    return {
      mode: 'supabase',
      init: function () {
        return sb.auth.getSession().then(function (r) {
          var s = r.data && r.data.session; if (!s) return null;
          U = { id: s.user.id, email: s.user.email, name: (s.user.user_metadata && s.user.user_metadata.name) || '' };
          return sb.from('profiles').select('name').eq('id', U.id).maybeSingle().then(function (p) { if (p.data && p.data.name) U.name = p.data.name; return U; });
        });
      },
      user: function () { return U; },
      signIn: function (p) {
        return sb.auth.signInWithOtp({ email: p.email, options: { emailRedirectTo: new URL(p.next, location.href).href, data: { name: p.name } } })
          .then(function (r) { if (r.error) throw r.error; return { mode: 'link' }; });
      },
      signOut: function () { return sb.auth.signOut().then(function () { U = null; }); },
      enrollment: function () {
        if (!U) return Promise.resolve(null);
        return sb.from('enrollments').select('tariff,status').eq('user_id', U.id).maybeSingle().then(chk).then(function (d) { return d && d.status === 'paid' ? d : null; });
      },
      // заглушка оплаты: вызывает demo_purchase в базе (работает, пока в app_settings включены тестовые оплаты)
      buy: function (t) { return Promise.all([sb.rpc('demo_purchase', { p_tariff: t }).then(chk), wait(900)]); },
      progress: function () {
        if (!U) return Promise.resolve({});
        return sb.from('progress').select('lesson_id,done,quiz_ok,note').eq('user_id', U.id).then(chk).then(function (rows) {
          var m = {}; (rows || []).forEach(function (r) { m[r.lesson_id] = r; }); return m;
        });
      },
      saveProgress: function (id, patch) {
        var row = Object.assign({ user_id: U.id, lesson_id: id, updated_at: new Date().toISOString() }, patch);
        return sb.from('progress').upsert(row, { onConflict: 'user_id,lesson_id' }).then(chk);
      },
      lesson: function (id) { return sb.from('lesson_content').select('body').eq('lesson_id', id).maybeSingle().then(chk).then(function (d) { return d ? d.body : null; }); },
      ask: function (q) { return sb.from('questions').insert(q).then(chk); }
    };
  }

  var api;
  function makeAPI() {
    if (CFG.supabaseUrl && CFG.supabaseAnonKey) {
      return loadScript('supabase.min.js').then(function () { return supaAPI(); }, function () { return demoAPI(); });
    }
    return Promise.resolve(demoAPI());
  }

  // прогресс и награды
  function isDone(p, id) { return !!(p[id] && p[id].done); }
  function earned(p) {
    var set = {};
    ACH.forEach(function (a) {
      var r = a.rule.split(':'), ok = false;
      if (r[0] === 'lesson') ok = isDone(p, r[1]);
      else if (r[0] === 'act') ok = LESSONS.filter(function (l) { return l.act === +r[1]; }).every(function (l) { return isDone(p, l.id); });
      else if (r[0] === 'quiz') ok = LESSONS.filter(function (l) { return p[l.id] && p[l.id].quiz_ok; }).length >= +r[1];
      else if (r[0] === 'all') ok = LESSONS.every(function (l) { return isDone(p, l.id); });
      if (ok) set[a.id] = true;
    });
    return set;
  }
  function announceNew(before, after) {
    ACH.forEach(function (a) { if (after[a.id] && !before[a.id]) toast('Награда: ' + a.t, a.d, ART[a.icon]); });
  }
  function ringHTML(size, done, total) {
    var r = size === 'sm' ? 22 : 36, w = size === 'sm' ? 52 : 84, c = 2 * Math.PI * r;
    return '<svg class="ring" viewBox="0 0 ' + w + ' ' + w + '" aria-hidden="true"><circle cx="' + w / 2 + '" cy="' + w / 2 + '" r="' + r + '" stroke="rgba(237,231,211,.12)"/>' +
      '<circle class="bar" cx="' + w / 2 + '" cy="' + w / 2 + '" r="' + r + '" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + (c * (1 - done / total)).toFixed(1) + '" transform="rotate(-90 ' + w / 2 + ' ' + w / 2 + ')"/></svg>';
  }

  // ---------- шапка и общее ----------
  function renderAuth() {
    var u = api.user(), box = $('#auth'), mbox = $('#mauth');
    if (!box) return;
    if (u) {
      var ini = esc((u.name || u.email || '?').trim().charAt(0).toUpperCase());
      box.innerHTML = '<a class="btn sm v2" href="kabinet.html"><span class="ava">' + ini + '</span>Кабинет</a>';
      if (mbox) mbox.innerHTML = '<a class="btn v2" href="kabinet.html">Мой кабинет</a>';
    }
  }
  function demoBar() {
    if (api.mode !== 'demo') return;
    var bar = document.createElement('div'); bar.className = 'demo';
    bar.innerHTML = '<span>Демо: данные хранятся в этом браузере</span> <button type="button">Сбросить</button>';
    $('button', bar).onclick = function () { api.reset(); try { sessionStorage.removeItem('scena-intro'); } catch (e) {} go('index.html'); };
    document.body.insertBefore(bar, document.body.firstChild);
  }
  function setupCommon() {
    // мобильное меню: закрывать по клику мимо и по Esc
    var mnav = $('.mnav');
    if (mnav) {
      document.addEventListener('click', function (e) { if (mnav.open && !mnav.contains(e.target)) mnav.open = false; });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') mnav.open = false; });
    }
    // прожектор на сцене идёт за курсором
    $$('.spot').forEach(function (spot) {
      var stage = spot.parentNode, raf = 0;
      stage.addEventListener('pointermove', function (e) {
        if (e.pointerType === 'touch') return;
        var r = stage.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * 100, y = (e.clientY - r.top) / r.height * 100;
        if (raf) return; raf = requestAnimationFrame(function () { raf = 0; spot.classList.add('follow'); spot.style.setProperty('--sx', x + '%'); spot.style.setProperty('--sy', y + '%'); });
      });
      stage.addEventListener('pointerleave', function () { spot.classList.remove('follow'); spot.style.removeProperty('--sx'); spot.style.removeProperty('--sy'); });
    });
  }

  // ---------- главная ----------
  function typewriter() {
    var lines = $$('#sheet .sl'); if (RM || !lines.length) return;
    var full = lines.map(function (l) { return l.textContent; }); lines.forEach(function (l) { l.textContent = ''; });
    var caret = document.createElement('span'); caret.className = 'caret';
    var li = 0, ci = 0, delay = document.documentElement.classList.contains('intro') ? 1600 : 400;
    setTimeout(function step() {
      if (li >= lines.length) { lines[lines.length - 1].appendChild(caret); return; }
      var el = lines[li]; ci++; el.textContent = full[li].slice(0, ci); el.appendChild(caret);
      if (ci >= full[li].length) { li++; ci = 0; setTimeout(step, 380); } else setTimeout(step, full[li].charAt(ci) === ' ' ? 20 : 32);
    }, delay);
  }
  function loglineGame() {
    var ids = ['lg-hero', 'lg-goal', 'lg-obst', 'lg-stake'], out = $('#lg-out'); if (!out) return;
    var inputs = ids.map(function (id) { return $('#' + id); });
    var EX = C.loglines || [];
    function render(rolling) {
      var v = inputs.map(function (i) { return i.value.trim(); });
      var seg = function (s, k) { return '<b' + (rolling ? ' class="roll"' : '') + '>' + T(s || '…') + '</b>'; };
      var hero = v[0] ? v[0].charAt(0).toUpperCase() + v[0].slice(1) : '';
      out.innerHTML = seg(hero, 0) + ' хочет ' + seg(v[1], 1) + ', но ' + seg(v[2], 2) + '. Если не выйдет, ' + seg(v[3], 3) + '.';
      var filled = v.filter(Boolean).length, words = (v.join(' ').match(/\S+/g) || []).length + 6;
      var score = filled * 25 - (words > 35 ? 25 : 0);
      $('#lg-meter').style.setProperty('--w', Math.max(0, score) + '%');
      $('#lg-score').textContent = filled < 4 ? 'заполните все четыре поля' : (words > 35 ? 'длинновато: больше 35 слов' : 'логлайн готов');
    }
    inputs.forEach(function (i) { i.addEventListener('input', function () { render(false); }); });
    $('#lg-spin').onclick = function () {
      var btn = this; btn.disabled = true; var t0 = performance.now(), dur = RM ? 0 : 900;
      var pick = ids.map(function (_, k) { return EX[Math.floor(Math.random() * EX.length)][k]; });
      (function frame(now) {
        if (now - t0 < dur) { inputs.forEach(function (inp, k) { inp.value = EX[Math.floor(Math.random() * EX.length)][k]; }); render(true); setTimeout(function () { requestAnimationFrame(frame); }, 70); return; }
        inputs.forEach(function (inp, k) { inp.value = pick[k]; }); render(false); btn.disabled = false;
      })(t0);
    };
    $('#lg-copy').onclick = function () {
      var b = this, txt = out.textContent;
      var done = function () { b.textContent = 'Скопировано'; setTimeout(function () { b.textContent = 'Скопировать'; }, 1600); };
      if (navigator.clipboard) navigator.clipboard.writeText(txt).then(done, done); else done();
    };
    render(false);
  }
  function pageHome() {
    typewriter(); loglineGame();
    return api.enrollment().then(function (enr) {
      if (enr) $$('[data-buy]').forEach(function (a) { a.href = 'kabinet.html'; a.innerHTML = 'Продолжить в кабинете ' + icon('arrow'); });
    });
  }

  // ---------- программа ----------
  function pageProgramma() {
    if (!api.user()) return;
    return Promise.all([api.enrollment(), api.progress()]).then(function (r) {
      var enr = r[0], p = r[1];
      $$('[data-l]').forEach(function (a) {
        var id = a.getAttribute('data-l'), L = byId[id];
        var ic = isDone(p, id) ? 'check' : (L.free || enr ? 'play' : 'lock');
        a.querySelector('svg').outerHTML = icon(ic);
      });
    });
  }

  // ---------- вопросы ----------
  function pageVoprosy() {
    var f = $('#ask'); if (!f) return;
    var u = api.user(); if (u) { f.name.value = u.name || ''; f.email.value = u.email || ''; }
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var err = $('#ask-err'), name = f.name.value.trim(), email = f.email.value.trim(), body = f.body.value.trim();
      [f.name, f.email, f.body].forEach(function (i) { i.removeAttribute('aria-invalid'); });
      var bad = function (el, msg) { err.textContent = msg; el.setAttribute('aria-invalid', 'true'); el.focus(); };
      if (name.length < 2) return bad(f.name, 'Напишите, как к вам обращаться');
      if (!EMAIL.test(email)) return bad(f.email, 'Проверьте e-mail: например, name@mail.ru');
      if (body.length < 5) return bad(f.body, 'Напишите вопрос хотя бы в пару слов');
      err.textContent = ''; var btn = $('button[type=submit]', f); btn.classList.add('busy'); btn.innerHTML = '<span class="spin"></span> Отправляем';
      api.ask({ name: name.slice(0, 60), email: email.slice(0, 120), body: body.slice(0, 2000) }).then(function () {
        f.outerHTML = '<div class="sent">' + ART.sheet.replace('<svg', '<svg class="env"') + '<h2>Вопрос отправлен</h2><p>Ответ придёт на <b>' + esc(email) + '</b>. Обычно в течение пары дней.</p></div>';
      }).catch(function () { btn.classList.remove('busy'); btn.innerHTML = 'Отправить вопрос ' + icon('arrow'); err.textContent = 'Не получилось отправить. Проверьте интернет и попробуйте ещё раз.'; });
    });
  }

  // ---------- вход ----------
  function pageVhod() {
    var next = safeNext(), f = $('#login');
    if (api.user()) { go(next); return; }
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var err = $('#login-err'), name = f.name.value.trim(), email = f.email.value.trim();
      [f.name, f.email].forEach(function (i) { i.removeAttribute('aria-invalid'); });
      if (name.length < 2) { err.textContent = 'Напишите, как к вам обращаться'; f.name.setAttribute('aria-invalid', 'true'); f.name.focus(); return; }
      if (!EMAIL.test(email)) { err.textContent = 'Проверьте e-mail: например, name@mail.ru'; f.email.setAttribute('aria-invalid', 'true'); f.email.focus(); return; }
      err.textContent = ''; var btn = $('button[type=submit]', f); btn.classList.add('busy'); btn.innerHTML = '<span class="spin"></span> Минуту';
      api.signIn({ name: name.slice(0, 60), email: email.slice(0, 120), next: next }).then(function (r) {
        if (r.mode === 'demo') { go(next); return; }
        showSent(email, name, next);
      }).catch(function (x) {
        btn.classList.remove('busy'); btn.innerHTML = 'Получить ссылку для входа ' + icon('arrow');
        err.textContent = x && x.status === 429 ? 'Слишком много попыток. Подождите минуту и попробуйте снова.' : 'Не получилось отправить письмо. Проверьте адрес и попробуйте ещё раз.';
      });
    });
    function showSent(email, name, next) {
      var box = $('#door'), left = 60;
      box.innerHTML = '<div class="sent">' + ART.sheet.replace('<svg', '<svg class="env"') + '<h2>Проверьте почту</h2><p>Мы отправили ссылку для входа на <b>' + esc(email) + '</b>. Откройте письмо на этом же устройстве.</p>' +
        '<p class="hint">Письма нет? Загляните в «Спам» или <button type="button" class="tlink" id="resend" disabled>отправьте ещё раз через <span id="left">60</span> с</button></p></div>';
      var rb = $('#resend'), timer = setInterval(function () { left--; if (left <= 0) { clearInterval(timer); rb.disabled = false; rb.textContent = 'отправьте ещё раз'; } else $('#left').textContent = left; }, 1000);
      rb.onclick = function () { rb.disabled = true; api.signIn({ name: name, email: email, next: next }).then(function () { rb.textContent = 'отправили'; }, function () { rb.textContent = 'не получилось, попробуйте позже'; }); };
    }
  }

  // ---------- касса ----------
  function pageKassa() {
    var t = TIERS[qs.get('t')] ? qs.get('t') : 'guide', u = api.user();
    if (!u) { go('vhod.html?next=kassa&t=' + t); return; }
    var box = $('#door');
    return api.enrollment().then(function (enr) {
      if (enr) { box.innerHTML = okHTML('У вас уже есть билет', 'Тариф «' + TIERS[enr.tariff].name + '». Все уроки ждут в кабинете.'); return; }
      box.querySelector('[data-skel]').remove();
      var opts = $('#opts');
      opts.innerHTML = Object.keys(TIERS).map(function (k) { var x = TIERS[k];
        return '<label class="opt"><input type="radio" name="tier" value="' + k + '"' + (k === t ? ' checked' : '') + '><span><b>' + T(x.name) + '</b><small>' + T(x.feats[1]) + '</small></span><strong>' + rub(x.price) + '</strong></label>'; }).join('');
      var sum = function () { var k = $('input[name=tier]:checked').value, x = TIERS[k];
        $('#sum').innerHTML = '<div><span>Тариф</span><b>' + T(x.name) + '</b></div><div><span>Покупатель</span><b>' + esc(u.email) + '</b></div><div><span>Скидка</span><b>−' + rub(x.old - x.price) + '</b></div><div class="tot"><span>Итого</span><b>' + rub(x.price) + '</b></div>';
        $('#pay').innerHTML = 'Оплатить ' + rub(x.price) + ' ' + icon('arrow'); history.replaceState(null, '', 'kassa.html?t=' + k); };
      opts.addEventListener('change', sum); sum();
      $('#pay-form').hidden = false;
      $('#pay-form').addEventListener('submit', function (e) {
        e.preventDefault(); var err = $('#pay-err'), k = $('input[name=tier]:checked').value;
        if (!$('#agree').checked) { err.textContent = 'Отметьте согласие с офертой и политикой'; $('#agree').focus(); return; }
        err.textContent = ''; var btn = $('#pay'); btn.classList.add('busy'); btn.innerHTML = '<span class="spin"></span> Связываемся с кассой…';
        api.buy(k).then(function () {
          box.innerHTML = '<div class="ok"><span class="stamp">ОПЛАЧЕНО</span><h1>Билет <em>ваш</em></h1><p>Тариф «' + T(TIERS[k].name) + '». Чек придёт на ' + esc(u.email) + '. Начните с пролога: он займёт десять минут.</p><a class="btn wide" href="urok.html?id=p1">Начать первый урок ' + icon('arrow') + '</a><p class="hint"><a href="kabinet.html">Перейти в кабинет</a></p></div>';
        }).catch(function () { btn.classList.remove('busy'); sum(); err.textContent = 'Оплата не прошла. Попробуйте ещё раз или напишите нам.'; });
      });
    });
  }
  function okHTML(h, p) { return '<div class="ok"><span class="stamp">БИЛЕТ</span><h1>' + T(h) + '</h1><p>' + T(p) + '</p><a class="btn wide" href="kabinet.html">В кабинет ' + icon('arrow') + '</a></div>'; }

  // ---------- кабинет ----------
  function greet() { var h = new Date().getHours(); return h < 5 ? 'Доброй ночи' : h < 12 ? 'Доброе утро' : h < 18 ? 'Добрый день' : 'Добрый вечер'; }
  function pageKabinet() {
    var u = api.user(); if (!u) { go('vhod.html?next=kabinet'); return; }
    return Promise.all([api.enrollment(), api.progress()]).then(function (r) {
      var enr = r[0], p = r[1], done = LESSONS.filter(function (l) { return isDone(p, l.id); }).length, n = LESSONS.length;
      var avail = LESSONS.filter(function (l) { return l.free || enr; });
      var nxt = avail.filter(function (l) { return !isDone(p, l.id); })[0];
      var got = earned(p), html = '';
      html += '<div class="kb-top"><div><h1>' + greet() + ', <em>' + T(u.name || 'автор') + '</em></h1><p>' +
        (enr ? 'Тариф «' + T(TIERS[enr.tariff].name) + '». ' : '') + (done ? 'Сыграно ' + done + ' ' + plural(done, 'сцена', 'сцены', 'сцен') + ' из ' + n + '.' : 'Первая сцена ждёт.') + '</p></div>' +
        '<div class="prog">' + ringHTML('lg', done, n) + '<div><b>' + Math.round(done / n * 100) + '%</b><span>гайда пройдено</span></div></div></div>';
      if (nxt) html += '<div class="cont"><div><small>' + T(ACTS[nxt.act].label + ' · ' + ACTS[nxt.act].t) + '</small><h2>' + T(nxt.title) + '</h2></div><a class="btn" href="urok.html?id=' + nxt.id + '">' + (done ? 'Продолжить' : 'Начать') + ' ' + icon('arrow') + '</a></div>';
      else if (enr) html += '<div class="cont"><div><small>Финальный занавес</small><h2>Все сцены сыграны. Пора за второй драфт</h2></div><a class="btn" href="urok.html?id=f2">Открыть урок ' + icon('arrow') + '</a></div>';
      if (!enr) html += '<div class="nobuy"><h2>Билета пока нет</h2><p>Пролог открыт бесплатно, попробуйте. Остальные шесть актов откроются после покупки.</p><div class="ctas"><a class="btn" href="kassa.html?t=guide">Купить гайд ' + icon('arrow') + '</a><a class="btn ghost" href="tarify.html">Сравнить тарифы</a></div></div>';
      html += '<h2 class="t">Акты</h2><div class="acts-map">' + ACTS.map(function (a, ai) {
        var ls = LESSONS.filter(function (l) { return l.act === ai; }), d = ls.filter(function (l) { return isDone(p, l.id); }).length;
        var open = ls[0].free || enr, first = ls.filter(function (l) { return !isDone(p, l.id); })[0] || ls[0];
        return '<a class="am' + (d === ls.length ? ' done' : '') + '" href="urok.html?id=' + first.id + '"><div><small>' + T(a.label) + '</small><b>' + T(a.t) + '</b></div><span class="n">' + (open ? d + ' / ' + ls.length : icon('lock')) + '</span><span class="bar"><i style="--w:' + Math.round(d / ls.length * 100) + '%"></i></span></a>';
      }).join('') + '</div>';
      html += '<h2 class="t">Награды</h2><div class="stamps">' + ACH.map(function (a) {
        return '<div class="st ' + (got[a.id] ? 'on' : 'off') + '">' + ART[a.icon] + '<b>' + T(a.t) + '</b><span>' + T(a.d) + '</span></div>';
      }).join('') + '</div>';
      html += '<div class="kb-foot"><span>' + esc(u.email) + '</span><button type="button" id="logout">Выйти</button>' + (enr && enr.tariff === 'review' ? '<span>Разбор сценария: пришлите до 15 страниц через <a class="tlink" href="voprosy.html#ask">форму вопроса</a></span>' : '') + '</div>';
      $('#kb').innerHTML = html;
      $('#logout').onclick = function () { api.signOut().then(function () { go('index.html'); }); };
    });
  }

  // ---------- урок ----------
  function pageUrok() {
    var L = byId[qs.get('id')] || LESSONS[0];
    if (!byId[qs.get('id')]) history.replaceState(null, '', 'urok.html?id=' + L.id);
    var u = api.user(), side = $('#side'), A = ACTS[L.act];
    document.title = L.title + ' — Сцена за сценой';
    $('#l-crumb').textContent = A.label + ' · ' + A.t + ' · урок ' + (LESSONS.filter(function (l) { return l.act === L.act; }).indexOf(L) + 1);
    $('#l-title').textContent = nb(L.title);
    $('#side-open').onclick = function () { side.classList.add('open'); };
    $('#side-x').onclick = function () { side.classList.remove('open'); };
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') side.classList.remove('open'); });
    $('#play').onclick = function () { var s = $('.screen'); if (!$('.msg', s)) { var m = document.createElement('p'); m.className = 'msg'; m.textContent = 'Видео урока загрузит Мария. В прототипе здесь заглушка.'; s.appendChild(m); } };

    return Promise.all([u ? api.enrollment() : null, u ? api.progress() : {}]).then(function (r) {
      var enr = r[0], p = r[1] || {};
      function renderSide() {
        var d = LESSONS.filter(function (l) { return isDone(p, l.id); }).length;
        $('#side-cnt').textContent = d + ' / ' + LESSONS.length;
        $('#side-in').innerHTML = '<div class="prgs">' + ringHTML('sm', d, LESSONS.length) + '<div><b>' + d + ' из ' + LESSONS.length + '</b><span>сцен сыграно</span></div></div>' +
          ACTS.map(function (a, ai) { return '<div class="mod"><h4>' + T(a.label) + '<em>' + T(a.t) + '</em></h4>' + LESSONS.filter(function (l) { return l.act === ai; }).map(function (l) {
            var dn = isDone(p, l.id), lk = !(l.free || enr);
            return '<a class="les' + (dn ? ' done' : '') + (lk ? ' lock' : '') + '" href="urok.html?id=' + l.id + '"' + (l.id === L.id ? ' aria-current="page"' : '') + '><span class="dot">' + (dn ? icon('check') : (lk ? icon('lock') : '')) + '</span><span>' + T(l.title) + '</span><i>' + l.minutes + '′</i></a>';
          }).join('') + '</div>'; }).join('');
      }
      renderSide();
      $('#l-meta').innerHTML = '<span>≈ ' + L.minutes + ' мин</span><span>видео · текст · тест · задание</span>' + (L.free ? '<span class="free">бесплатно</span>' : '');
      var prev = LESSONS[L.idx - 1], next = LESSONS[L.idx + 1];

      if (!(L.free || enr)) {
        $('#l-body').outerHTML = '<div class="wall-lock">' + ART.curtain.replace('<svg', '<svg class="big"') + '<h2>Эта сцена по билету</h2><p>Урок «' + T(L.title) + '» входит в гайд. Пролог можно пройти бесплатно.</p><div class="ctas">' +
          '<a class="btn" href="kassa.html?t=guide">Купить гайд ' + icon('arrow') + '</a>' + (u ? '' : '<a class="btn ghost" href="vhod.html?next=urok&amp;id=' + L.id + '">Уже купил, войти</a>') + '</div></div>';
        $('.screen').hidden = true; navButtons(prev, next, null); return;
      }
      return api.lesson(L.id).then(function (B) {
        if (!B) { $('#l-body').innerHTML = '<p class="lead">Не удалось загрузить урок. Обновите страницу.</p>'; return; }
        renderLesson(B);
      }, function () { $('#l-body').innerHTML = '<p class="lead">Нет связи с сервером. Проверьте интернет и обновите страницу.</p>'; });

      function renderLesson(B) {
        var q = B.quiz || null, my = p[L.id] || {};
        $('#l-body').innerHTML = '<p class="lead">' + T(B.lead) + '</p><h2>Главное</h2><ul>' + (B.points || []).map(function (x) { return '<li><span>' + T(x) + '</span></li>'; }).join('') + '</ul>' +
          (B.example ? '<h2>Пример</h2><pre class="script">' + esc(B.example) + '</pre>' : '') +
          '<div class="box tip"><b>' + icon('bulb') + 'Фишка</b><p>' + T(B.tip) + '</p></div>' +
          '<div class="box task"><b>' + icon('pen') + 'Задание</b><p>' + T(B.task) + '</p><label class="sr" for="note">Ваш ответ</label><textarea id="note" maxlength="4000" placeholder="Черновик ответа. Сохраняется сам."></textarea><span class="saved" id="saved"></span></div>';
        // заметка к заданию
        var note = $('#note'), saved = $('#saved'), tm;
        var localKey = 'scena-note-' + L.id;
        if (u) note.value = my.note || ''; else { try { note.value = localStorage.getItem(localKey) || ''; } catch (e) {} saved.textContent = 'Черновик хранится в этом браузере. Войдите, чтобы он сохранялся в кабинете.'; }
        note.addEventListener('input', function () {
          clearTimeout(tm); saved.textContent = 'Сохраняю…';
          tm = setTimeout(function () {
            var v = note.value.slice(0, 4000);
            if (u) api.saveProgress(L.id, { note: v }).then(function () { p[L.id] = Object.assign({}, p[L.id], { note: v }); saved.textContent = 'Сохранено'; }, function () { saved.textContent = 'Не сохранилось. Проверьте интернет.'; });
            else { try { localStorage.setItem(localKey, v); } catch (e) {} saved.textContent = 'Сохранено в этом браузере'; }
          }, 700);
        });
        // тест
        if (q) {
          var qz = document.createElement('section'); qz.className = 'quiz';
          qz.innerHTML = '<small>Проверьте себя</small><h3>' + T(q.q) + '</h3><div class="qopts">' + q.options.map(function (o, i) { return '<button type="button" class="qo" data-i="' + i + '"><i>' + 'АБВ'.charAt(i) + '</i><span>' + T(o) + '</span></button>'; }).join('') + '</div><p class="qwhy" hidden></p>';
          $('#l-body').after(qz);
          if (my.quiz_ok) { var rb = $('.qo[data-i="' + q.correct + '"]', qz); rb.classList.add('right'); $('.qwhy', qz).hidden = false; $('.qwhy', qz).textContent = 'Вы уже ответили верно. ' + q.why; }
          $$('.qo', qz).forEach(function (b) {
            b.onclick = function () {
              var i = +b.getAttribute('data-i'), why = $('.qwhy', qz); why.hidden = false;
              if (i === q.correct) {
                $$('.qo', qz).forEach(function (x) { x.disabled = true; }); b.classList.add('right'); why.textContent = 'Верно. ' + q.why;
                if (u && !my.quiz_ok) { var before = earned(p); my.quiz_ok = true; p[L.id] = Object.assign({}, p[L.id], { quiz_ok: true });
                  api.saveProgress(L.id, { quiz_ok: true }).then(function () { announceNew(before, earned(p)); }); }
              } else { b.classList.add('wrong'); b.disabled = true; why.textContent = 'Не совсем. Подумайте ещё и выберите другой вариант.'; }
            };
          });
        }
        navButtons(prev, next, true);
      }
      function navButtons(prev, next, canDone) {
        var nav = $('#l-nav'), dn = isDone(p, L.id);
        nav.innerHTML = (prev ? '<a class="btn ghost" href="urok.html?id=' + prev.id + '">' + icon('left') + ' Назад</a>' : '') +
          (canDone ? '<button type="button" class="btn" id="done">' + (dn ? (next ? 'Следующая сцена' : 'Гайд пройден') : 'Сцена сыграна') + ' ' + icon(dn ? 'arrow' : 'check') + '</button>' :
            (next ? '<a class="btn ghost" href="urok.html?id=' + next.id + '">Дальше ' + icon('arrow') + '</a>' : ''));
        var db = $('#done'); if (!db) return;
        db.onclick = function () {
          if (isDone(p, L.id)) { if (next) go('urok.html?id=' + next.id); else go('kabinet.html'); return; }
          if (!u) { go('vhod.html?next=urok&id=' + L.id); return; }
          db.classList.add('busy'); var before = earned(p);
          api.saveProgress(L.id, { done: true }).then(function () {
            p[L.id] = Object.assign({}, p[L.id], { done: true }); renderSide();
            toast('Сцена сыграна', next ? 'Дальше: «' + next.title + '»' : 'Это был последний урок. Браво!', ART.sheet);
            announceNew(before, earned(p));
            db.classList.remove('busy'); db.innerHTML = (next ? 'Следующая сцена' : 'В кабинет') + ' ' + icon('arrow');
          }, function () { db.classList.remove('busy'); toast('Не сохранилось', 'Проверьте интернет и нажмите ещё раз.'); });
        };
      }
    });
  }

  // ---------- тарифы ----------
  function pageTarify() {
    return api.enrollment().then(function (enr) {
      if (!enr) return;
      $$('[data-buy]').forEach(function (a) { a.href = 'kabinet.html'; a.innerHTML = 'Билет уже у вас ' + icon('arrow'); });
    });
  }

  var PAGES = { index: pageHome, programma: pageProgramma, voprosy: pageVoprosy, vhod: pageVhod, kassa: pageKassa, kabinet: pageKabinet, urok: pageUrok, tarify: pageTarify };

  setupCommon();
  makeAPI().then(function (a) { api = a; return api.init(); }).catch(function (e) {
    console.error(e); if (!api) api = demoAPI(); toast('Нет связи с сервером', 'Часть функций может не работать. Обновите страницу.');
  }).then(function () {
    renderAuth(); demoBar();
    var fn = PAGES[PAGE]; return fn && fn();
  }).catch(function (e) { console.error(e); toast('Что-то пошло не так', 'Обновите страницу. Если не поможет, напишите нам.'); });
})();

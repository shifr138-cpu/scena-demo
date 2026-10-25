/* Сцена за сценой — логика сайта.
   Данные: Supabase (если в assets/config.js указаны URL и ключ) или демо-режим в браузере.
   Всё, что пришло от пользователя или из базы, выводится через esc()/textContent. */
(function () {
  'use strict';
  var CFG = window.SCENA_CONFIG || {};
  var C = window.SCENA || { tiers: {}, reels: [], swipe: [] };
  var TIERS = C.tiers, GUIDE = TIERS.guide || { price: 0 };
  var PAGE = document.body.getAttribute('data-page') || '';
  var RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var qs = new URLSearchParams(location.search);
  var GUIDE_PATH = 'guide.pdf'; // имя файла в хранилище Supabase (bucket «guide»)
  var FILE_NAME = 'Сцена за сценой — гайд.pdf';

  // ---------- мелочи ----------
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return [].slice.call((c || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var nb = function (s) { return String(s).replace(/(^|[\s(«])([а-яёА-ЯЁa-zA-Z]{1,2}) /g, '$1$2 ').replace(/ ([—–])/g, ' $1'); };
  var T = function (s) { return nb(esc(s)); };
  var rub = function (n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ₽'; };
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var go = function (url) { location.href = url; };
  var icon = function (id) { return '<svg class="ic" aria-hidden="true"><use href="#i-' + id + '"/></svg>'; };
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
  var TG = /^@?[A-Za-z0-9_]{3,32}$/;

  // куда возвращаться после входа: только свои страницы, без внешних адресов
  function safeNext() { return qs.get('next') === 'kassa' ? 'kassa.html?t=guide' : 'kabinet.html'; }

  function copyText(btn, txt, label) {
    var done = function () { btn.innerHTML = icon('check') + ' Скопировано'; setTimeout(function () { btn.innerHTML = label; }, 1600); };
    if (navigator.clipboard) navigator.clipboard.writeText(txt).then(done, done); else done();
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

  // ---------- рисунки (вырезанная бумага) ----------
  var ART = {
    sheet: '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="30" fill="#3d3159"/><g transform="rotate(-7 32 32)"><rect x="19" y="13" width="26" height="36" rx="2" fill="#f3ecda"/><path d="M24 23h16M24 29h16M24 35h10" stroke="#9d97a5" stroke-width="2.5" stroke-linecap="round"/></g><circle cx="31" cy="14" r="3.6" fill="#ec8a74"/></svg>',
    star: '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="30" fill="#4f5226"/><path d="m32 13 5.6 12 13 1.4-9.7 8.8 2.7 12.8L32 41.4 20.4 48l2.7-12.8-9.7-8.8 13-1.4Z" fill="#d7db62"/></svg>',
    file: '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="30" fill="#3d3159"/><path d="M21 12h16l9 9v31H21Z" fill="#f3ecda"/><path d="M37 12v9h9Z" fill="#d6ccf3"/><path d="M26 30h14M26 36h14M26 42h9" stroke="#9d97a5" stroke-width="2.5" stroke-linecap="round"/></svg>'
  };
  var COVER = '<svg class="cover" viewBox="0 0 150 200" aria-hidden="true"><rect x="12" y="10" width="132" height="186" rx="6" fill="#141018"/><rect x="4" y="4" width="132" height="186" rx="6" fill="#5a4a82"/>' +
    '<rect x="4" y="4" width="14" height="186" rx="4" fill="#463a68"/><circle cx="98" cy="54" r="22" fill="#f1c27d"/><circle cx="91" cy="48" r="5" fill="#dba25e"/>' +
    '<text x="30" y="108" font-family="Literata, Georgia, serif" font-style="italic" font-size="18" fill="#f3ecda">Сцена</text><text x="30" y="130" font-family="Literata, Georgia, serif" font-style="italic" font-size="18" fill="#f3ecda">за сценой</text>' +
    '<path d="M18 190v-22c12-14 30-20 48-18-4-8 2-16 14-16 14 0 24 10 22 22 12-2 22 2 34 10v24Z" fill="#ec8a74"/></svg>';

  // ---------- данные: демо-режим ----------
  function demoAPI() {
    var KEY = 'scena-demo-v3', S = { user: null, paid: null };
    try { var raw = localStorage.getItem(KEY); if (raw) S = Object.assign(S, JSON.parse(raw)); } catch (e) {}
    var save = function () { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
    return {
      mode: 'demo',
      init: function () { return Promise.resolve(S.user); },
      user: function () { return S.user; },
      signIn: function (p) { return wait(500).then(function () { S.user = { id: 'demo', email: p.email, name: p.name }; save(); return { mode: 'demo' }; }); },
      signOut: function () { S.user = null; save(); return Promise.resolve(); },
      purchase: function () { return Promise.resolve(S.user && S.paid ? S.paid : null); },
      buy: function () { return wait(1300).then(function () { S.paid = { tariff: 'guide', status: 'paid' }; save(); }); },
      download: function () { return Promise.resolve('guide-demo.pdf'); },
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
      purchase: function () {
        if (!U) return Promise.resolve(null);
        return sb.from('purchases').select('tariff,status').eq('user_id', U.id).maybeSingle().then(chk).then(function (d) { return d && d.status === 'paid' ? d : null; });
      },
      // заглушка оплаты: вызывает demo_purchase в базе (работает, пока в app_settings включены тестовые оплаты)
      buy: function () { return Promise.all([sb.rpc('demo_purchase', { p_tariff: 'guide' }).then(chk), wait(900)]); },
      // временная ссылка на файл: база выдаст её только купившему (политика guide_read_buyers)
      download: function () {
        return sb.storage.from('guide').createSignedUrl(GUIDE_PATH, 120, { download: FILE_NAME }).then(chk).then(function (d) { return d.signedUrl; });
      },
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

  function downloadGuide(btn) {
    btn.classList.add('busy');
    return api.download().then(function (url) {
      var a = document.createElement('a'); a.href = url; a.download = FILE_NAME; a.rel = 'noopener';
      document.body.appendChild(a); a.click(); a.remove();
      toast('Гайд скачивается', api.mode === 'demo' ? 'В демо это пример файла. Настоящий гайд появится после редактуры.' : 'Файл «' + FILE_NAME + '»', ART.file);
    }).catch(function () { toast('Не получилось скачать', 'Обновите страницу и попробуйте ещё раз.'); })
      .then(function () { btn.classList.remove('busy'); });
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
    bar.innerHTML = '<span>Демо: оплата ненастоящая, всё хранится в браузере</span> <button type="button">Сбросить</button>';
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
  // если гайд уже куплен, кнопки «Купить» ведут в кабинет
  function markBought() {
    return api.purchase().then(function (p) {
      if (p) $$('[data-buy]').forEach(function (a) { a.href = 'kabinet.html'; a.innerHTML = 'Гайд у вас: открыть кабинет ' + icon('arrow'); });
    });
  }

  // ---------- главная: печатная машинка в телефоне ----------
  function typewriter() {
    var sheet = $('#sheet'); if (!sheet || RM) return;
    var lines = $$('.sl', sheet), bars = $$('.ph-bars i', sheet);
    var full = lines.map(function (l) { return l.textContent; }); lines.forEach(function (l) { l.textContent = ''; });
    sheet.classList.add('typing');
    var caret = document.createElement('span'); caret.className = 'caret';
    var li = 0, ci = 0, delay = document.documentElement.classList.contains('intro') ? 1600 : 400;
    setTimeout(function step() {
      if (li >= lines.length) { lines[lines.length - 1].appendChild(caret); return; }
      var el = lines[li];
      if (ci === 0 && el.hasAttribute('data-bar')) bars[+el.getAttribute('data-bar')].classList.add('on');
      ci++; el.textContent = full[li].slice(0, ci); el.appendChild(caret);
      if (ci >= full[li].length) { li++; ci = 0; setTimeout(step, 320); } else setTimeout(step, full[li].charAt(ci) === ' ' ? 18 : 28);
    }, delay);
  }

  // ---------- игра «Соберите рилс» ----------
  function reelGame() {
    var keys = ['niche', 'hook', 'core', 'reward'], F = {};
    keys.forEach(function (k) { F[k] = $('#rl-' + k); });
    if (!F.hook) return;
    var EX = C.reels || [], cur = 0;
    var words = function (s) { return (s.match(/\S+/g) || []).length; };
    var secs = function (s) { return s ? Math.max(2, Math.round(words(s) / 2.6)) : 0; }; // ≈2,6 слова в секунду
    var tc = function (s) { return Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60); };
    function vals() { var v = {}; keys.forEach(function (k) { v[k] = F[k].value.trim(); }); return v; }
    function render(rolling) {
      var v = vals(), t1 = secs(v.hook), t2 = t1 + secs(v.core), total = t2 + secs(v.reward), r = rolling ? ' class="roll"' : '';
      $('#rl-tag').textContent = 'Рилс' + (v.niche ? ' · ' + v.niche : '');
      $('#rl-dur').textContent = total ? '≈ ' + total + ' сек' : '';
      $('#rl-out').innerHTML = '<p><i>' + tc(0) + ' · хук</i><b' + r + '>' + (v.hook ? '«' + T(v.hook.replace(/[«»"]/g, '')) + '»' : '…') + '</b></p>' +
        '<p><i>' + tc(t1) + ' · суть</i><span' + r + '>' + T(v.core || '…') + '</span></p>' +
        '<p><i>' + tc(t2) + ' · награда</i><span' + r + '>' + T(v.reward || '…') + '</span></p>';
      var filled = [v.hook, v.core, v.reward].filter(Boolean).length, msg, score;
      if (filled < 3) { msg = 'заполните хук, суть и награду'; score = filled * 25; }
      else if (/^(всем\s+)?(привет|здравствуйте|добрый\s+день)/i.test(v.hook)) { msg = 'уберите приветствие: оно съедает первые секунды'; score = 45; }
      else if (words(v.hook) > 14) { msg = 'хук длинноват: зритель решает за пару секунд'; score = 55; }
      else if (total > 60) { msg = 'длинновато для короткого ролика'; score = 65; }
      else { msg = 'держит внимание, можно снимать'; score = 100; }
      $('#rl-meter').style.setProperty('--w', score + '%');
      $('#rl-score').textContent = msg;
    }
    keys.forEach(function (k) { F[k].addEventListener('input', function () { render(false); }); });
    $('#rl-spin').onclick = function () {
      var btn = this; btn.disabled = true;
      var next = cur; while (EX.length > 1 && next === cur) next = Math.floor(Math.random() * EX.length);
      var t0 = performance.now(), dur = RM ? 0 : 900;
      (function frame(now) {
        if (now - t0 < dur) { keys.forEach(function (k, i) { F[k].value = EX[Math.floor(Math.random() * EX.length)][i]; }); render(true); setTimeout(function () { requestAnimationFrame(frame); }, 70); return; }
        cur = next; keys.forEach(function (k, i) { F[k].value = EX[cur][i]; }); render(false); btn.disabled = false;
      })(t0);
    };
    var copyLabel = $('#rl-copy').innerHTML;
    $('#rl-copy').onclick = function () {
      var v = vals(), t1 = secs(v.hook), t2 = t1 + secs(v.core);
      copyText(this, 'Рилс' + (v.niche ? ' · ' + v.niche : '') + '\n' + tc(0) + ' Хук: ' + v.hook + '\n' + tc(t1) + ' Суть: ' + v.core + '\n' + tc(t2) + ' Награда: ' + v.reward, copyLabel);
    };
    render(false);
  }

  // ---------- мини-игра «Свайп или досмотр» ----------
  function swipeGame() {
    var box = $('#swipe'); if (!box) return;
    var R = C.swipe || [], n = 0, score = 0;
    function round() {
      var r = R[n], opts = Math.random() < 0.5 ? [[r[1], 1], [r[0], 0]] : [[r[0], 0], [r[1], 1]];
      box.innerHTML = '<div class="sw-top"><small>Пара ' + (n + 1) + ' из ' + R.length + '</small><span class="sw-dots" aria-hidden="true">' +
        R.map(function (_, i) { return '<i class="' + (i < n ? 'done' : (i === n ? 'cur' : '')) + '"></i>'; }).join('') + '</span></div>' +
        '<h3>На каком хуке вы бы остановились?</h3><div class="qopts sw-opts">' +
        opts.map(function (o, i) { return '<button type="button" class="qo sw" data-ok="' + o[1] + '"><i>' + 'АБ'.charAt(i) + '</i><span>«' + T(o[0]) + '»</span></button>'; }).join('') +
        '</div><p class="qwhy" hidden></p><div class="sw-next" hidden><button type="button" class="btn sm v2" id="sw-next">' + (n + 1 < R.length ? 'Следующая пара' : 'Итог') + ' ' + icon('arrow') + '</button></div>';
      $$('.sw', box).forEach(function (b) {
        b.onclick = function () {
          var ok = b.getAttribute('data-ok') === '1'; if (ok) score++;
          $$('.sw', box).forEach(function (x) { x.disabled = true; if (x.getAttribute('data-ok') === '1') x.classList.add('right'); });
          if (!ok) b.classList.add('wrong');
          var why = $('.qwhy', box); why.hidden = false; why.innerHTML = '<b>' + (ok ? 'Досмотрят. ' : 'Пролистают. ') + '</b>' + T(r[2]);
          $('.sw-next', box).hidden = false;
          $('#sw-next').focus({ preventScroll: true });
          $('#sw-next').onclick = function () { n++; if (n < R.length) round(); else finish(); };
        };
      });
    }
    function finish() {
      var all = score === R.length;
      var msg = all ? 'Чутьё на хуки есть. Гайд поможет превратить его в систему.' :
        score >= R.length - 2 ? 'Неплохо! Как собирать хук, суть и награду, разобрано в четвёртой главе.' : 'Самое время разобраться, как устроен хук. Об этом четвёртая глава гайда.';
      box.innerHTML = '<div class="sw-end"><span class="stamp">' + score + ' из ' + R.length + '</span><h3>' + (all ? 'Зритель остался до конца' : 'Часть зрителей пролистала') + '</h3><p>' + T(msg) + '</p>' +
        '<div class="ctas"><button type="button" class="btn sm ghost" id="sw-again">Сыграть ещё раз</button><a class="btn sm" href="vnutri.html">Что внутри ' + icon('arrow') + '</a></div></div>';
      $('#sw-again').onclick = function () { n = 0; score = 0; round(); };
    }
    round();
  }

  function pageHome() { typewriter(); reelGame(); swipeGame(); return markBought(); }

  function pageFragment() {
    var b = $('#pr-copy');
    if (b) { var label = b.innerHTML; b.onclick = function () { copyText(b, $('#prompt').textContent, label); }; }
    return markBought();
  }

  // ---------- формы: вопрос и заявка на личную работу ----------
  function questionForm(f, kind, okTitle, okText) {
    if (!f) return;
    var u = api.user(); if (u) { f.name.value = u.name || ''; f.email.value = u.email || ''; }
    var label = $('button[type=submit]', f).innerHTML, err = $('.err', f);
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = f.name.value.trim(), email = f.email.value.trim(), body = f.body.value.trim(), contact = f.contact ? f.contact.value.trim() : '';
      $$('input,textarea', f).forEach(function (i) { i.removeAttribute('aria-invalid'); });
      var bad = function (el, msg) { err.textContent = msg; el.setAttribute('aria-invalid', 'true'); el.focus(); };
      if (name.length < 2) return bad(f.name, 'Напишите, как к вам обращаться');
      if (!EMAIL.test(email)) return bad(f.email, 'Проверьте e-mail: например, name@mail.ru');
      if (contact && !TG.test(contact)) return bad(f.contact, 'Ник в Телеграме: латиница, цифры и _, например @maria_s');
      if (body.length < 5) return bad(f.body, 'Напишите хотя бы пару слов');
      err.textContent = ''; var btn = $('button[type=submit]', f); btn.classList.add('busy'); btn.innerHTML = '<span class="spin"></span> Отправляем';
      var q = { kind: kind, name: name.slice(0, 60), email: email.slice(0, 120), body: body.slice(0, 2000) };
      if (contact) q.contact = (contact.charAt(0) === '@' ? contact : '@' + contact).slice(0, 40);
      api.ask(q).then(function () {
        f.outerHTML = '<div class="sent">' + ART.sheet.replace('<svg', '<svg class="env"') + '<h2>' + T(okTitle) + '</h2><p>' + T(okText) + ' Ответ придёт на <b>' + esc(email) + '</b>.</p></div>';
      }).catch(function () { btn.classList.remove('busy'); btn.innerHTML = label; err.textContent = 'Не получилось отправить. Проверьте интернет и попробуйте ещё раз.'; });
    });
  }
  function pageVoprosy() { questionForm($('#ask'), 'question', 'Вопрос отправлен', 'Мария прочитает и ответит.'); }
  function pageTarify() {
    questionForm($('#apply'), 'mentor', 'Заявка у Марии', 'Она напишет, чтобы обсудить задачу и дату старта.');
    return markBought();
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
    var u = api.user();
    if (!u) { go('vhod.html?next=kassa'); return; }
    var box = $('#door');
    return api.purchase().then(function (p) {
      if (p) { box.innerHTML = '<div class="ok"><span class="stamp">ВАШ</span><h1>Гайд уже у вас</h1><p>Файл ждёт в кабинете, скачать можно в любой момент.</p><a class="btn wide" href="kabinet.html">В кабинет ' + icon('arrow') + '</a></div>'; return; }
      box.querySelector('[data-skel]').remove();
      $('#opts').innerHTML = '<div class="opt one">' + ART.file + '<span><b>Гайд «Сцена за сценой»</b><small>PDF · 5 глав и промпты для нейросети</small></span><strong>' + rub(GUIDE.price) + '</strong></div>';
      $('#sum').innerHTML = '<div><span>Покупатель</span><b>' + esc(u.email) + '</b></div><div class="tot"><span>Итого</span><b>' + rub(GUIDE.price) + '</b></div>';
      $('#pay').innerHTML = 'Оплатить ' + rub(GUIDE.price) + ' ' + icon('arrow');
      $('#pay-form').hidden = false;
      $('#pay-form').addEventListener('submit', function (e) {
        e.preventDefault(); var err = $('#pay-err');
        if (!$('#agree').checked) { err.textContent = 'Отметьте согласие с офертой и политикой'; $('#agree').focus(); return; }
        err.textContent = ''; var btn = $('#pay'); btn.classList.add('busy'); btn.innerHTML = '<span class="spin"></span> Связываемся с кассой…';
        api.buy().then(function () {
          box.innerHTML = '<div class="ok"><span class="stamp">ОПЛАЧЕНО</span><h1>Гайд <em>ваш</em></h1><p>Чек придёт на ' + esc(u.email) + '. Файл уже лежит в кабинете.</p>' +
            '<button type="button" class="btn wide" id="dl">' + icon('down') + ' Скачать гайд</button><p class="hint"><a href="kabinet.html">Перейти в кабинет</a></p></div>';
          $('#dl').onclick = function () { downloadGuide(this); };
        }).catch(function () { btn.classList.remove('busy'); btn.innerHTML = 'Оплатить ' + rub(GUIDE.price) + ' ' + icon('arrow'); err.textContent = 'Оплата не прошла. Попробуйте ещё раз или напишите нам.'; });
      });
    });
  }

  // ---------- кабинет ----------
  function greet() { var h = new Date().getHours(); return h < 5 ? 'Доброй ночи' : h < 12 ? 'Доброе утро' : h < 18 ? 'Добрый день' : 'Добрый вечер'; }
  function pageKabinet() {
    var u = api.user(); if (!u) { go('vhod.html?next=kabinet'); return; }
    return api.purchase().then(function (p) {
      var link = function (href, kind, title) { return '<a class="am" href="' + href + '"><div><small>' + kind + '</small><b>' + title + '</b></div>' + icon('arrow') + '</a>'; };
      var html = '<div class="kb-top"><div><h1>' + greet() + ', <em>' + T(u.name || 'автор') + '</em></h1><p>' +
        (p ? 'Ваш гайд здесь. Скачивайте, когда удобно.' : 'Гайд появится здесь сразу после оплаты.') + '</p></div></div>';
      if (p) html += '<div class="gfile">' + COVER + '<div class="gf-tx"><small>PDF · 5 глав и промпты</small><h2>Сцена за сценой</h2><p>Гайд по сценариям для Reels, TikTok и Shorts. Когда выйдет новая версия, она появится здесь же.</p>' +
        '<div class="ctas"><button type="button" class="btn" id="dl">' + icon('down') + ' Скачать гайд</button><a class="btn ghost" href="vnutri.html">Что внутри</a></div></div></div>';
      else html += '<div class="nobuy"><h2>Гайда пока нет</h2><p>Посмотрите, что внутри, или прочитайте фрагмент. После оплаты файл появится здесь.</p><div class="ctas"><a class="btn" href="kassa.html?t=guide">Купить за ' + rub(GUIDE.price) + ' ' + icon('arrow') + '</a><a class="btn ghost" href="fragment.html">Читать фрагмент</a></div></div>';
      html += '<h2 class="t">Пока читаете</h2><div class="acts-map">' +
        link('index.html#hook', 'Игра', 'Соберите рилс') + link('index.html#swipe-sec', 'Игра', 'Свайп или досмотр') +
        link('tarify.html#zayavka', 'Личная работа', 'Разобрать свои ролики с Марией') + link('voprosy.html#ask-sec', 'Вопрос', 'Спросить Марию') + '</div>';
      html += '<div class="kb-foot"><span>' + esc(u.email) + '</span><button type="button" id="logout">Выйти</button></div>';
      $('#kb').innerHTML = html;
      if (p) $('#dl').onclick = function () { downloadGuide(this); };
      $('#logout').onclick = function () { api.signOut().then(function () { go('index.html'); }); };
    });
  }

  var PAGES = { index: pageHome, vnutri: markBought, fragment: pageFragment, avtor: markBought, tarify: pageTarify, voprosy: pageVoprosy, vhod: pageVhod, kassa: pageKassa, kabinet: pageKabinet };

  setupCommon();
  makeAPI().then(function (a) { api = a; return api.init(); }).catch(function (e) {
    console.error(e); if (!api) api = demoAPI(); toast('Нет связи с сервером', 'Часть функций может не работать. Обновите страницу.');
  }).then(function () {
    renderAuth(); demoBar();
    var fn = PAGES[PAGE]; return fn && fn();
  }).catch(function (e) { console.error(e); toast('Что-то пошло не так', 'Обновите страницу. Если не поможет, напишите нам.'); });
})();

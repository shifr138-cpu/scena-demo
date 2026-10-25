// Выполняется в <head> до отрисовки: занавес на главной один раз за визит.
(function () {
  try {
    var d = document.documentElement;
    if (d.getAttribute('data-page') === 'index' && !sessionStorage.getItem('scena-intro') &&
        !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      d.classList.add('intro');
      sessionStorage.setItem('scena-intro', '1');
    }
  } catch (e) { /* без sessionStorage просто без занавеса */ }
  // плавный переход между страницами: если браузер его прервал (повернули экран), это не ошибка
  var quiet = function (e) { var vt = e.viewTransition; if (vt) { vt.ready.catch(function () {}); vt.finished.catch(function () {}); if (vt.updateCallbackDone) vt.updateCallbackDone.catch(function () {}); } };
  window.addEventListener('pagereveal', quiet);
  window.addEventListener('pageswap', quiet);
})();

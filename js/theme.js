(function() {
  var stored = localStorage.getItem('wt_theme');
  if (stored === 'light') document.documentElement.setAttribute('data-theme', 'light');

  document.addEventListener('DOMContentLoaded', function() {
    var btn = document.getElementById('theme-toggle');
    if (!btn) return;
    btn.addEventListener('click', function() {
      var isLight = document.documentElement.getAttribute('data-theme') === 'light';
      if (isLight) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('wt_theme', 'dark');
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('wt_theme', 'light');
      }
    });
  });
})();

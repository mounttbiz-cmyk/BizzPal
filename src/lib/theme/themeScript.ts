// Inlined into <head> before first paint to prevent any flash of the wrong theme
export const themeInitScript = `
(function() {
  try {
    var stored = localStorage.getItem('bizzpal-theme');
    var resolved = 'light';
    if (stored === 'dark') {
      resolved = 'dark';
    } else if (stored === 'system') {
      resolved = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      resolved = 'light';
    }
    document.documentElement.setAttribute('data-theme', resolved);
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(resolved);

    var meta = document.querySelector('meta[name="color-scheme"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'color-scheme';
      document.head.appendChild(meta);
    }
    meta.content = resolved;
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
  }
})();
`;

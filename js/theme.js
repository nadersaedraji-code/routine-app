/* Device-local appearance preference; never part of the synced tracker state. */
(() => {
  const slot = 'better.appearance';
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  let mode = 'system';
  try {
    const saved = localStorage.getItem(slot);
    if (saved === 'light' || saved === 'dark') mode = saved;
  } catch (_) {
    /* Private browsing can disable storage. */
  }

  function apply() {
    const dark = mode === 'dark' || (mode === 'system' && media.matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#101a1b' : '#F4F3EF');
    window.dispatchEvent(new Event('better-theme-change'));
  }

  window.BetterTheme = {
    get mode() { return mode; },
    set(value) {
      if (!['system', 'light', 'dark'].includes(value)) return;
      mode = value;
      try {
        if (mode === 'system') localStorage.removeItem(slot);
        else localStorage.setItem(slot, mode);
      } catch (_) { /* The current tab still updates. */ }
      apply();
    },
  };
  const onSystemChange = () => { if (mode === 'system') apply(); };
  if (media.addEventListener) media.addEventListener('change', onSystemChange);
  else media.addListener?.(onSystemChange);
  window.addEventListener('storage', (event) => {
    if (event.key !== slot) return;
    mode = event.newValue === 'light' || event.newValue === 'dark' ? event.newValue : 'system';
    apply();
  });
  apply();
})();

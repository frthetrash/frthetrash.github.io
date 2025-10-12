// script.js
// Vanilla JS handling the click and progressive enhancement.
// Redirects in the same tab to /whenpopupisclicked

document.addEventListener('DOMContentLoaded', function () {
  // set current year in footer
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const instaBtn = document.getElementById('instagram-viewer');

  // Accessibility: ensure button responds to Enter/Space naturally (native <button> does)
  // Click handler: navigate in the same tab to the required path
  if (instaBtn) {
    instaBtn.addEventListener('click', function (e) {
      // Provide a subtle visual feedback before navigation
      instaBtn.setAttribute('aria-pressed', 'true');

      // Use location.assign to change the path in the same tab.
      // This will attempt to load /whenpopupisclicked on the same origin.
      // If you prefer client-side routing without page reload, replace with:
      // history.pushState({}, '', '/whenpopupisclicked'); // but that won't load content.
      // The requirement asked to redirect to the path, so we'll navigate.
      window.location.assign('/whenpopupisclicked');
    }, { passive: true });
  }

  // Small progressive enhancement: keyboard shortcut "g" to focus the first action (optional)
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'g' || ev.key === 'G') {
      if (instaBtn) {
        instaBtn.focus();
      }
    }
  });
});

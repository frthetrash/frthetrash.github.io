// script.js — handles click/keyboard activation for the action block.
// When activated it redirects in the same tab to /whenpopupisclicked

;(function(){
  const action = document.getElementById('actionBlock');

  if (!action) return;

  // Navigate to the given path in same tab
  function navigate() {
    // Set aria-pressed for accessibility feedback
    action.setAttribute('aria-pressed', 'true');

    // Small visual feedback then change location immediately
    // (no asynchronous waiting or background work)
    window.location.href = '/whenpopupisclicked';
  }

  action.addEventListener('click', navigate);

  // Support keyboard activation (Enter & Space)
  action.addEventListener('keydown', function(e){
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      navigate();
    }
  });

  // Improve accessibility: announce role and hint via title
  action.title = 'Open Instagram viewer anonymously (opens same tab)';
})();

// script.js
// Vibrant single-page behavior + ambient audio placeholder & redirect logic.

document.addEventListener('DOMContentLoaded', () => {
  // footer year
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // redirect button
  const instaBtn = document.getElementById('instagram-viewer');
  if (instaBtn) {
    instaBtn.addEventListener('click', (e) => {
      // small visual feedback (aria)
      instaBtn.setAttribute('aria-pressed', 'true');

      // Same-tab redirect to required path
      // This attempts to navigate the current origin to /whenpopupisclicked
      window.location.assign('/whenpopupisclicked');
    }, { passive: true });
  }

  // Ambient audio setup
  const audioEl = document.getElementById('ambientAudio');
  const audioToggle = document.getElementById('audioToggle');

  // Placeholder note:
  // -----------------
  // To enable real ambient sound, add <source> elements inside the <audio id="ambientAudio"> tag
  // in index.html pointing to your hosted calm rain audio files (mp3/ogg). Example:
  //
  // <audio id="ambientAudio" loop preload="auto">
  //   <source src="/assets/sounds/calm-rain.mp3" type="audio/mpeg">
  //   <source src="/assets/sounds/calm-rain.ogg" type="audio/ogg">
  // </audio>
  //
  // The script below will then control playback, looping and mute/unmute.
  // -----------------

  // Initialize volume and try to autoplay (note: many browsers block autoplay with sound;
  // in that case user interaction (click) will start the audio).
  if (audioEl) {
    audioEl.volume = 0.12; // low, non-intrusive volume
    audioEl.loop = true;

    // Attempt to play on load (may be blocked by browser policies).
    const tryPlay = async () => {
      try {
        await audioEl.play();
        audioToggle.setAttribute('aria-pressed', 'true'); // playing
        audioToggle.title = "Mute ambient sound";
      } catch (err) {
        // Autoplay blocked: keep audio paused until user toggles.
        audioToggle.setAttribute('aria-pressed', 'false');
        audioToggle.title = "Play ambient sound";
      }
    };

    tryPlay();

    // Toggle (mute/play). We implement mute via audioEl.muted for instant toggle.
    if (audioToggle) {
      audioToggle.addEventListener('click', (ev) => {
        ev.preventDefault();
        // If audio has no sources, toggling will simply set muted attribute and change icon state.
        const isPlaying = !audioEl.paused && !audioEl.muted;
        if (audioEl.muted || audioEl.paused) {
          // try to play and unmute
          audioEl.muted = false;
          audioEl.volume = 0.12;
          audioEl.play().catch(() => { /* ignore play errors */ });
          audioToggle.setAttribute('aria-pressed', 'true');
          audioToggle.setAttribute('aria-label', 'Mute ambient sound');
          audioToggle.title = "Mute ambient sound";
          // update icon to "speaker" (we don't swap SVG here; keep it simple)
        } else {
          // mute it
          audioEl.muted = true;
          audioToggle.setAttribute('aria-pressed', 'false');
          audioToggle.setAttribute('aria-label', 'Unmute ambient sound');
          audioToggle.title = "Play ambient sound";
        }
      }, { passive: true });
    }
  } else {
    // If audio element not present, make the toggle just toggle an aria state for accessibility
    if (audioToggle) {
      audioToggle.addEventListener('click', (ev) => {
        const pressed = audioToggle.getAttribute('aria-pressed') === 'true';
        audioToggle.setAttribute('aria-pressed', String(!pressed));
      });
    }
  }

  // Small keyboard accessibility: Enter/Space on focused action will trigger click (native on button)
  // Shortcut: press "g" to focus the main action (progressive enhancement)
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'g' || ev.key === 'G') {
      if (instaBtn) instaBtn.focus();
    }
  });
});

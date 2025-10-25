// zincmusic - Single-file React component (App.jsx)
// Instructions:
// 1. Create a Spotify app at https://developer.spotify.com/dashboard and set Redirect URI to:
//    https://zinc.qzz.io/zincmusic (and/or http://localhost:3000 for local dev)
// 2. Copy your Client ID into the CLIENT_ID constant below.
// 3. This implements Authorization Code with PKCE (no client secret required) entirely client-side.
// 4. The Spotify Web Playback SDK requires the page to be served over HTTPS and the user to have Spotify Premium.
// 5. For users without Premium, the UI will fallback to playing track.preview_url (30s) where available.
// 6. Deploy the built files to zinc.qzz.io/zincmusic (ensure HTTPS, CORS settings okay).

import React, { useEffect, useState, useRef } from "react";

// ----- CONFIG -----
const CLIENT_ID = "b72fe73d455a42739b73dfbcbe604d70"; // <--- put your Spotify Client ID here
const REDIRECT_URI = window.location.origin + window.location.pathname; // must match registered redirect URI
const SCOPES = [
  "streaming",
  "user-read-email",
  "user-read-private",
  "user-modify-playback-state",
  "user-read-playback-state",
  "playlist-read-private",
  "playlist-read-collaborative",
  "user-library-read",
  "user-read-currently-playing",
].join(" ");

// ----- PKCE helpers -----
async function sha256(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(hash);
}

function base64UrlEncode(bytes) {
  let s = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function generateCodeChallenge(codeVerifier) {
  const hashed = await sha256(codeVerifier);
  return base64UrlEncode(hashed);
}

function generateRandomString(length = 64) {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return base64UrlEncode(array).slice(0, length);
}

// ----- Auth flow -----
function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {}
}
function readFromStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    return null;
  }
}

async function startAuth() {
  const codeVerifier = generateRandomString(64);
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  saveToStorage("pkce_code_verifier", codeVerifier);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    scope: SCOPES,
    redirect_uri: REDIRECT_URI,
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
  });

  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

async function exchangeCodeForToken(code) {
  // Authorization Code with PKCE requires a POST to https://accounts.spotify.com/api/token
  // This endpoint does NOT allow CORS (Spotify blocks browsers from sending client-side token exchange).
  // Workaround: You must run a tiny server-side proxy to exchange the code for an access token.
  // For demo purposes we'll attempt a direct fetch — if it fails, user must deploy a tiny backend.

  const codeVerifier = readFromStorage("pkce_code_verifier");
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID,
    code_verifier: codeVerifier,
  }).toString();

  // Note: Browsers are often blocked by CORS on this endpoint. If you get a CORS error,
  // create a minimal server endpoint that proxies this POST request server-side and returns JSON.

  const resp = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Token exchange failed: ${resp.status} ${text}`);
  }

  return resp.json();
}

// ----- Main React Component -----
export default function ZincMusic() {
  const [token, setToken] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [tracks, setTracks] = useState([]);
  const [playingTrack, setPlayingTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);

  const playerRef = useRef(null);
  const progressTimerRef = useRef(null);

  useEffect(() => {
    // On mount: handle redirect with code param
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");

    if (error) {
      console.error("Spotify auth error:", error);
    }

    const saved = readFromStorage("spotify_token");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.access_token && new Date().getTime() < parsed.expires_at) {
        setToken(parsed.access_token);
        return;
      }
    }

    if (code) {
      // remove code param from URL to keep things clean
      url.searchParams.delete("code");
      window.history.replaceState({}, document.title, url.toString());

      exchangeCodeForToken(code)
        .then((data) => {
          // store token with expiry
          const expiresAt = new Date().getTime() + data.expires_in * 1000;
          const toSave = { ...data, expires_at: expiresAt };
          saveToStorage("spotify_token", JSON.stringify(toSave));
          setToken(data.access_token);
        })
        .catch((err) => {
          console.error(err);
          alert("Token exchange failed. See console. You likely need a tiny server-side proxy for /api/token due to Spotify CORS rules.");
        });
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    // load Spotify Web Playback SDK
    if (!window.Spotify) {
      const tag = document.createElement("script");
      tag.src = "https://sdk.scdn.co/spotify-player.js";
      tag.async = true;
      document.body.appendChild(tag);
    }

    window.onSpotifyWebPlaybackSDKReady = () => {
      const player = new window.Spotify.Player({
        name: "ZincMusic Player",
        getOAuthToken: (cb) => cb(token),
        volume: 0.8,
      });

      player.addListener("initialization_error", ({ message }) => console.error(message));
      player.addListener("authentication_error", ({ message }) => console.error(message));
      player.addListener("account_error", ({ message }) => console.error(message));
      player.addListener("playback_error", ({ message }) => console.error(message));

      player.addListener("player_state_changed", (state) => {
        if (!state) return;
        const currentTrack = state.track_window.current_track;
        setPlayingTrack({
          id: currentTrack.id,
          name: currentTrack.name,
          artists: currentTrack.artists.map((a) => a.name).join(", "),
          album: currentTrack.album.name,
          image: currentTrack.album.images[0]?.url,
        });
        setIsPlaying(!state.paused);
        setPositionMs(state.position);
        setDurationMs(state.duration);
      });

      player.addListener("ready", ({ device_id }) => {
        console.log("Ready with Device ID", device_id);
        setDeviceId(device_id);
        setPlayerReady(true);
      });

      player.addListener("not_ready", ({ device_id }) => {
        console.log("Device ID has gone offline", device_id);
        setPlayerReady(false);
      });

      player.connect();
      playerRef.current = player;
    };
  }, [token]);

  useEffect(() => {
    // cleanup on unmount
    return () => {
      if (playerRef.current) playerRef.current.disconnect();
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, []);

  async function search(q) {
    if (!token) return;
    const res = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=12`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setTracks(data.tracks.items || []);
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    if (!searchQuery) return;
    search(searchQuery);
  }

  async function playOnSpotify(uri) {
    if (!token) return alert("Not authenticated");
    if (!deviceId) {
      alert("Spotify Player not ready. Make sure you have a premium Spotify account and allow the player to start.");
      return;
    }

    const body = { uris: [uri] };
    await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  function playPreview(url) {
    // fallback for non-premium accounts
    if (!url) return alert("No preview available for this track.");
    const audio = new Audio(url);
    audio.play();
    setIsPlaying(true);
    setPlayingTrack((t) => ({ ...t, previewing: true }));
    audio.addEventListener("ended", () => setIsPlaying(false));
  }

  function handlePlayPause() {
    if (!playerRef.current) return;
    playerRef.current.togglePlay().catch(console.error);
  }

  function formatMs(ms) {
    if (!ms && ms !== 0) return "0:00";
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl bg-white shadow-lg rounded-2xl overflow-hidden">
        <header className="p-6 flex items-center justify-between border-b">
          <div>
            <h1 className="text-2xl font-semibold">zincmusic</h1>
            <p className="text-sm text-gray-500">Clean, neat Spotify-powered music player</p>
          </div>
          <div className="flex items-center gap-3">
            {!token ? (
              <button className="px-4 py-2 rounded-lg bg-indigo-600 text-white" onClick={startAuth}>
                Connect Spotify
              </button>
            ) : (
              <div className="text-sm text-green-600">Connected</div>
            )}
          </div>
        </header>

        <main className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <section className="md:col-span-2">
            <form onSubmit={handleSearchSubmit} className="mb-4">
              <div className="flex gap-2">
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Spotify tracks, artists, albums..."
                  className="flex-1 rounded-lg border px-4 py-2 focus:outline-none"
                />
                <button type="submit" className="px-4 py-2 rounded-lg bg-gray-900 text-white">
                  Search
                </button>
              </div>
            </form>

            <div className="space-y-3">
              {tracks.length === 0 ? (
                <div className="text-gray-500">Search to find tracks to play.</div>
              ) : (
                tracks.map((t) => (
                  <div key={t.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50">
                    <img src={t.album.images[2]?.url} alt="art" className="w-16 h-16 rounded-md object-cover" />
                    <div className="flex-1">
                      <div className="font-medium">{t.name}</div>
                      <div className="text-sm text-gray-500">{t.artists.map((a) => a.name).join(", ")}</div>
                      <div className="text-xs text-gray-400">{t.album.name}</div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => playOnSpotify(t.uri)}
                        className="px-3 py-2 rounded-md border text-sm"
                      >
                        Play (Spotify)
                      </button>
                      <button
                        onClick={() => playPreview(t.preview_url)}
                        className="px-3 py-2 rounded-md border text-sm"
                      >
                        Preview
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <aside className="bg-gray-50 p-4 rounded-xl">
            <div className="flex flex-col items-center text-center">
              {playingTrack ? (
                <>
                  {playingTrack.image && (
                    <img src={playingTrack.image} alt="album" className="w-40 h-40 rounded-md mb-3 object-cover" />
                  )}
                  <div className="font-semibold">{playingTrack.name}</div>
                  <div className="text-sm text-gray-500">{playingTrack.artists}</div>
                  <div className="text-xs text-gray-400 mt-2">{playingTrack.album}</div>

                  <div className="w-full mt-4">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div>{formatMs(positionMs)}</div>
                      <div>{formatMs(durationMs)}</div>
                    </div>
                    <div className="w-full bg-white rounded-full h-2 mt-2 overflow-hidden border">
                      <div
                        style={{ width: durationMs ? `${(positionMs / durationMs) * 100}%` : "0%" }}
                        className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-pink-500"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 mt-4">
                    <button onClick={handlePlayPause} className="px-4 py-2 rounded-lg bg-gray-900 text-white">
                      {isPlaying ? "Pause" : "Play"}
                    </button>
                    <button
                      onClick={() => {
                        if (deviceId) {
                          window.open("https://open.spotify.com", "_blank");
                        } else {
                          alert("Player not ready");
                        }
                      }}
                      className="px-4 py-2 rounded-lg border"
                    >
                      Open Spotify
                    </button>
                  </div>

                  <div className="text-xs text-gray-400 mt-3">Player Status: {playerReady ? "Ready" : "Not connected"}</div>
                </>
              ) : (
                <div className="text-sm text-gray-600">No track playing. Search and tap Play.</div>
              )}
            </div>

            <div className="mt-6 text-xs text-gray-500">
              <p>Notes:</p>
              <ul className="list-disc list-inside">
                <li>Spotify Web Playback SDK requires Premium and HTTPS.</li>
                <li>If token exchange fails due to CORS, run a simple server-side proxy for /api/token.</li>
                <li>Replace CLIENT_ID at the top with your Spotify App's client ID.</li>
              </ul>
            </div>
          </aside>
        </main>

        <footer className="p-4 text-center text-xs text-gray-400 border-t">zinc.qzz.io/zincmusic</footer>
      </div>
    </div>
  );
}

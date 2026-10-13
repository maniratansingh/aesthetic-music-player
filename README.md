# MRPS MUSIC — Web Audio Player & Vinyl Turntable

A sleek, glassmorphic web audio player featuring an interactive vinyl turntable simulation, WebGL 2.0 ambient procedural shader, and responsive mobile interface. Built with vanilla HTML, modern CSS, WebGL 2.0 shaders, and clean client-side JavaScript — zero build steps, bundlers, or heavyweight frameworks required.

- **Live Web Player:** [https://maniratansingh.github.io/aesthetic-music-player/](https://maniratansingh.github.io/aesthetic-music-player/)
- **Recommended Custom Domain:** `music.mrps.in`
- **Branding:** MRPS MUSIC ([mrps.in](https://mrps.in))

---

## Highlights & Features

### 1. Structured Playlist Management
* **Modular Playlist Data (`assets/js/data.js`):** Organized playlist schema supporting category tags, custom track collections, and metadata objects (title, artist, duration, artwork URL, and stream identifier).
* **Responsive Category Navigation:** Dynamic playlist drawer with category pills, live active indicators, and synchronized track counts.
* **Extensible Schema:** Easily customized or populated via local configuration files or external playlist endpoints.

---

### 2. Audio Playback Engine & Direct Single-Track Resolution
* **Single-Track Embed Architecture:** Every playlist entry references a verified single-track embed ID with authentic duration and metadata, avoiding uncurated multi-hour compilations.
* **Direct Track Resolution:** Direct ID mapping provides reliable single-item queue playback without nested search playlists.
* **Standard Viewport-Safe Embedding (`.yt-audio-frame`):** Anchors the player container inside the viewport (`bottom: 12px; right: 12px; width: 240px; height: 140px; opacity: 0.001; z-index: -10`) following standard third-party embed viewability guidelines to prevent browser background throttling and playback interruption.
* **Standard Player Lifecycle:** Follows official embedded player lifecycle events (`onReady`, `onStateChange`, `onError`) for reliable state transitions.

---

### 3. Android Auto & Vehicle Integration
* **W3C Media Session API:**
  - **Steering Wheel Buttons:** Next Track (`nexttrack`), Previous Track (`previoustrack`), Play (`play`), and Pause (`pause`).
  - **Dashboard 10s Skips:** Fast-forward and rewind via `seekforward` and `seekbackward`.
  - **Vehicle Touchscreen Scrubbing:** Direct seek support via `seekto`.
  - **Graceful Shutdown:** Clean playback teardown via `stop`.
* **Live Dashboard Position Scrubber:** Continuously feeds duration and elapsed position into `navigator.mediaSession.setPositionState()`, illuminating the progress bar on car infotainment screens.
* **Multi-Resolution Car Artwork:** Feeds responsive artwork icons (`96x96`, `128x128`, `192x192`, `256x256`, `384x384`, `512x512`, `600x600`) and album metadata for vehicle displays and Bluetooth AVRCP.
* **Screen Wake Lock API:** Prevents mobile and in-car browser tabs from sleeping during highway driving (`navigator.wakeLock`).

---

### 4. Chrome PWA & WebAPK Installation ("Install as App")
* **Full PWA Installability:** Fully compliant with Google Chrome's WebAPK installation criteria.
* **Service Worker (`sw.js`):** Pre-caches the app shell, styling, icons, and curated data with a stale-while-revalidate strategy while streaming external audio without interference.
* **Web App Manifest (`manifest.webmanifest`):**
  - Standalone display (`display: standalone`) removing all browser URL bars.
  - Theme color `#0a0a0c`.
  - Scalable vector icon ([`assets/icons/icon.svg`](file:///Users/mrps/Documents/YOU/assets/icons/icon.svg)) and raster icons (`192x192` & `512x512` with maskable purpose).
* **Installation Guide:**
  1. Open site in Chrome on Android.
  2. Tap the three dots (⋮) → tap **Install app**.
  3. The app installs directly into your Android App Drawer as a native WebAPK.

---

### 5. Mobile Friendly & Responsive UI
* **Fluid `100dvh` Viewport:** Uses dynamic viewport height units across the layout, eliminating address-bar jumping and unwanted scrollbars on iOS Safari and Android Chrome.
* **Notch & Safe-Area Insets:** Supports `viewport-fit=cover` and CSS `env(safe-area-inset-top)` / `env(safe-area-inset-bottom)` across top headers, drawers, and sheets.
* **Frosted Modal Backdrops:**
  - `#sidebar-backdrop`: Tap anywhere outside the playlist drawer to dismiss.
  - `#queue-backdrop`: Tap outside the queue bottom sheet to slide it closed.
* **Compact Phone Ergonomics (≤ 480px):**
  - Turntable platter scales smoothly to `clamp(145px, 46vw, 210px)`.
  - Tonearm scales down proportionally (`scale: 0.74`) to prevent horizontal overflow.
  - Touch targets maintain the 44px minimum for effortless mobile tapping.

---

### 6. Universal Search & Track Discovery
* **Multi-Tier Search Resolution:**
  1. **Local Catalog Index:** Instant local search across active playlist items with zero latency.
  2. **Public Metadata Search API:** High-speed client-side metadata retrieval returning high-resolution artwork, track durations, artists, and collections.
  3. **Direct Single-Track Resolver:** Track stream resolution with single-item filter to identify verified media IDs without API keys.
* **Typo & Phonetic Correction:**
  - Auto-corrects common phonetic misspellings using Levenshtein distance matching.
  - Interactive "Showing results for..." correction banner with a one-click "Search instead for?" toggle.
* **Search Interface Features:**
  - **Top Result Card:** Prominent artist banner with avatar and one-click play action.
  - **Search Chips:** Quick-filter pills for popular genres and styles.
  - **Recent Search History:** Localized search history with single-click re-querying and item deletion.

---

### 7. Interactive Vinyl Turntable & Tonearm
* **Photorealistic Picture Disc:** Full-disc album art rotating dynamically with turntable motor speed, overlaid with subtle radial vinyl groove reflections and a centered spindle hole.
* **Realistic Mechanical Tonearm:** Complete turntable hardware featuring:
  - Counterweight, gimbal pivot, and jewel bearing cap.
  - S-shaped curved wand with bayonet lock collar.
  - Angled headshell, fingerlift, cartridge, and glowing stylus tip (`#fc3c44`).
* **Organic Physics:** Natural groove tracking wobble animation (`armTrackingWobble`) and needle suspension compliance (`needleCompliance`) during playback.
* **Smooth Needle Drop:** Tonearm physically swings onto the record rim upon play and returns to resting position on pause/stop.

---

### 8. Interactive Audio Scrubber & Queue
* **Interactive Progress Scrubber:** Seamless click-and-drag scrubbing with hover time tooltips and dynamic buffered bar.
* **Live Duration Timestamps:** Tabular elapsed time (`0:00`) and countdown remaining time (`-3:45`).
* **Sidebar Presentation:** Glassmorphic playlist cards with category badges, track counts, and live dancing animated equalizers.
* **Up Next Queue:**
  - Tabular two-digit track numbers (`01`, `02`).
  - Album art hover play overlays.
  - Dynamic 4-bar equalizer on the currently playing track.
  - One-click Queue Shuffle and "Jump to Playing Track" locator.

---

### 9. Liquid Glassmorphism & WebGL 2.0 Shader
* **WebGL 2.0 Simplex Fluid:** Hardware-accelerated dynamic ambient background shader (`shader.js`) featuring Inigo Quilez simplex noise and trigonometric warp waves.
* **Glassmorphic Paneling:** Frosted-glass containers (`backdrop-filter: blur(28px)`) with delicate specular highlights and accent styling (`#fc3c44`).

---

### 10. Controls, Shortcuts & Media Session
* **Keyboard Hotkeys:**
  - `Space` / `K` — Play / Pause
  - `J` — Seek backward 10 seconds
  - `L` — Seek forward 10 seconds
  - `M` — Mute / Unmute
  - `/` — Focus live search bar
  - `Esc` — Close search dropdown or queue drawer

---

## Project Structure

```text
.
├── index.html                           # Main player markup & responsive structure
├── manifest.webmanifest                 # PWA Web App Manifest & Android Auto configuration
├── sw.js                                # Service Worker with offline caching for WebAPK
├── _headers                             # Cloudflare Pages caching, security & MIME rules
├── assets/
│   ├── css/
│   │   └── styles.css                   # Glassmorphism styling, animations & 100dvh safe-area layout
│   ├── js/
│   │   ├── app.js                       # Audio engine, Media Session, search system & queue logic
│   │   ├── data.js                      # Playlist data and track catalog
│   │   └── shader.js                    # WebGL 2.0 procedural ambient background shader
│   └── icons/
│       ├── icon.svg                     # Scalable vector app icon
│       ├── icon-192.png                 # 192x192 PWA & mobile icon
│       └── icon-512.png                 # 512x512 Android Auto, WebAPK & splash icon
├── update_playlists.py                  # Python maintenance scraper with single-track duration filters
├── .github/
│   └── workflows/
│       └── update_playlists.yml         # GitHub Actions automated workflow
└── README.md                            # Comprehensive project documentation
```

---

## Deployment & Cloudflare Pages Setup

### Recommended Subdomain for `mrps.in`:
**`music.mrps.in`** (Clean, professional, and intuitive).

### Deploying to Cloudflare Pages:

#### Method 1: Direct Upload (Drag & Drop)
A clean, standalone upload folder and ZIP are pre-packaged:
* **Folder:** `/Users/mrps/Documents/cloudflare-upload`
* **ZIP Archive:** `/Users/mrps/Documents/cloudflare-upload.zip`
1. Go to Cloudflare Dashboard → **Workers & Pages** → **Create application** → **Pages** → **Direct Upload**.
2. Drag and drop the `cloudflare-upload` folder (or `cloudflare-upload.zip`).
3. Click **Deploy site**.
4. Go to **Custom domains** → enter `music.mrps.in`.

#### Method 2: Git Integration
1. Connect repository `maniratansingh/aesthetic-music-player` and select branch **`beta`** (or **`test`**).
2. **Build command:** *(leave empty)*
3. **Build output directory:** `/` *(or leave empty)*
4. Go to **Custom domains** → enter `music.mrps.in`.

---

## Architectural Summary

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Visual Effects** | WebGL 2.0 / GLSL ES 3.0 | Real-time procedural ambient background animation |
| **Catalog** | `window.RoadtripData` | Local playlist configuration with track metadata |
| **Search Metadata** | Public Search API | Fast public metadata with high-resolution album artwork |
| **Audio Stream** | Embedded Player API | Viewport-anchored media container (`.yt-audio-frame`) |
| **Track Resolution**| Public Resolver API | Direct single-track ID resolution |
| **Car Integration** | W3C Media Session API | Android Auto steering wheel, dashboard scrubber & Bluetooth AVRCP |
| **Mobile PWA** | WebAPK + Service Worker | Native installable Android app with offline caching (`sw.js`) |
| **Screen Wake Lock**| W3C Screen Wake Lock API | Prevents browser sleep during highway road trips |
| **CI Automation** | GitHub Actions + `yt-dlp` | Weekly scheduled maintenance with duration guardrails |

---

## Disclaimer

MRPS MUSIC is an independent, non-commercial open-source web application designed for personal use and UI design experimentation. This project:
- Does not host, store, or distribute any audio or video files.
- Does not advertise any music catalog, artist, or commercial music service.
- Does not offer or promise an uninterrupted media playback service or a modified third-party platform experience.
- Adheres to standard official third-party embed lifecycles and terms of service. All music rights, compositions, album artwork, and audio streams remain the intellectual property of their respective creators and copyright holders.

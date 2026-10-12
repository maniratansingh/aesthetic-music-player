# Aura — Aesthetic Music Player

A sleek, glassmorphic web music player marrying the refined visual aesthetics of Apple Music with the catalog and streaming power of YouTube. Built entirely with vanilla HTML, modern CSS, WebGL 2.0 shaders, and clean client-side JavaScript — zero build steps or heavyweight frameworks required.

Live Demo: **[https://maniratansingh.github.io/aesthetic-music-player/](https://maniratansingh.github.io/aesthetic-music-player/)**

---

## Highlights & Features

- **Liquid Glassmorphism & WebGL 2.0 Shader:**
  - Hardware-accelerated fluid background driven by a custom GLSL fragment shader (`shader.js`) featuring Inigo Quilez simplex noise and trigonometric wave warps.
  - Translucent frosted-glass panels (`backdrop-filter: blur(...)`) following modern Apple design guidelines with refined borders and specular highlights.

- **Interactive Vinyl Player & Tonearm:**
  - Full-disc 100% picture vinyl displaying high-resolution album artwork overlaid with subtle physical vinyl groove gradients.
  - Realistic animated mechanical tonearm that smoothly pivots onto the record during active playback and swings back to rest when paused or muted.

- **Universal Search with Dual-API Engine:**
  - **Apple Music (iTunes Search API):** Instant client-side metadata retrieval returning high-fidelity 600×600 album art, track timing, artist, and collection names without requiring API keys or backend servers.
  - **Invidious Privacy Proxy Network:** Overcomes YouTube embedded iframe search deprecations by resolving song titles directly into raw YouTube `videoId` strings via decentralized Invidious nodes (`invidious.f5.si`, `yt.chocolatemoo53.com`, `invidious.nerdvpn.de`) with automated multi-tier failover.

- **Curated Evergreen Library:**
  - 14 pre-scraped, timeless playlists spanning 350+ tracks:
    - *90s Evergreen Bollywood*, *Classic 70s & 80s Hits*, *Evergreen Romantic*, *Lata Mangeshkar Hits*, *Kishore Kumar Classics*, *Mohammad Rafi & Mukesh*, *Ghazals & Sufi*, *Evergreen 2000s Pop*, *Retro Workout Hits*, *90s English Pop*, *Evergreen Classic Rock*, *Golden Era Bollywood*, *Evergreen Sad Songs*, and *Nostalgic Lo-Fi*.

- **Automated Playlist Updates:**
  - Scheduled GitHub Actions workflow (`.github/workflows/update_playlists.yml`) that runs weekly to query YouTube via `yt-dlp` and automatically update track listings in `assets/js/data.js`.
  - Built-in data safety guardrails preventing accidental overwrites in the event of upstream network blocks.

- **Dedicated Controls & Media Session:**
  - Standalone **MUTE** button with Apple-red glowing active state (`#fc3c44`).
  - Native **Media Session API** support: control playback (Play, Pause, Next, Previous) and view high-res artwork on macOS Control Center, Windows Media Overlay, iOS Lock Screen, Android notifications, and Bluetooth headset controls.
  - iOS/Android audio engine unlock handling mobile browser autoplay restrictions.

- **Responsive Mobile Layout:**
  - Desktop: 3-column studio layout (Playlists Sidebar, Vinyl Turntable, Track Queue).
  - Mobile/Tablet: Slide-out navigation drawer, centralized vinyl turntable, and swipe-up queue sheet.

---

## Project Structure

```text
.
├── index.html                           # Main entry point and player markup
├── assets/
│   ├── css/
│   │   └── styles.css                   # Glassmorphism styling, layout, animations & responsive queries
│   └── js/
│       ├── app.js                       # Player state, search, audio engine & Media Session integration
│       ├── shader.js                    # WebGL 2.0 dynamic fluid shader background
│       └── data.js                      # Curated playlists and offline track metadata
├── update_playlists.py                  # Python automation script powered by yt-dlp
├── .github/
│   └── workflows/
│       └── update_playlists.yml         # Weekly automated GitHub Actions pipeline
└── README.md                            # Project documentation
```

---

## Getting Started

### 1. Run Locally
Because the player is built with static web standards, no compilation or bundler is necessary:

```bash
# Using Python's built-in HTTP server:
python3 -m http.server 8080

# Or using Node's serve:
npx serve .
```

Open `http://localhost:8080` in any modern web browser (Safari, Chrome, Firefox, Edge).

### 2. Updating Playlists Locally
If you want to refresh the built-in playlists or add custom queries:

```bash
# Ensure yt-dlp is installed
pip install yt-dlp

# Run the playlist builder
python3 update_playlists.py
```

This updates `assets/js/data.js` cleanly with the latest YouTube tracks.

---

## Architecture & API Overview

| Component | Provider / Standard | Purpose |
| :--- | :--- | :--- |
| **Visual Effects** | WebGL 2.0 / GLSL ES 3.0 | Real-time procedural ambient background animation |
| **Metadata & Art** | Apple iTunes Search API | Public CORS-enabled search for clean titles and 600×600 album artwork |
| **Audio Engine** | YouTube IFrame API | Invisible media playback engine |
| **Search Resolver**| Invidious REST API | Resolves song search queries into direct YouTube video IDs with zero API keys |
| **OS Media Keys**  | W3C Media Session API | System-level lock screen, keyboard multimedia keys, and Bluetooth hardware controls |
| **Automation**     | GitHub Actions + `yt-dlp` | Weekly automated scraping and GitHub Pages updates |

---

## License

Created for personal and non-commercial educational enjoyment. All music rights, album art, and audio streams remain the intellectual property of their respective creators and copyright holders.

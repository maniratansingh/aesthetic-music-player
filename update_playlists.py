#!/usr/bin/env python3
"""
MRPS MUSIC - Automated Hindi Evergreen Playlist Updater
Scrapes verified single-track YouTube audio for pure Hindi Evergreen playlists.
"""
import json, subprocess, sys, shutil, os

def get_ytdlp_cmd():
    which_bin = shutil.which("yt-dlp")
    if which_bin:
        return [which_bin]
    script_dir = os.path.dirname(os.path.abspath(__file__))
    venv_bin = os.path.join(script_dir, "venv", "bin", "yt-dlp")
    if os.path.exists(venv_bin):
        return [venv_bin]
    return [sys.executable, "-m", "yt_dlp"]

PLAYLISTS = [
    {
        "title": "90s Evergreen Bollywood",
        "category": "90s Melodies",
        "icon": "🎵",
        "query": "90s bollywood hit songs official audio"
    },
    {
        "title": "Kishore Kumar Classics",
        "category": "Evergreen Legends",
        "icon": "👑",
        "query": "kishore kumar hit songs official audio remastered"
    },
    {
        "title": "Lata Mangeshkar Melodies",
        "category": "Golden Voices",
        "icon": "🌹",
        "query": "lata mangeshkar hit songs official audio"
    },
    {
        "title": "Mohammad Rafi & Mukesh",
        "category": "Golden Voices",
        "icon": "🎙️",
        "query": "mohammad rafi mukesh hit songs official audio"
    },
    {
        "title": "R.D. Burman Pancham Magic",
        "category": "Retro Legends",
        "icon": "🎷",
        "query": "rd burman hit songs pancham official audio"
    },
    {
        "title": "Evergreen Romantic Hits",
        "category": "Love & Romance",
        "icon": "❤️",
        "query": "evergreen bollywood romantic songs official audio"
    },
    {
        "title": "A.R. Rahman Masterpieces",
        "category": "Modern Classics",
        "icon": "🌟",
        "query": "ar rahman bollywood hit songs audio"
    },
    {
        "title": "2000s Bollywood Nostalgia",
        "category": "2000s Golden Era",
        "icon": "💫",
        "query": "2000s bollywood nostalgia hit songs audio"
    },
    {
        "title": "Soulful Ghazals & Sufi",
        "category": "Sukoon & Soul",
        "icon": "🕊️",
        "query": "best ghazals sufi songs jagjit singh nusrat official audio"
    },
    {
        "title": "Evergreen Monsoon Melodies",
        "category": "Monsoon Vibes",
        "icon": "🌧️",
        "query": "bollywood monsoon rain songs evergreen audio"
    },
    {
        "title": "Sadabahar Dard-e-Dil",
        "category": "Dard & Melancholy",
        "icon": "💔",
        "query": "sadabahar purane dard bhare geet audio"
    },
    {
        "title": "Golden Retro Roadtrip",
        "category": "Roadtrip Classics",
        "icon": "🚗",
        "query": "golden retro roadtrip bollywood travel songs audio"
    },
    {
        "title": "High-Energy Retro Dance",
        "category": "Retro Energy",
        "icon": "🔥",
        "query": "retro bollywood dance hits audio"
    },
    {
        "title": "Bollywood Acoustic & Lo-Fi",
        "category": "Chill & Unplugged",
        "icon": "🌙",
        "query": "bollywood acoustic lofi chill songs audio"
    }
]

def fetch(query):
    ytdlp_cmd = get_ytdlp_cmd()
    print(f"  Searching '{query}' using {' '.join(ytdlp_cmd)} ...")
    try:
        r = subprocess.run(
            ytdlp_cmd + [f"ytsearch20:{query}", "--flat-playlist", "-J"],
            capture_output=True, text=True, check=True, timeout=180
        )
        data = json.loads(r.stdout)
        tracks = []
        for e in data.get("entries", []):
            vid = e.get("id", "")
            if not vid: continue
            dur = e.get("duration") or 0
            # Guard against long jukebox compilations (> 12 min) or ultra-short promos (< 90 sec)
            if dur < 90 or dur > 720:
                continue
            title = e.get("title", "Unknown")
            uploader = e.get("uploader") or "Bollywood Classic"
            m, s = divmod(int(dur), 60)
            thumb = f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg"
            tracks.append({
                "videoId": vid,
                "title": title,
                "artist": uploader,
                "duration": f"{m}:{s:02d}",
                "thumbnail": thumb
            })
            if len(tracks) >= 16:
                break
        print(f"    -> {len(tracks)} verified single tracks")
        return tracks
    except Exception as ex:
        print(f"    ERROR: {ex}")
        return []

def main():
    # If data.js already has high-quality curated tracks, preserve them unless explicitly force-updated
    if os.path.exists("assets/js/data.js") and "--force" not in sys.argv:
        print("assets/js/data.js already exists. Pass --force to regenerate all playlists.")
        return

    playlists_out = []
    total_tracks = 0
    for pl in PLAYLISTS:
        print(f"\n{pl['title']} ({pl['category']})")
        tracks = fetch(pl["query"])
        if not tracks:
            continue
        total_tracks += len(tracks)
        playlists_out.append({
            "title": pl["title"],
            "category": pl["category"],
            "icon": pl["icon"],
            "youtubeListId": "",
            "tracks": tracks
        })

    if not playlists_out or total_tracks == 0:
        print("\nERROR: No tracks were successfully fetched! Aborting to prevent wiping data.js.")
        sys.exit(1)

    output = f"window.RoadtripData = {{\n    playlists: {json.dumps(playlists_out, ensure_ascii=False, indent=8)}\n}};\n"

    with open("assets/js/data.js", "w", encoding="utf-8") as f:
        f.write(output)

    print(f"\n data.js written cleanly! ({len(playlists_out)} playlists, {total_tracks} tracks)")

if __name__ == "__main__":
    main()

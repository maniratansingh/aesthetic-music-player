#!/usr/bin/env python3
import json, subprocess, sys, shutil, os

def get_ytdlp_cmd():
    # 1. yt-dlp on system PATH (GitHub Actions, global install)
    which_bin = shutil.which("yt-dlp")
    if which_bin:
        return [which_bin]
    # 2. Local virtualenv in workspace
    script_dir = os.path.dirname(os.path.abspath(__file__))
    venv_bin = os.path.join(script_dir, "venv", "bin", "yt-dlp")
    if os.path.exists(venv_bin):
        return [venv_bin]
    # 3. Python module fallback
    return [sys.executable, "-m", "yt_dlp"]

PLAYLISTS = [
    {"title": "90s Evergreen Bollywood", "query": "90s evergreen bollywood hit songs audio"},
    {"title": "Classic 70s & 80s Hits",  "query": "classic oldies 70s 80s english hit songs audio"},
    {"title": "Evergreen Romantic",      "query": "evergreen romantic hindi songs audio"},
    {"title": "Lata Mangeshkar Hits",    "query": "lata mangeshkar hit songs old hindi"},
    {"title": "Kishore Kumar Classics",  "query": "kishore kumar hit songs old evergreen"},
    {"title": "Mohammad Rafi & Mukesh",  "query": "mohammad rafi mukesh hit songs old hindi"},
    {"title": "Ghazals & Sufi",          "query": "best ghazals sufi songs evergreen"},
    {"title": "Evergreen 2000s Pop",     "query": "2000s pop hits english evergreen audio"},
    {"title": "Retro Workout Hits",      "query": "retro workout songs bollywood english"},
    {"title": "90s English Pop",         "query": "90s english pop songs evergreen hits audio"},
    {"title": "Evergreen Classic Rock",  "query": "classic rock hits 70s 80s evergreen audio"},
    {"title": "Golden Era Bollywood",    "query": "golden era bollywood songs 60s 70s hits audio"},
    {"title": "Evergreen Sad Songs",     "query": "evergreen sad songs hindi bollywood oldies"},
    {"title": "Nostalgic Lofi",          "query": "nostalgic lofi bollywood songs evergreen remix"},
]

def fetch(query):
    ytdlp_cmd = get_ytdlp_cmd()
    print(f"  Searching '{query}' using {' '.join(ytdlp_cmd)} ...")
    try:
        r = subprocess.run(
            ytdlp_cmd + [f"ytsearch25:{query}", "--flat-playlist", "-J"],
            capture_output=True, text=True, check=True, timeout=180
        )
        data = json.loads(r.stdout)
        tracks = []
        for e in data.get("entries", []):
            vid   = e.get("id", "")
            if not vid: continue
            title = e.get("title", "Unknown")
            dur   = e.get("duration") or 0
            m, s  = divmod(int(dur), 60)
            thumb = f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg"
            tracks.append({
                "videoId": vid,
                "title": title,
                "artist": "YouTube",
                "duration": f"{m}:{s:02d}",
                "thumbnail": thumb
            })
        print(f"    -> {len(tracks)} tracks")
        return tracks
    except Exception as ex:
        print(f"    ERROR: {ex}")
        return []

def main():
    playlists_js = []
    total_tracks = 0
    for pl in PLAYLISTS:
        print(f"\n{pl['title']}")
        tracks = fetch(pl["query"])
        if not tracks:
            continue
        total_tracks += len(tracks)
        tracks_json = json.dumps(tracks, ensure_ascii=False, indent=12)
        pl_js = f"""        {{
            title: {json.dumps(pl['title'])},
            youtubeListId: "",
            tracks: {tracks_json}
        }}"""
        playlists_js.append(pl_js)

    if not playlists_js or total_tracks == 0:
        print("\nERROR: No tracks were successfully fetched! Aborting to prevent wiping data.js.")
        sys.exit(1)

    output = "window.RoadtripData = {\n    playlists: [\n"
    output += ",\n".join(playlists_js)
    output += "\n    ]\n};\n"

    with open("assets/js/data.js", "w", encoding="utf-8") as f:
        f.write(output)

    print(f"\n data.js written cleanly! ({len(playlists_js)} playlists, {total_tracks} tracks)")

if __name__ == "__main__":
    main()

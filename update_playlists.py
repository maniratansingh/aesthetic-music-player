#!/usr/bin/env python3
import json, subprocess, sys

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
    print(f"  Searching '{query}' ...")
    try:
        r = subprocess.run(
            ["venv/bin/yt-dlp", f"ytsearch25:{query}", "--flat-playlist", "-J"],
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

playlists_js = []
for pl in PLAYLISTS:
    print(f"\n{pl['title']}")
    tracks = fetch(pl["query"])
    if not tracks:
        continue
    tracks_json = json.dumps(tracks, ensure_ascii=False, indent=12)
    pl_js = f"""        {{
            title: {json.dumps(pl['title'])},
            youtubeListId: "",
            tracks: {tracks_json}
        }}"""
    playlists_js.append(pl_js)

output = "window.RoadtripData = {\n    playlists: [\n"
output += ",\n".join(playlists_js)
output += "\n    ]\n};\n"

with open("assets/js/data.js", "w", encoding="utf-8") as f:
    f.write(output)

print("\n data.js written cleanly!")

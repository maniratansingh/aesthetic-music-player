(function () {
    'use strict';

    const data = window.RoadtripData;
    if (!data) return;

    

    
    // ─── Media Session API (Hardware Media Keys) ───
    if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', () => {
            if (ytPlayer && playerReady) {
                ytPlayer.playVideo();
            }
        });
        navigator.mediaSession.setActionHandler('pause', () => {
            if (ytPlayer && playerReady) {
                ytPlayer.pauseVideo();
            }
        });
        navigator.mediaSession.setActionHandler('previoustrack', () => {
            if (!currentPl) return;
            playTrack((currentIdx - 1 + currentPl.tracks.length) % currentPl.tracks.length);
        });
        navigator.mediaSession.setActionHandler('nexttrack', () => {
            if (!currentPl) return;
            playTrack((currentIdx + 1) % currentPl.tracks.length);
        });
    }

    
    // ─── Mobile Audio Unlock ────────────────────
    let audioUnlocked = false;
    document.addEventListener('click', () => {
        if (audioUnlocked || !playerReady || !ytPlayer) return;
        audioUnlocked = true;
        // Unlocks iOS/Safari media engine by playing during a direct gesture
        ytPlayer.playVideo();
        setTimeout(() => {
            // Only pause if a real track hasn't started playing!
            if (!isPlaying) ytPlayer.pauseVideo();
        }, 250);
    });

    // ─── Elements ───────────────────────────────
    const playlistNav     = document.getElementById('playlist-nav');
    const trackList       = document.getElementById('track-list');
    const trackTitle      = document.getElementById('track-title');
    const trackArtist     = document.getElementById('track-artist');
    const diskEl          = document.getElementById('disk');
    const diskLabel       = document.getElementById('disk-label');
    const btnPlay         = document.getElementById('btn-play');
    const btnPrev         = document.getElementById('btn-prev');
    const btnNext         = document.getElementById('btn-next');
    const iconPlay        = document.getElementById('icon-play');
    const iconPause       = document.getElementById('icon-pause');
                const sidebar         = document.getElementById('sidebar');
    const sidebarBackdrop = document.getElementById('sidebar-backdrop');
    const queue           = document.getElementById('queue');
    const queueCount      = document.getElementById('queue-count');
    const btnMenu         = document.getElementById('btn-menu');
    
    const btnQueueMobile  = document.getElementById('btn-queue-mobile');
    const btnCloseQueue   = document.getElementById('btn-close-queue');
    const mobilePlName    = document.getElementById('mobile-playlist-name');

    // ─── Scrubber Elements ───────────────────────
    const scrubberTrack   = document.getElementById('scrubber-track');
    const scrubberFill    = document.getElementById('scrubber-fill');
    const scrubberThumb   = document.getElementById('scrubber-thumb');
    const timeCurrent     = document.getElementById('time-current');
    const timeTotal       = document.getElementById('time-total');

    // ─── State ──────────────────────────────────
    let currentPl         = null;
    let currentIdx        = 0;
    let isPlaying         = false;
    let ytPlayer          = null;
    let playerReady       = false;
    let isScrubbing       = false;
    let progressInterval  = null;

    function formatSec(sec) {
        if (!sec || isNaN(sec) || sec < 0) return "0:00";
        const s = Math.floor(sec);
        const m = Math.floor(s / 60);
        const rem = s % 60;
        return `${m}:${rem.toString().padStart(2, '0')}`;
    }

    function updateProgress(currentTime, duration) {
        if (isScrubbing) return;
        if (!scrubberFill || !scrubberThumb) return;
        if (!duration || duration <= 0) {
            scrubberFill.style.width = '0%';
            scrubberThumb.style.left = '0%';
            if (timeCurrent) timeCurrent.textContent = '0:00';
            return;
        }
        const pct = Math.min(100, Math.max(0, (currentTime / duration) * 100));
        scrubberFill.style.width = `${pct}%`;
        scrubberThumb.style.left = `${pct}%`;
        if (timeCurrent) timeCurrent.textContent = formatSec(currentTime);
        if (timeTotal) timeTotal.textContent = formatSec(duration);
    }

    function startProgressTicker() {
        stopProgressTicker();
        progressInterval = setInterval(() => {
            if (ytPlayer && playerReady && isPlaying) {
                try {
                    const cur = ytPlayer.getCurrentTime();
                    const dur = ytPlayer.getDuration();
                    updateProgress(cur, dur);
                } catch (e) {}
            }
        }, 350);
    }

    function stopProgressTicker() {
        if (progressInterval) {
            clearInterval(progressInterval);
            progressInterval = null;
        }
    }
    
    // ─── Search YouTube ──────────────────────────
    const searchInput = document.getElementById('search-input');
    const btnSearch   = document.getElementById('btn-search');
    

    // ─── Build playlist nav ──────────────────────
    function renderPlaylistNav() {
        playlistNav.innerHTML = '';
        data.playlists.forEach((pl, i) => {
            const el = document.createElement('div');
            el.className = 'playlist-item';
            el.textContent = pl.title;
            el.addEventListener('click', () => {
                document.querySelectorAll('.playlist-item').forEach(x => x.classList.remove('active'));
                el.classList.add('active');
                sidebar.classList.remove('open');
                loadPlaylist(i);
            });
            playlistNav.appendChild(el);
        });
        const activeIdx = data.playlists.indexOf(currentPl);
        if (activeIdx >= 0 && playlistNav.children[activeIdx]) {
            playlistNav.children[activeIdx].classList.add('active');
        }
    }

    function formatTime(ms) {
        if (!ms) return "0:00";
        const totalSeconds = Math.floor(ms / 1000);
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    async function doSearch() {
        const q = searchInput.value.trim();
        if (!q || !ytPlayer || !playerReady) return;
        
        searchInput.placeholder = "Searching...";
        const oldVal = searchInput.value;
        searchInput.value = '';
        
        try {
            const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&limit=30&media=music`);
            const json = await res.json();
            
            if (json.results && json.results.length > 0) {
                const searchPl = {
                    title: `Search: ${q}`,
                    tracks: json.results.map(r => ({
                        title: r.trackName,
                        artist: r.artistName,
                        thumbnail: (r.artworkUrl100 || '').replace('100x100bb', '600x600bb'),
                        duration: formatTime(r.trackTimeMillis)
                    }))
                };
                
                const existingIdx = data.playlists.findIndex(p => p.title.startsWith('Search:'));
                if (existingIdx >= 0) {
                    data.playlists[existingIdx] = searchPl;
                    renderPlaylistNav();
                    loadPlaylist(existingIdx);
                } else {
                    data.playlists.unshift(searchPl);
                    renderPlaylistNav();
                    loadPlaylist(0);
                }
                
                

            } else {
                alert('No results found for: ' + q);
            }
        } catch (e) {
            console.error(e);
            alert('Search failed. Please try again.');
        }
        
        // Mobile UX: Close the sidebar so they can see the vinyl player!
        if (sidebar && sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
        }
        
        searchInput.placeholder = "Search YouTube...";
        searchInput.blur(); // Hide mobile keyboard
    }

    if (btnSearch) {
        btnSearch.addEventListener('click', doSearch);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') doSearch();
        });
    }

    // Auto-select first
    renderPlaylistNav();
    if (data.playlists.length) {
        playlistNav.firstChild.classList.add('active');
        loadPlaylist(0);
    }

    // ─── Playlist loading ────────────────────────
    function loadPlaylist(idx) {
        currentPl  = data.playlists[idx];
        currentIdx = 0;
        mobilePlName.textContent = currentPl.title;
        renderQueue();
        syncMeta();
        if (playerReady) playTrack(0);
    }

    // ─── Queue rendering ─────────────────────────
    function renderQueue() {
        trackList.innerHTML = '';
        if (queueCount && currentPl) {
            queueCount.textContent = `${currentPl.tracks.length} tracks`;
        }
        currentPl.tracks.forEach((t, i) => {
            const el = document.createElement('div');
            el.className = 'track-item' + (i === currentIdx ? ' active' : '');
            el.innerHTML = `
                <img class="ti-thumb" src="${t.thumbnail || ''}" alt="" onerror="this.style.display='none'">
                <div class="ti-info">
                    <div class="ti-title">
                        <span class="ti-name">${clean(t.title)}</span>
                        <div class="eq"><div class="eq-bar"></div><div class="eq-bar"></div><div class="eq-bar"></div></div>
                    </div>
                    <div class="ti-artist">${t.artist || ''}</div>
                </div>
                <div class="ti-dur">${t.duration || ''}</div>`;
            el.addEventListener('click', () => {
                currentIdx = i;
                playTrack(i);
                queue.classList.remove('open');
                
                
            });
            trackList.appendChild(el);
        });
    }

    function clean(str) {
        // Trim noisy YouTube suffixes
        return (str || '')
            .replace(/\s*\|.*$/, '')
            .replace(/\s*[-–]\s*(Official.*|Audio.*|Video.*|Lyric.*)$/i, '')
            .trim() || str;
    }

    function syncMeta(title, artist) {
        const t = currentPl && currentPl.tracks[currentIdx];
        const displayTitle  = title  || (t && t.title)  || 'Not Playing';
        const displayArtist = artist || (t && t.artist) || '';
        const thumb = t && t.thumbnail;

        trackTitle.textContent  = displayTitle;
        trackArtist.textContent = displayArtist;

        // Restart fade animation
        trackTitle.style.animation = 'none';
        void trackTitle.offsetWidth;
        trackTitle.style.animation = '';

        // Album art on disk label
        if (thumb) {
            diskLabel.style.backgroundImage  = `url('${thumb}')`;
            diskLabel.style.backgroundSize   = 'cover';
            diskLabel.style.backgroundPosition = 'center';
        }
        
        // Update OS Media Session (Lock Screen / Media Keys)
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: displayTitle,
                artist: displayArtist,
                artwork: [
                    { src: thumb || 'https://via.placeholder.com/600', sizes: '600x600', type: 'image/jpeg' }
                ]
            });
        }

        // Highlight active queue item
        document.querySelectorAll('.track-item').forEach((el, i) => {
            el.classList.toggle('active', i === currentIdx);
        });

        // Scroll active into view
        const active = trackList.querySelector('.track-item.active');
        if (active) active.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // ─── Playback ────────────────────────────────
    async function playTrack(idx) {
        if (!ytPlayer || !playerReady || !currentPl) return;
        currentIdx = idx;
        const t = currentPl.tracks[idx];
        
        updateProgress(0, 0);
        syncMeta();
        setPlaying(true);

        if (t && t.videoId) {
            ytPlayer.loadVideoById(t.videoId);
            ytPlayer.playVideo();
        } else if (currentPl.youtubeListId) {
            ytPlayer.loadPlaylist({ listType: 'playlist', list: currentPl.youtubeListId, index: idx });
            ytPlayer.playVideo();
        } else {
            // Missing videoId (from iTunes search)
            try {
                const q = encodeURIComponent(`${t.title} ${t.artist} audio`);
                // Use public Invidious instances with robust fallbacks
                const instances = [
                    'https://invidious.f5.si',
                    'https://yt.chocolatemoo53.com',
                    'https://invidious.nerdvpn.de'
                ];
                
                let foundVid = null;
                for (const url of instances) {
                    try {
                        const res = await fetch(`${url}/api/v1/search?q=${q}`);
                        if (!res.ok) continue;
                        const data = await res.json();
                        if (data && data.length > 0 && data[0].videoId) {
                            foundVid = data[0].videoId;
                            break; // Stop at first successful API response!
                        }
                    } catch (e) {
                        console.warn(`Instance ${url} failed, trying next...`);
                    }
                }
                
                if (foundVid) {
                    t.videoId = foundVid; // Cache it permanently for this session!
                    ytPlayer.loadVideoById(t.videoId);
                    ytPlayer.playVideo();
                } else {
                    console.error("No video found on any instance");
                    setTimeout(() => playTrack((idx + 1) % currentPl.tracks.length), 1000);
                }
            } catch (err) {
                console.error("Search API failed", err);
                setTimeout(() => playTrack((idx + 1) % currentPl.tracks.length), 1000);
            }
        }
    }

    function setPlaying(val) {
        isPlaying = val;
        iconPlay.style.display  = val ? 'none' : 'block';
        iconPause.style.display = val ? 'block' : 'none';
        document.body.classList.toggle('is-playing', val);
        if (val) {
            startProgressTicker();
        } else {
            stopProgressTicker();
        }
    }

    // ─── Controls ────────────────────────────────
    btnPlay.addEventListener('click', () => {
        if (!ytPlayer || !playerReady || !currentPl) return;
        const state = ytPlayer.getPlayerState();
        if (isPlaying) {
            ytPlayer.pauseVideo();
        } else {
            if (state === YT.PlayerState.CUED || state === YT.PlayerState.UNSTARTED || state === -1) {
                playTrack(currentIdx);
            } else {
                ytPlayer.playVideo();
            }
        }
    });

    btnNext.addEventListener('click', () => {
        if (!currentPl) return;
        
        playTrack((currentIdx + 1) % currentPl.tracks.length);
    });

    btnPrev.addEventListener('click', () => {
        if (!currentPl) return;
        
        playTrack((currentIdx - 1 + currentPl.tracks.length) % currentPl.tracks.length);
    });

    
        // ─── Volume & Mute ───────────────────────────
    const volSide = document.getElementById('volume-slider-side');
    const btnMute = document.getElementById('btn-mute');
    const iconVolOn = document.getElementById('icon-vol-on');
    const iconVolOff = document.getElementById('icon-vol-off');
    
    let isMuted = false;
    let previousVol = 100;

    if (volSide) {
        volSide.addEventListener('input', (e) => {
            const v = e.target.value;
            if (ytPlayer && playerReady) {
                ytPlayer.setVolume(v);
                if (v > 0 && isMuted) toggleMute(false);
                if (v == 0 && !isMuted) toggleMute(true);
            }
        });
    }

    if (btnMute) {
        btnMute.addEventListener('click', () => toggleMute(!isMuted));
    }

    function toggleMute(mute) {
        if (!ytPlayer || !playerReady) return;
        isMuted = mute;
        document.body.classList.toggle('is-muted', mute);
        if (mute) {
            previousVol = volSide.value;
            volSide.value = 0;
            ytPlayer.mute();
            iconVolOn.style.display = 'none';
            iconVolOff.style.display = 'block';
        } else {
            volSide.value = previousVol > 0 ? previousVol : 100;
            ytPlayer.unMute();
            ytPlayer.setVolume(volSide.value);
            iconVolOn.style.display = 'block';
            iconVolOff.style.display = 'none';
        }
    }

    
    // ─── Scrubber Seeking Interactions ──────────
    function seekFromEvent(e) {
        if (!ytPlayer || !playerReady || !scrubberTrack) return;
        const rect = scrubberTrack.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
        if (scrubberFill) scrubberFill.style.width = `${pct * 100}%`;
        if (scrubberThumb) scrubberThumb.style.left = `${pct * 100}%`;
        try {
            const dur = ytPlayer.getDuration() || 0;
            if (dur > 0) {
                const seekTime = pct * dur;
                if (timeCurrent) timeCurrent.textContent = formatSec(seekTime);
                ytPlayer.seekTo(seekTime, true);
            }
        } catch (err) {}
    }

    if (scrubberTrack) {
        scrubberTrack.addEventListener('mousedown', (e) => {
            isScrubbing = true;
            scrubberTrack.classList.add('is-dragging');
            seekFromEvent(e);
            const onMove = (ev) => seekFromEvent(ev);
            const onUp = () => {
                isScrubbing = false;
                scrubberTrack.classList.remove('is-dragging');
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onUp);
            };
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
        });

        scrubberTrack.addEventListener('touchstart', (e) => {
            isScrubbing = true;
            scrubberTrack.classList.add('is-dragging');
            seekFromEvent(e);
            const onTouchMove = (ev) => seekFromEvent(ev);
            const onTouchEnd = () => {
                isScrubbing = false;
                scrubberTrack.classList.remove('is-dragging');
                window.removeEventListener('touchmove', onTouchMove);
                window.removeEventListener('touchend', onTouchEnd);
            };
            window.addEventListener('touchmove', onTouchMove);
            window.addEventListener('touchend', onTouchEnd);
        }, { passive: true });
    }

    // ─── YouTube IFrame API ──────────────────────
    window.onYouTubeIframeAPIReady = function () {
        ytPlayer = new YT.Player('yt-player', {
            height: '1', width: '1',
            playerVars: { playsinline: 1, controls: 0, disablekb: 1, fs: 0, rel: 0 },
            events: {
                onReady: () => { playerReady = true; },
                onStateChange: onState,
                onError: () => {
                    // Skip broken track
                    setTimeout(() => {
                        if (!currentPl) return;
                        playTrack((currentIdx + 1) % currentPl.tracks.length);
                    }, 1200);
                }
            }
        });
    };

    function onState(e) {
        if (e.data === YT.PlayerState.PLAYING) {
            setPlaying(true);
            startProgressTicker();
            const curTrack = currentPl && currentPl.tracks[currentIdx];
            const vd = ytPlayer.getVideoData();
            if (vd && vd.title) {
                // Preserve high-res artwork; only fallback to YouTube if no artwork exists
                if ((!curTrack || !curTrack.thumbnail) && vd.video_id) {
                    diskLabel.style.backgroundImage = `url('https://i.ytimg.com/vi/${vd.video_id}/hqdefault.jpg')`;
                }
                syncMeta(curTrack ? curTrack.title : vd.title, curTrack ? curTrack.artist : (vd.author || 'YouTube'));
            }
        } else if (e.data === YT.PlayerState.PAUSED) {
            setPlaying(false);
            stopProgressTicker();
        } else if (e.data === YT.PlayerState.ENDED) {
            stopProgressTicker();
            if (currentPl) {
                playTrack((currentIdx + 1) % currentPl.tracks.length);
            }
        }
    }

})();
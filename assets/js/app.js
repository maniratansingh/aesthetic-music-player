(function () {
    'use strict';

    const data = window.RoadtripData;
    if (!data) return;

    

    
    // ─── Media Session API (Android Auto, Vehicle Head Units & Media Keys) ───
    if ('mediaSession' in navigator) {
        try {
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
            navigator.mediaSession.setActionHandler('seekbackward', (details) => {
                if (!ytPlayer || !playerReady) return;
                const skip = (details && details.seekOffset) || 10;
                try {
                    const cur = ytPlayer.getCurrentTime() || 0;
                    ytPlayer.seekTo(Math.max(0, cur - skip), true);
                } catch (e) {}
            });
            navigator.mediaSession.setActionHandler('seekforward', (details) => {
                if (!ytPlayer || !playerReady) return;
                const skip = (details && details.seekOffset) || 10;
                try {
                    const cur = ytPlayer.getCurrentTime() || 0;
                    const dur = ytPlayer.getDuration() || 0;
                    ytPlayer.seekTo(dur > 0 ? Math.min(dur, cur + skip) : cur + skip, true);
                } catch (e) {}
            });
            navigator.mediaSession.setActionHandler('seekto', (details) => {
                if (!ytPlayer || !playerReady || details.seekTime === undefined) return;
                try {
                    ytPlayer.seekTo(details.seekTime, true);
                } catch (e) {}
            });
            navigator.mediaSession.setActionHandler('stop', () => {
                if (ytPlayer && playerReady) {
                    try { ytPlayer.pauseVideo(); } catch (e) {}
                }
                setPlaying(false);
            });
        } catch (err) {
            console.warn('MediaSession handler registration failed:', err);
        }
    }

    // ─── Screen Wake Lock (Vehicle Dashboards & Mobile Driving) ───
    let wakeLock = null;
    async function requestWakeLock() {
        if ('wakeLock' in navigator && !wakeLock) {
            try {
                wakeLock = await navigator.wakeLock.request('screen');
                wakeLock.addEventListener('release', () => { wakeLock = null; });
            } catch (e) {}
        }
    }
    function releaseWakeLock() {
        if (wakeLock) {
            try { wakeLock.release(); } catch (e) {}
            wakeLock = null;
        }
    }
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && isPlaying) {
            requestWakeLock();
        }
    });

    
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
    const queueBackdrop   = document.getElementById('queue-backdrop');
    const queueCount      = document.getElementById('queue-count');
    const btnMenu         = document.getElementById('btn-menu');
    
    const btnQueueMobile  = document.getElementById('btn-queue-mobile');
    const btnCloseQueue   = document.getElementById('btn-close-queue');
    const btnShuffleQueue = document.getElementById('btn-shuffle-queue');
    const btnLocatePlaying= document.getElementById('btn-locate-playing');
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
                    const cur = ytPlayer.getCurrentTime() || 0;
                    const dur = ytPlayer.getDuration() || 0;
                    updateProgress(cur, dur);

                    // Sync vehicle dashboard & Android Auto position scrubber
                    if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession && dur > 0) {
                        try {
                            navigator.mediaSession.setPositionState({
                                duration: Math.max(0, dur),
                                playbackRate: 1,
                                position: Math.min(Math.max(0, cur), dur)
                            });
                        } catch (err) {}
                    }
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
    
    // ─── SEARCH ENGINE ────────────────────────────
    const searchInput      = document.getElementById('search-input');
    const searchBox        = document.getElementById('search-box');
    const searchDropdown   = document.getElementById('search-dropdown');
    const searchSpinner    = document.getElementById('search-spinner');
    const btnSearchClear   = document.getElementById('btn-search-clear');
    const searchChips      = document.getElementById('search-chips');
    const searchRecents    = document.getElementById('search-recents');
    const recentsLabel     = document.getElementById('recents-label');
    const searchResultsList= document.getElementById('search-results-list');
    const searchRecos      = document.getElementById('search-recommendations');

    let searchDebounce     = null;
    let currentSearchResults = [];
    let activeNavIdx       = -1;
    let lastExecutedQuery  = '';

    // ─── Curated Knowledge Base for YouTube-Grade Suggestions ───
    const POPULAR_RECOMMENDATIONS = [
        // Bollywood Legends & Iconic Hindi Evergreen Artists
        { query: 'Arijit Singh', category: 'Artist', avatar: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/bf/14/08/bf14088a-9f57-b08e-1f7c-7f5fb2b24da8/190295851248.jpg/200x200bb.jpg' },
        { query: 'Arijit Singh romantic songs', category: 'Top Hits' },
        { query: 'Kishore Kumar', category: 'Artist', avatar: 'https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/4a/60/d1/4a60d131-08ec-be77-8cbe-3ca4bfcb6630/8902894354228_cover.jpg/200x200bb.jpg' },
        { query: 'Kishore Kumar classics', category: 'Top Hits' },
        { query: 'Lata Mangeshkar', category: 'Artist', avatar: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/37/a3/bb/37a3bbd5-1815-5cb9-8e7c-b3624e54546a/8902894354259_cover.jpg/200x200bb.jpg' },
        { query: 'Mohammad Rafi', category: 'Artist', avatar: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/7e/3d/c0/7e3dc04c-d90c-b26a-6569-8d82d46e279a/8902894354266_cover.jpg/200x200bb.jpg' },
        { query: 'Mukesh', category: 'Artist', avatar: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/fa/ec/9b/faec9be9-a5e2-0ce2-1ff6-e0e643ae4be8/8902894354273_cover.jpg/200x200bb.jpg' },
        { query: 'A.R. Rahman', category: 'Artist', avatar: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/28/fc/2a/28fc2afb-873b-eb63-12ce-131c944111be/886445591322.jpg/200x200bb.jpg' },
        { query: 'R.D. Burman', category: 'Artist', avatar: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/43/d8/d7/43d8d7b3-8186-0927-4ee5-4b08709ca8ae/8902894354280_cover.jpg/200x200bb.jpg' },
        { query: 'Asha Bhosle', category: 'Artist', avatar: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/43/d8/d7/43d8d7b3-8186-0927-4ee5-4b08709ca8ae/8902894354280_cover.jpg/200x200bb.jpg' },
        { query: 'Kumar Sanu & Alka Yagnik', category: 'Top Hits' },
        { query: 'Udit Narayan', category: 'Artist' },
        { query: 'Shreya Ghoshal', category: 'Artist' },
        { query: 'Sonu Nigam', category: 'Artist' },
        { query: 'KK', category: 'Artist' },
        { query: 'Shaan', category: 'Artist' },
        { query: 'Mohit Chauhan', category: 'Artist' },
        { query: 'Jagjit Singh Ghazals', category: 'Genre' },
        { query: 'Pankaj Udhas', category: 'Artist' },
        { query: '90s Evergreen Bollywood', category: 'Playlist' },
        { query: 'Romantic Bollywood Songs', category: 'Mood' },
        { query: 'Lo-Fi Chill Hindi', category: 'Vibe' },
        { query: 'Sadabahar Purane Gane', category: 'Genre' }
    ];

    // ─── Extensive Typo Normalization & Phonetic Dictionary ──────
    const TYPO_MAP = {
        'arijt': 'arijit', 'arjit': 'arijit', 'arjith': 'arijit', 'arijitsingh': 'arijit',
        'atif': 'atif', 'aatif': 'atif', 'aslm': 'aslam', 'aslum': 'aslam',
        'kishor': 'kishore', 'kumaar': 'kumar', 'kishoreda': 'kishore',
        'lataji': 'lata', 'mangeshkar': 'mangeshkar', 'mangshkar': 'mangeshkar',
        'rafi': 'mohammad rafi', 'mohd': 'mohammad', 'md': 'mohammad', 'mohammed': 'mohammad',
        'mukeshji': 'mukesh',
        'pancham': 'r d burman', 'rd': 'r d', 'burman': 'burman',
        'sanu': 'kumar sanu', 'shanu': 'kumar sanu',
        'yagnik': 'alka yagnik', 'alkaji': 'alka yagnik',
        'narayan': 'udit narayan',
        'ghoshal': 'shreya ghoshal', 'ghosal': 'shreya ghoshal',
        'sonu': 'sonu nigam', 'nigm': 'nigam',
        'jagjit': 'jagjit singh',
        'badsha': 'badshah', 'badshsh': 'badshah',
        'honey': 'yo yo honey singh', 'honeysingh': 'yo yo honey singh',
        'diljit': 'diljit dosanjh', 'daljit': 'diljit dosanjh',
        'sidhu': 'sidhu moose wala', 'moosewala': 'moose wala',
        'rehman': 'rahman', 'arrahman': 'a r rahman', 'rahman': 'a r rahman',
        'pritam': 'pritam',
        'anirudh': 'anirudh ravichander',
        'tayler': 'taylor', 'swfit': 'swift', 'taylorswift': 'taylor swift',
        'weekend': 'the weeknd', 'weeknd': 'the weeknd',
        'sheeran': 'ed sheeran', 'edsheeran': 'ed sheeran', 'sheran': 'ed sheeran',
        'dualipa': 'dua lipa',
        'coldply': 'coldplay', 'cold paly': 'coldplay',
        'eminen': 'eminem', 'emminem': 'eminem',
        'lofi': 'lo-fi', 'lo fi': 'lo-fi', 'slowed': 'lo-fi',
        'bolywood': 'bollywood', 'bollywod': 'bollywood', 'bolliwood': 'bollywood',
        'purane': 'retro', 'purana': 'retro', 'sad': 'sad songs',
        'qawali': 'qawwali', 'ghazal': 'ghazals', 'punjabi': 'punjabi'
    };

    function levenshteinDistance(s1, s2) {
        s1 = s1.toLowerCase();
        s2 = s2.toLowerCase();
        const m = s1.length;
        const n = s2.length;
        if (m === 0) return n;
        if (n === 0) return m;
        const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
                dp[i][j] = Math.min(
                    dp[i - 1][j] + 1,
                    dp[i][j - 1] + 1,
                    dp[i - 1][j - 1] + cost
                );
            }
        }
        return dp[m][n];
    }

    function normalizeQueryWithTypoCheck(rawQuery) {
        const raw = (rawQuery || '').trim();
        if (!raw) return { normalized: '', wasCorrected: false, original: '' };

        const lowerRaw = raw.toLowerCase().replace(/\s+/g, ' ');

        // Expand single-word artist searches only when user typed that single word
        const SINGLE_EXPANSIONS = {
            'sanu': 'kumar sanu',
            'narayan': 'udit narayan',
            'ghoshal': 'shreya ghoshal',
            'rafi': 'mohammad rafi',
            'jagjit': 'jagjit singh',
            'sheeran': 'ed sheeran',
            'arijit': 'arijit singh',
            'kishore': 'kishore kumar',
            'lata': 'lata mangeshkar',
            'mukesh': 'mukesh songs',
            'rahman': 'a r rahman',
            'burman': 'r d burman',
            'pancham': 'r d burman',
            'diljit': 'diljit dosanjh',
            'sidhu': 'sidhu moose wala',
            'taylor': 'taylor swift',
            'weeknd': 'the weeknd'
        };

        if (SINGLE_EXPANSIONS[lowerRaw]) {
            return { normalized: SINGLE_EXPANSIONS[lowerRaw], wasCorrected: true, original: raw };
        }

        let tokens = lowerRaw.split(' ');
        let correctedTokens = tokens.map((tok, idx) => {
            if (TYPO_MAP[tok]) {
                const fix = TYPO_MAP[tok];
                // Prevent duplicate prefixes/suffixes when typing full names
                if (tok === 'sanu' && tokens[idx - 1] === 'kumar') return 'sanu';
                if (tok === 'narayan' && tokens[idx - 1] === 'udit') return 'narayan';
                if (tok === 'sheeran' && tokens[idx - 1] === 'ed') return 'sheeran';
                if (tok === 'nigam' && tokens[idx - 1] === 'sonu') return 'nigam';
                if (tok === 'sonu' && tokens[idx + 1] === 'nigam') return 'sonu';
                if (tok === 'rafi' && (tokens[idx - 1] === 'mohammad' || tokens[idx - 1] === 'mohd')) return 'rafi';
                return fix;
            }

            // Check Levenshtein fuzzy distance against dictionary
            if (tok.length >= 4) {
                for (const [typo, fix] of Object.entries(TYPO_MAP)) {
                    if (levenshteinDistance(tok, typo) <= 1) {
                        return fix;
                    }
                }
            }
            return tok;
        });

        // Collapse any accidental duplicates (e.g. 'kumar kumar' -> 'kumar')
        let resultWords = [];
        correctedTokens.join(' ').split(/\s+/).forEach(w => {
            if (!resultWords.length || resultWords[resultWords.length - 1] !== w) {
                resultWords.push(w);
            }
        });

        const normalized = resultWords.join(' ').trim();
        const wasCorrected = normalized.toLowerCase() !== raw.toLowerCase();
        return { normalized, wasCorrected, original: raw };
    }

    // ─── Quick Pick Recommendation Chips ─────────
    const CHIPS = [
        { label: '90s Bollywood', emoji: '🎵' },
        { label: 'Kishore Kumar', emoji: '👑' },
        { label: 'Lata Mangeshkar', emoji: '🌹' },
        { label: 'Mohammad Rafi', emoji: '🎙️' },
        { label: 'R.D. Burman', emoji: '🎷' },
        { label: 'A.R. Rahman', emoji: '🌟' },
        { label: 'Soulful Ghazals', emoji: '🕊️' },
        { label: 'Mukesh Classics', emoji: '✨' },
        { label: 'Kumar Sanu', emoji: '❤️' },
        { label: 'Bollywood Lo-Fi', emoji: '🌙' },
    ];

    function renderChips() {
        searchChips.innerHTML = '';
        CHIPS.forEach(chip => {
            const el = document.createElement('button');
            el.className = 'search-chip';
            el.innerHTML = `<span>${chip.emoji}</span><span>${chip.label}</span>`;
            el.addEventListener('click', () => {
                searchInput.value = chip.label;
                btnSearchClear.style.display = 'flex';
                doLiveSearch(chip.label);
                saveRecent(chip.label);
            });
            searchChips.appendChild(el);
        });
    }

    // ─── Recent Searches (localStorage) ──────────
    function getRecents() {
        try { return JSON.parse(localStorage.getItem('mrps_recents') || '[]'); } catch { return []; }
    }
    function saveRecent(q) {
        if (!q || !q.trim()) return;
        const cleanQ = q.trim();
        let r = getRecents().filter(x => x.toLowerCase() !== cleanQ.toLowerCase());
        r.unshift(cleanQ);
        r = r.slice(0, 6);
        try { localStorage.setItem('mrps_recents', JSON.stringify(r)); } catch {}
        renderRecents();
    }
    function removeRecent(q) {
        const r = getRecents().filter(x => x.toLowerCase() !== q.toLowerCase());
        try { localStorage.setItem('mrps_recents', JSON.stringify(r)); } catch {}
        renderRecents();
    }
    function renderRecents() {
        const r = getRecents();
        if (!r.length) {
            recentsLabel.style.display = 'none';
            searchRecents.innerHTML = '';
            return;
        }
        recentsLabel.style.display = '';
        searchRecents.innerHTML = '';
        r.forEach(q => {
            const el = document.createElement('div');
            el.className = 'search-recent-item';
            el.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.13"/></svg>
                <span class="search-suggestion-text">${escapeHtml(q)}</span>
                <button class="search-recent-remove" title="Remove" type="button">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>`;
            el.addEventListener('click', (e) => {
                if (e.target.closest('.search-recent-remove')) return;
                searchInput.value = q;
                btnSearchClear.style.display = 'flex';
                doLiveSearch(q);
                saveRecent(q);
            });
            el.querySelector('.search-recent-remove').addEventListener('click', (e) => {
                e.stopPropagation();
                removeRecent(q);
            });
            searchRecents.appendChild(el);
        });
    }

    // ─── Dropdown Controls ─────────────────────────
    function openDropdown() {
        searchBox.classList.add('active');
        searchDropdown.classList.add('open');
    }
    function closeDropdown() {
        searchBox.classList.remove('active');
        searchDropdown.classList.remove('open');
        activeNavIdx = -1;
    }

    searchInput.addEventListener('focus', () => {
        renderChips();
        renderRecents();
        openDropdown();
        const cur = searchInput.value.trim();
        if (cur.length >= 2) {
            renderPredictiveSuggestions(cur);
        } else {
            searchRecos.style.display = '';
            searchResultsList.style.display = 'none';
        }
    });

    searchInput.addEventListener('click', () => {
        openDropdown();
    });

    document.addEventListener('click', (e) => {
        if (!searchBox.contains(e.target) && !searchDropdown.contains(e.target)) {
            closeDropdown();
        }
    });

    // ─── Input Handling (Typing & Recommendations) ───
    searchInput.addEventListener('input', () => {
        const v = searchInput.value;
        btnSearchClear.style.display = v.length ? 'flex' : 'none';
        activeNavIdx = -1;

        if (!v.trim()) {
            searchResultsList.style.display = 'none';
            searchRecos.style.display = '';
            currentSearchResults = [];
            clearTimeout(searchDebounce);
            return;
        }

        // 1. Instant YouTube-style predictive query recommendations
        renderPredictiveSuggestions(v.trim());

        // 2. Debounced deep live search to multi-source engine (300ms)
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(() => {
            doLiveSearch(v.trim());
        }, 300);
    });

    if (btnSearchClear) {
        btnSearchClear.addEventListener('click', (e) => {
            e.stopPropagation();
            searchInput.value = '';
            btnSearchClear.style.display = 'none';
            searchResultsList.style.display = 'none';
            searchRecos.style.display = '';
            currentSearchResults = [];
            activeNavIdx = -1;
            renderChips();
            renderRecents();
            searchInput.focus();
        });
    }

    // ─── Keyboard Navigation (Arrow Keys + Enter + Esc) ───
    searchInput.addEventListener('keydown', (e) => {
        const items = searchDropdown.querySelectorAll('.search-result-item, .search-query-suggestion, .search-recent-item, .search-chip, .search-hero-card');
        if (!items.length) {
            if (e.key === 'Enter') {
                const q = searchInput.value.trim();
                if (q) { doLiveSearch(q); saveRecent(q); }
            } else if (e.key === 'Escape') {
                closeDropdown();
                searchInput.blur();
            }
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            activeNavIdx = (activeNavIdx + 1) % items.length;
            highlightActiveItem(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            activeNavIdx = (activeNavIdx - 1 + items.length) % items.length;
            highlightActiveItem(items);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeNavIdx >= 0 && items[activeNavIdx]) {
                items[activeNavIdx].click();
            } else {
                const q = searchInput.value.trim();
                if (q) { doLiveSearch(q); saveRecent(q); }
            }
        } else if (e.key === 'Escape') {
            closeDropdown();
            searchInput.blur();
        }
    });

    function highlightActiveItem(items) {
        items.forEach((it, idx) => {
            it.classList.toggle('is-selected', idx === activeNavIdx);
            if (idx === activeNavIdx) {
                it.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        });
    }

    // ─── Global Music Player Keyboard Hotkeys ─────
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
            return;
        }

        if (e.code === 'Space') {
            e.preventDefault();
            if (btnPlay) btnPlay.click();
        } else if (e.code === 'ArrowRight' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            if (btnNext) btnNext.click();
        } else if (e.code === 'ArrowLeft' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            if (btnPrev) btnPrev.click();
        } else if (e.key === '/' && !e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            searchInput.focus();
            searchInput.select();
        }
    });

    // ─── Helpers: Escape HTML & Highlight Matching Text ───
    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function highlightMatches(text, query) {
        if (!text) return '';
        if (!query) return escapeHtml(text);
        const tokens = query.toLowerCase().split(/\s+/).filter(t => t.length >= 2);
        if (!tokens.length) return escapeHtml(text);
        tokens.sort((a, b) => b.length - a.length);
        const escaped = tokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        try {
            const regex = new RegExp(`(${escaped.join('|')})`, 'gi');
            const parts = text.split(regex);
            const tokenSet = new Set(tokens.map(t => t.toLowerCase()));
            return parts.map(part => {
                if (!part) return '';
                if (tokenSet.has(part.toLowerCase())) {
                    return `<mark class="search-hl">${escapeHtml(part)}</mark>`;
                }
                return escapeHtml(part);
            }).join('');
        } catch {
            return escapeHtml(text);
        }
    }

    function formatTime(ms) {
        if (!ms) return '';
        const s = Math.floor(ms / 1000);
        const m = Math.floor(s / 60);
        return `${m}:${(s % 60).toString().padStart(2, '0')}`;
    }

    // ─── YouTube-Style Predictive Query Recommendations ─────────
    function renderPredictiveSuggestions(query) {
        const qLower = query.toLowerCase().trim();
        if (!qLower) return;

        // Find matches in POPULAR_RECOMMENDATIONS
        const matches = POPULAR_RECOMMENDATIONS.filter(item => {
            return item.query.toLowerCase().includes(qLower);
        }).slice(0, 5);

        // Dynamically add contextual expansions
        const suggestions = [...matches];
        if (!suggestions.some(s => s.query.toLowerCase() === `${qLower} songs`)) {
            suggestions.push({ query: `${query} songs`, category: 'YouTube Suggestion' });
        }
        if (!suggestions.some(s => s.query.toLowerCase() === `${qLower} romantic`)) {
            suggestions.push({ query: `${query} romantic hits`, category: 'Vibe' });
        }

        // If results list is empty or searching, show instant suggestions
        if (searchResultsList.style.display === 'none' || searchResultsList.innerHTML === '') {
            searchResultsList.style.display = '';
            searchRecos.style.display = 'none';
            searchResultsList.innerHTML = '';

            const header = document.createElement('div');
            header.className = 'search-result-header';
            header.innerHTML = `<span class="search-result-header-text">Suggestions</span>`;
            searchResultsList.appendChild(header);

            suggestions.slice(0, 6).forEach(s => {
                const el = document.createElement('div');
                el.className = 'search-query-suggestion';
                el.innerHTML = `
                    <svg class="search-suggestion-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <span class="search-suggestion-text">${highlightMatches(s.query, query)}</span>
                    <svg class="search-suggestion-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>`;
                el.addEventListener('click', () => {
                    searchInput.value = s.query;
                    btnSearchClear.style.display = 'flex';
                    doLiveSearch(s.query);
                    saveRecent(s.query);
                });
                searchResultsList.appendChild(el);
            });
        }
    }

    // ─── Quality Scoring for Results ─────────────
    function scoreResult(r, q) {
        let score = 0;
        const title = (r.trackName || '').toLowerCase();
        const artist = (r.artistName || '').toLowerCase();
        const query = q.toLowerCase();
        if (title.startsWith(query)) score += 30;
        if (title.includes(query)) score += 15;
        if (artist.startsWith(query)) score += 25;
        if (artist.includes(query)) score += 12;
        if (r.trackCount) score += Math.min(r.trackCount / 100, 3);
        // Penalize very short tracks (previews, skits)
        if (r.trackTimeMillis && r.trackTimeMillis < 60000) score -= 10;
        return score;
    }

    // ─── JSONP Apple Music Fetcher (Immune to CORS & Adblockers) ─
    function fetchItunesJsonp(query, limit = 40) {
        return new Promise((resolve, reject) => {
            const callbackName = 'itunes_cb_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
            const script = document.createElement('script');
            let timer = null;

            window[callbackName] = function (data) {
                cleanup();
                resolve(data);
            };

            function cleanup() {
                if (timer) clearTimeout(timer);
                delete window[callbackName];
                if (script && script.parentNode) script.parentNode.removeChild(script);
            }

            timer = setTimeout(() => {
                cleanup();
                reject(new Error('JSONP timeout'));
            }, 3500);

            script.onerror = function () {
                cleanup();
                reject(new Error('JSONP network error'));
            };

            const encodedQ = encodeURIComponent(query);
            script.src = `https://itunes.apple.com/search?term=${encodedQ}&media=music&entity=song&limit=${limit}&callback=${callbackName}`;
            document.head.appendChild(script);
        });
    }

    // ─── Local Music Catalog Search Fallback (Safety Net) ────────
    function parseDurationToMs(durStr) {
        if (!durStr) return 180000;
        const parts = durStr.split(':').map(Number);
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            return (parts[0] * 60 + parts[1]) * 1000;
        } else if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
            return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
        }
        return 180000;
    }

    function searchLocalCatalog(query) {
        if (!query) return [];
        const qLower = query.toLowerCase().trim();
        const tokens = qLower.split(/\s+/).filter(Boolean);
        const results = [];
        const seen = new Set();

        const playlists = (window.RoadtripData && Array.isArray(window.RoadtripData.playlists))
            ? window.RoadtripData.playlists
            : (data && Array.isArray(data.playlists) ? data.playlists : []);

        playlists.forEach(pl => {
            if (Array.isArray(pl.tracks)) {
                pl.tracks.forEach(track => {
                    if (!track || !track.title) return;
                    const tLower = track.title.toLowerCase();
                    const aLower = (track.artist || '').toLowerCase();
                    const combined = `${tLower} ${aLower}`;

                    let match = false;
                    if (combined.includes(qLower)) {
                        match = true;
                    } else if (tokens.length > 0 && tokens.every(tok => combined.includes(tok))) {
                        match = true;
                    }

                    if (match) {
                        const key = `${track.title}|${track.artist || ''}`;
                        if (!seen.has(key)) {
                            seen.add(key);
                            results.push({
                                trackName: track.title,
                                artistName: track.artist || 'Featured Artist',
                                collectionName: pl.title || '',
                                artworkUrl100: track.thumbnail || 'assets/icons/icon-192.png',
                                trackTimeMillis: parseDurationToMs(track.duration),
                                videoId: track.videoId || null
                            });
                        }
                    }
                });
            }
        });

        return results.slice(0, 30);
    }

    // ─── 4-Tier Search Fallback Engine ───────────────────────────
    async function fetchMusicMultiSource(query) {
        const q = (query || '').trim();
        if (!q) return [];

        // Priority safety: Search curated catalog for verified videoIds
        const localMatches = searchLocalCatalog(q) || [];

        // Tier 1: Direct iTunes Fetch (Fastest)
        try {
            const controller = new AbortController();
            const tid = setTimeout(() => controller.abort(), 3200);
            const url = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&limit=45&media=music&entity=song`;
            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(tid);
            if (res.ok) {
                const json = await res.json();
                if (json && json.results && json.results.length) {
                    return localMatches.concat(json.results);
                }
            }
        } catch (e) {
            // Direct fetch failed or blocked
        }

        // Tier 2: Apple JSONP via dynamic <script> (Bypasses CORS & adblockers)
        try {
            const json = await fetchItunesJsonp(q, 40);
            if (json && json.results && json.results.length) {
                return localMatches.concat(json.results);
            }
        } catch (e) {
            // JSONP failed or timed out
        }

        // Tier 3: High-speed CORS Proxy (AllOrigins)
        try {
            const controller = new AbortController();
            const tid = setTimeout(() => controller.abort(), 3500);
            const target = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&limit=35&media=music&entity=song`;
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`;
            const res = await fetch(proxyUrl, { signal: controller.signal });
            clearTimeout(tid);
            if (res.ok) {
                const json = await res.json();
                if (json && json.results && json.results.length) {
                    return localMatches.concat(json.results);
                }
            }
        } catch (e) {
            // Proxy failed
        }

        // Tier 4: Local catalog search (Offline & safety net)
        if (localMatches && localMatches.length) {
            return localMatches;
        }

        return [];
    }

    // ─── Live Search via Typo Engine + Multi-Tier Search ─────────
    let currentSearchId = 0;

    async function doLiveSearch(rawQuery) {
        const thisSearchId = ++currentSearchId;
        const { normalized, wasCorrected, original } = normalizeQueryWithTypoCheck(rawQuery);
        const searchQ = normalized || rawQuery.trim();
        if (!searchQ) return;
        lastExecutedQuery = rawQuery;

        searchSpinner.style.display = 'flex';
        searchRecos.style.display = 'none';
        searchResultsList.style.display = '';

        try {
            let results = await fetchMusicMultiSource(searchQ);
            if (thisSearchId !== currentSearchId) return; // Stale search discarded

            // If corrected query returned 0, try raw query
            if ((!results || !results.length) && wasCorrected) {
                results = await fetchMusicMultiSource(rawQuery);
                if (thisSearchId !== currentSearchId) return;
            }

            searchSpinner.style.display = 'none';

            if (!results || !results.length) {
                showNoResults(rawQuery);
                return;
            }

            renderResults(results, searchQ, wasCorrected, original);
        } catch (err) {
            if (thisSearchId !== currentSearchId) return;
            searchSpinner.style.display = 'none';
            console.error('Search error, using local fallback:', err);
            const local = searchLocalCatalog(rawQuery);
            if (local && local.length) {
                renderResults(local, rawQuery, false, '');
            } else {
                showNoResults(rawQuery);
            }
        }
    }

    // ─── Render High-Readability YouTube-Grade Results ───────────
    function renderResults(rawResults, activeQuery, wasCorrected, originalQuery) {
        searchResultsList.style.display = '';
        searchRecos.style.display = 'none';
        searchResultsList.innerHTML = '';
        activeNavIdx = -1;

        // 1. Deduplicate & score tracks
        const seen = new Set();
        const scored = rawResults
            .map(r => ({ r, score: scoreResult(r, activeQuery) }))
            .filter(({ r }) => {
                if (!r.trackName) return false;
                const key = `${(r.trackName||'').toLowerCase()}|${(r.artistName||'').toLowerCase()}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, 20)
            .map(({ r }) => {
                const rawArt = r.artworkUrl100 || '';
                const thumb = rawArt ? rawArt.replace('100x100bb', '300x300bb') : 'assets/icons/icon-192.png';
                const appleArt = rawArt ? rawArt.replace('100x100bb', '1000x1000bb') : thumb;
                return {
                    title: r.trackName || 'Unknown',
                    artist: r.artistName || 'Featured Artist',
                    album: r.collectionName || '',
                    thumbnail: thumb,
                    appleArt: appleArt,
                    duration: formatTime(r.trackTimeMillis),
                    videoId: r.videoId || null
                };
            });

        currentSearchResults = scored;

        if (!scored.length) {
            showNoResults(activeQuery);
            return;
        }

        // 2. YouTube-Style Typo Correction Banner ("Showing results for...")
        if (wasCorrected && originalQuery) {
            const banner = document.createElement('div');
            banner.className = 'search-correction-banner';
            banner.innerHTML = `
                <span class="search-correction-text">Showing results for <strong>${escapeHtml(activeQuery)}</strong></span>
                <button class="search-search-instead">Search instead for "${escapeHtml(originalQuery)}"?</button>`;
            banner.querySelector('.search-search-instead').addEventListener('click', () => {
                searchInput.value = originalQuery;
                doLiveSearch(originalQuery);
            });
            searchResultsList.appendChild(banner);
        }

        // 3. YouTube Music "Top Result" Hero Card for Featured Artist
        const topArtist = POPULAR_RECOMMENDATIONS.find(item => 
            item.category === 'Artist' && 
            item.avatar && 
            activeQuery.toLowerCase().includes(item.query.toLowerCase())
        );

        if (topArtist) {
            const hero = document.createElement('div');
            hero.className = 'search-hero-card';
            hero.innerHTML = `
                <img class="search-hero-avatar" src="${topArtist.avatar}" alt="${topArtist.query}">
                <div class="search-hero-info">
                    <div class="search-hero-title">
                        <span>${escapeHtml(topArtist.query)}</span>
                        <span class="search-hero-badge">Verified Artist</span>
                    </div>
                    <div class="search-hero-sub">Top Result • Popular on YouTube & Apple Music</div>
                </div>
                <button class="search-hero-play-btn">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                    <span>Play Top Hits</span>
                </button>`;
            hero.addEventListener('click', () => {
                loadSearchResults(scored, 0);
                saveRecent(activeQuery);
                closeDropdown();
            });
            searchResultsList.appendChild(hero);
        }

        // 4. Section Header with "Play All"
        const header = document.createElement('div');
        header.className = 'search-result-header';
        header.innerHTML = `
            <span class="search-result-header-text">${scored.length} Songs Found</span>
            <button class="search-result-play-all" id="sri-play-all">Play All</button>`;
        searchResultsList.appendChild(header);

        header.querySelector('#sri-play-all').addEventListener('click', () => {
            loadSearchResults(scored, 0);
            saveRecent(activeQuery);
            closeDropdown();
        });

        // 5. High-Readability Track List with Full Details
        scored.forEach((t, i) => {
            const el = document.createElement('div');
            el.className = 'search-result-item';
            el.innerHTML = `
                <div class="sri-thumb-wrap">
                    <img class="sri-thumb" src="${t.thumbnail}" alt="" onerror="this.onerror=null;this.src='assets/icons/icon-192.png'">
                </div>
                <div class="sri-info">
                    <div class="sri-title">${highlightMatches(t.title, activeQuery)}</div>
                    <div class="sri-meta-line">
                        <span class="sri-badge">Song</span>
                        <span class="sri-artist">${highlightMatches(t.artist, activeQuery)}</span>
                        ${t.album ? `<span class="sri-album">• ${escapeHtml(t.album)}</span>` : ''}
                    </div>
                </div>
                ${t.duration ? `<span class="sri-dur">${t.duration}</span>` : ''}
                <div class="sri-play-btn" title="Play">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                </div>`;
            el.addEventListener('click', () => {
                loadSearchResults(scored, i);
                saveRecent(activeQuery);
                closeDropdown();
            });
            searchResultsList.appendChild(el);
        });
    }

    function showNoResults(query) {
        searchResultsList.innerHTML = `<div class="search-empty">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <p>No results found for "${escapeHtml(query)}"</p>
            <small>Try these popular picks instead:</small>
            <div class="search-empty-chips">
                <button class="search-empty-chip" data-q="Arijit Singh" type="button">🎤 Arijit Singh</button>
                <button class="search-empty-chip" data-q="90s Bollywood" type="button">🎵 90s Bollywood</button>
                <button class="search-empty-chip" data-q="Kishore Kumar" type="button">👑 Kishore Kumar</button>
                <button class="search-empty-chip" data-q="Lo-Fi Chill" type="button">🌙 Lo-Fi Chill</button>
            </div>
        </div>`;
        searchResultsList.querySelectorAll('.search-empty-chip').forEach(btn => {
            btn.addEventListener('click', () => {
                const q = btn.getAttribute('data-q');
                searchInput.value = q;
                btnSearchClear.style.display = 'flex';
                doLiveSearch(q);
                saveRecent(q);
            });
        });
    }

    // ─── Load Search Results into Player ─────────
    function loadSearchResults(tracks, startIdx) {
        const searchPl = {
            title: `Search: ${lastExecutedQuery || 'Results'}`,
            tracks: tracks
        };
        const existingIdx = data.playlists.findIndex(p => p.title.startsWith('Search:'));
        if (existingIdx >= 0) {
            data.playlists[existingIdx] = searchPl;
            currentPl = data.playlists[existingIdx];
            renderPlaylistNav();
        } else {
            data.playlists.unshift(searchPl);
            currentPl = data.playlists[0];
            renderPlaylistNav();
        }
        currentIdx = startIdx;
        mobilePlName.textContent = searchPl.title;
        renderQueue();
        syncMeta();
        if (window.innerWidth <= 900) {
            sidebar.classList.remove('open');
            if (sidebarBackdrop) sidebarBackdrop.classList.remove('open');
        }
        if (playerReady) playTrack(startIdx);
    }


    function renderPlaylistNav() {
        playlistNav.innerHTML = '';
        data.playlists.forEach((pl, i) => {
            const el = document.createElement('div');
            el.className = 'playlist-item';
            const isSearch = pl.title.startsWith('Search:');
            const icon = pl.icon || (isSearch ? '🔍' : '🎵');
            const trackCount = (pl.tracks && Array.isArray(pl.tracks)) ? pl.tracks.length : 0;
            const sub = isSearch ? 'Live Search Results' : `${trackCount} Songs • ${pl.category || 'Evergreen'}`;

            el.innerHTML = `
                <div class="pli-icon-wrap"><span>${icon}</span></div>
                <div class="pli-meta">
                    <span class="pli-title">${escapeHtml(pl.title)}</span>
                    <span class="pli-sub">${escapeHtml(sub)}</span>
                </div>
                <div class="pli-now-playing" title="Playing">
                    <span class="pli-bar"></span>
                    <span class="pli-bar"></span>
                    <span class="pli-bar"></span>
                </div>
            `;

            el.addEventListener('click', () => {
                document.querySelectorAll('.playlist-item').forEach(x => x.classList.remove('active'));
                el.classList.add('active');
                sidebar.classList.remove('open');
                if (sidebarBackdrop) sidebarBackdrop.classList.remove('open');
                loadPlaylist(i);
            });
            playlistNav.appendChild(el);
        });
        const activeIdx = data.playlists.indexOf(currentPl);
        if (activeIdx >= 0 && playlistNav.children[activeIdx]) {
            playlistNav.children[activeIdx].classList.add('active');
        }
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
            const isActive = (i === currentIdx);
            el.className = 'track-item' + (isActive ? ' active' : '');
            el.dataset.index = i;
            el.innerHTML = `
                <span class="ti-num">${(i + 1).toString().padStart(2, '0')}</span>
                <div class="ti-thumb-wrap">
                    <img class="ti-thumb" src="${t.thumbnail || ''}" alt="" onerror="this.style.opacity='0'">
                    <div class="ti-thumb-overlay">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                    </div>
                </div>
                <div class="ti-info">
                    <div class="ti-title">
                        <span class="ti-name" title="${clean(t.title)}">${clean(t.title)}</span>
                    </div>
                    <div class="ti-artist">${t.artist || 'Unknown'}</div>
                </div>
                <div class="ti-right">
                    <div class="eq">
                        <div class="eq-bar"></div>
                        <div class="eq-bar"></div>
                        <div class="eq-bar"></div>
                        <div class="eq-bar"></div>
                    </div>
                    <span class="ti-dur">${t.duration || ''}</span>
                </div>`;
            el.addEventListener('click', () => {
                currentIdx = i;
                playTrack(i);
                if (window.innerWidth <= 900) {
                    queue.classList.remove('open');
                    if (queueBackdrop) queueBackdrop.classList.remove('open');
                }
            });
            trackList.appendChild(el);
        });
    }

    if (btnShuffleQueue) {
        btnShuffleQueue.addEventListener('click', () => {
            if (!currentPl || !currentPl.tracks || currentPl.tracks.length <= 1) return;
            const playingTrack = currentPl.tracks[currentIdx];
            const otherTracks = currentPl.tracks.filter((_, idx) => idx !== currentIdx);
            for (let i = otherTracks.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [otherTracks[i], otherTracks[j]] = [otherTracks[j], otherTracks[i]];
            }
            currentPl.tracks = [playingTrack, ...otherTracks];
            currentIdx = 0;
            renderQueue();
            btnShuffleQueue.classList.add('shuffle-active');
            setTimeout(() => btnShuffleQueue.classList.remove('shuffle-active'), 550);
        });
    }

    if (btnLocatePlaying) {
        btnLocatePlaying.addEventListener('click', () => {
            const active = trackList.querySelector('.track-item.active');
            if (active) {
                active.scrollIntoView({ behavior: 'smooth', block: 'center' });
                active.classList.add('locate-highlight');
                setTimeout(() => active.classList.remove('locate-highlight'), 1200);
            }
        });
    }

    if (btnMenu) {
        btnMenu.addEventListener('click', () => {
            sidebar.classList.add('open');
            if (sidebarBackdrop) sidebarBackdrop.classList.add('open');
        });
    }

    if (sidebarBackdrop) {
        sidebarBackdrop.addEventListener('click', () => {
            sidebar.classList.remove('open');
            sidebarBackdrop.classList.remove('open');
        });
    }

    if (btnQueueMobile) {
        btnQueueMobile.addEventListener('click', () => {
            const isOpen = queue.classList.toggle('open');
            if (queueBackdrop) queueBackdrop.classList.toggle('open', isOpen);
        });
    }

    if (btnCloseQueue) {
        btnCloseQueue.addEventListener('click', () => {
            queue.classList.remove('open');
            if (queueBackdrop) queueBackdrop.classList.remove('open');
        });
    }

    if (queueBackdrop) {
        queueBackdrop.addEventListener('click', () => {
            queue.classList.remove('open');
            queueBackdrop.classList.remove('open');
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
        
        // Update OS Media Session (Android Auto / Vehicle Head Units / Lock Screen)
        if ('mediaSession' in navigator) {
            const albumName = (currentPl && currentPl.title) || 'Hindi Evergreen Classics';
            const baseArt = thumb || 'https://via.placeholder.com/600';
            try {
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: displayTitle,
                    artist: displayArtist,
                    album: albumName,
                    artwork: [
                        { src: baseArt, sizes: '96x96',   type: 'image/jpeg' },
                        { src: baseArt, sizes: '128x128', type: 'image/jpeg' },
                        { src: baseArt, sizes: '192x192', type: 'image/jpeg' },
                        { src: baseArt, sizes: '256x256', type: 'image/jpeg' },
                        { src: baseArt, sizes: '384x384', type: 'image/jpeg' },
                        { src: baseArt, sizes: '512x512', type: 'image/jpeg' },
                        { src: baseArt, sizes: '600x600', type: 'image/jpeg' }
                    ]
                });
                navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
            } catch (err) {}
        }

        // Highlight active queue item
        document.querySelectorAll('.track-item').forEach((el, i) => {
            el.classList.toggle('active', i === currentIdx);
        });

        // Scroll active into view
        const active = trackList.querySelector('.track-item.active');
        if (active) active.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // ─── Playback & YouTube Audio Engine ──────────
    let pendingTrackIdx    = null;
    let consecutiveErrors   = 0;

    async function playTrack(idx) {
        if (!currentPl) return;
        currentIdx = idx;
        const t = currentPl.tracks[idx];
        if (!t) return;
        
        updateProgress(0, 0);
        syncMeta();
        setPlaying(true);

        if (!ytPlayer || !playerReady) {
            pendingTrackIdx = idx;
            return;
        }
        pendingTrackIdx = null;

        // 1. Direct verified videoId
        if (t.videoId) {
            ytPlayer.loadVideoById(t.videoId);
            ytPlayer.playVideo();
            return;
        }

        // 2. Playlist list ID
        if (currentPl.youtubeListId) {
            ytPlayer.loadPlaylist({ listType: 'playlist', list: currentPl.youtubeListId, index: idx });
            ytPlayer.playVideo();
            return;
        }

        // 3. Clean Direct Audio Stream Resolution (NO listType:'search' background ads)
        const cleanT = clean(t.title);
        const cleanA = (t.artist || '').split('&')[0].split(',')[0].trim();
        const searchQ = `${cleanT} ${cleanA}`.trim();
        const cacheKey = `mrps_vid_${cleanT}_${cleanA}`.toLowerCase().replace(/[^a-z0-9]/g, '_');

        // A. Check localStorage cache
        try {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                t.videoId = cached;
                ytPlayer.loadVideoById(cached);
                ytPlayer.playVideo();
                return;
            }
        } catch (e) {}

        // B. Check curated catalog for instant verified match
        const localMatches = searchLocalCatalog(cleanT);
        if (localMatches && localMatches.length && localMatches[0].videoId) {
            const matchedVid = localMatches[0].videoId;
            t.videoId = matchedVid;
            try { localStorage.setItem(cacheKey, matchedVid); } catch (e) {}
            ytPlayer.loadVideoById(matchedVid);
            ytPlayer.playVideo();
            return;
        }

        // C. Fast Piped music songs check (Single tracks only, no compilations/ads)
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2400);
            const pipedRes = await fetch(`https://api.piped.private.coffee/search?q=${encodeURIComponent(searchQ)}&filter=music_songs`, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (pipedRes.ok) {
                const data = await pipedRes.json();
                const items = data && (data.items || data);
                if (Array.isArray(items) && items.length > 0) {
                    for (const it of items) {
                        const u = it.url || '';
                        const vidMatch = u.match(/v=([a-zA-Z0-9_-]{11})/);
                        if (vidMatch && vidMatch[1]) {
                            const foundVid = vidMatch[1];
                            t.videoId = foundVid;
                            try { localStorage.setItem(cacheKey, foundVid); } catch (e) {}
                            ytPlayer.loadVideoById(foundVid);
                            ytPlayer.playVideo();
                            return;
                        }
                    }
                }
            }
        } catch (err) {}

        // Safe Fallback: NEVER load deprecated listType: 'search' (it creates background ads and random videos)
        console.warn(`Direct audio stream could not be resolved for "${t.title}". Skipping to next track.`);
        setTimeout(() => {
            if (currentPl && currentPl.tracks.length > 1) {
                playTrack((currentIdx + 1) % currentPl.tracks.length);
            }
        }, 600);
    }

    function setPlaying(val) {
        isPlaying = val;
        iconPlay.style.display  = val ? 'none' : 'block';
        iconPause.style.display = val ? 'block' : 'none';
        document.body.classList.toggle('is-playing', val);

        if ('mediaSession' in navigator) {
            try {
                navigator.mediaSession.playbackState = val ? 'playing' : 'paused';
            } catch (e) {}
        }

        if (val) {
            startProgressTicker();
            requestWakeLock();
        } else {
            stopProgressTicker();
            releaseWakeLock();
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

    // ─── YouTube IFrame API (Ad-Mitigated & Error 150 Safe) ──────
    window.onYouTubeIframeAPIReady = function () {
        ytPlayer = new YT.Player('yt-player', {
            height: '240',
            width: '320',
            host: 'https://www.youtube-nocookie.com',
            playerVars: {
                playsinline: 1,
                controls: 0,
                disablekb: 1,
                fs: 0,
                rel: 0,
                modestbranding: 1,
                iv_load_policy: 3,
                origin: window.location.origin,
                enablejsapi: 1
            },
            events: {
                onReady: () => {
                    playerReady = true;
                    if (pendingTrackIdx !== null) {
                        const idx = pendingTrackIdx;
                        pendingTrackIdx = null;
                        playTrack(idx);
                    }
                },
                onStateChange: onState,
                onError: onPlayerError
            }
        });
    };

    function onPlayerError(e) {
        console.warn('YouTube Player error code:', e && e.data);
        consecutiveErrors++;
        if (consecutiveErrors >= 3) {
            console.error('Multiple consecutive playback errors. Pausing playback.');
            setPlaying(false);
            return;
        }

        // Seamlessly advance to the next track without opening ad-filled search playlists
        setTimeout(() => {
            if (!currentPl) return;
            playTrack((currentIdx + 1) % currentPl.tracks.length);
        }, 600);
    }

    function onState(e) {
        if (e.data === YT.PlayerState.PLAYING) {
            consecutiveErrors = 0;
            setPlaying(true);
            startProgressTicker();

            // Detect if an ad is playing (short duration <= 35s or missing author)
            const dur = ytPlayer.getDuration() || 0;
            const vd = ytPlayer.getVideoData();
            const isAd = (dur > 0 && dur <= 35 && (!vd || !vd.author || vd.author === ''));

            if (isAd) {
                // Accelerate ad to 2x speed to get through it fast (without illegal seekTo which causes ad reload loops)
                try { ytPlayer.setPlaybackRate(2); } catch (err) {}
            } else {
                // Ensure standard speed for real music
                try { ytPlayer.setPlaybackRate(1); } catch (err) {}
            }

            const curTrack = currentPl && currentPl.tracks[currentIdx];
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
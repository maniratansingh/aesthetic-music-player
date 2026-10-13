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
        // Bollywood Legends & Modern Artists
        { query: 'Arijit Singh', category: 'Artist', avatar: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/bf/14/08/bf14088a-9f57-b08e-1f7c-7f5fb2b24da8/190295851248.jpg/200x200bb.jpg' },
        { query: 'Arijit Singh romantic songs', category: 'Top Hits' },
        { query: 'Arijit Singh sad songs', category: 'Top Hits' },
        { query: 'Kishore Kumar', category: 'Artist', avatar: 'https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/4a/60/d1/4a60d131-08ec-be77-8cbe-3ca4bfcb6630/8902894354228_cover.jpg/200x200bb.jpg' },
        { query: 'Kishore Kumar classics', category: 'Top Hits' },
        { query: 'Lata Mangeshkar', category: 'Artist', avatar: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/37/a3/bb/37a3bbd5-1815-5cb9-8e7c-b3624e54546a/8902894354259_cover.jpg/200x200bb.jpg' },
        { query: 'Mohammad Rafi', category: 'Artist', avatar: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/7e/3d/c0/7e3dc04c-d90c-b26a-6569-8d82d46e279a/8902894354266_cover.jpg/200x200bb.jpg' },
        { query: 'Mukesh', category: 'Artist', avatar: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/fa/ec/9b/faec9be9-a5e2-0ce2-1ff6-e0e643ae4be8/8902894354273_cover.jpg/200x200bb.jpg' },
        { query: 'A.R. Rahman', category: 'Artist', avatar: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/28/fc/2a/28fc2afb-873b-eb63-12ce-131c944111be/886445591322.jpg/200x200bb.jpg' },
        { query: 'R.D. Burman', category: 'Artist', avatar: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/43/d8/d7/43d8d7b3-8186-0927-4ee5-4b08709ca8ae/8902894354280_cover.jpg/200x200bb.jpg' },
        { query: 'Kumar Sanu & Alka Yagnik', category: 'Top Hits' },
        { query: 'Udit Narayan', category: 'Artist' },
        { query: 'Shreya Ghoshal', category: 'Artist' },
        { query: 'Sonu Nigam', category: 'Artist' },
        { query: 'Atif Aslam', category: 'Artist' },
        { query: 'Jagjit Singh Ghazals', category: 'Genre' },
        { query: 'Diljit Dosanjh', category: 'Artist' },
        { query: 'Sidhu Moose Wala', category: 'Artist' },
        { query: '90s Evergreen Bollywood', category: 'Playlist' },
        { query: 'Romantic Bollywood Songs', category: 'Mood' },
        { query: 'Lo-Fi Chill Hindi', category: 'Vibe' },
        { query: 'Punjabi Party Hits', category: 'Vibe' },
        { query: 'Taylor Swift', category: 'Artist', avatar: 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/4b/f7/a9/4bf7a944-fb43-6c84-8848-18e4cf24c4e2/24UMGIM28751.rgb.jpg/200x200bb.jpg' },
        { query: 'The Weeknd', category: 'Artist' },
        { query: 'Ed Sheeran', category: 'Artist' },
        { query: 'Coldplay', category: 'Artist' },
        { query: 'Eminem', category: 'Artist' },
        { query: 'Dua Lipa', category: 'Artist' },
        { query: 'Billie Eilish', category: 'Artist' },
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

        let tokens = raw.toLowerCase().split(/\s+/);
        let correctedTokens = tokens.map(tok => {
            if (TYPO_MAP[tok]) return TYPO_MAP[tok];
            // Check Levenshtein against top target keywords if token length >= 4
            if (tok.length >= 4) {
                for (const [typo, fix] of Object.entries(TYPO_MAP)) {
                    if (levenshteinDistance(tok, typo) <= 1) {
                        return fix;
                    }
                }
            }
            return tok;
        });

        let normalized = correctedTokens.join(' ').replace(/\s+/g, ' ').trim();
        const wasCorrected = normalized.toLowerCase() !== raw.toLowerCase();
        return { normalized, wasCorrected, original: raw };
    }

    // ─── Quick Pick Recommendation Chips ─────────
    const CHIPS = [
        { label: '90s Bollywood', emoji: '🎵' },
        { label: 'Arijit Singh', emoji: '🎤' },
        { label: 'Lo-Fi Chill', emoji: '🌙' },
        { label: 'A.R. Rahman', emoji: '🌟' },
        { label: 'Punjabi Hits', emoji: '🎶' },
        { label: 'Kishore Kumar', emoji: '📻' },
        { label: 'Taylor Swift', emoji: '✨' },
        { label: 'Soulful Ghazals', emoji: '🎷' },
        { label: 'Classic Rock', emoji: '🎸' },
        { label: 'Hip Hop', emoji: '🔥' },
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
                <button class="search-recent-remove" title="Remove">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>`;
            el.querySelector('span').addEventListener('click', () => {
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

        // 2. Debounced deep live search to Apple iTunes API (320ms)
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(() => {
            doLiveSearch(v.trim());
        }, 320);
    });

    if (btnSearchClear) {
        btnSearchClear.addEventListener('click', () => {
            searchInput.value = '';
            btnSearchClear.style.display = 'none';
            searchResultsList.style.display = 'none';
            searchRecos.style.display = '';
            currentSearchResults = [];
            activeNavIdx = -1;
            searchInput.focus();
        });
    }

    // ─── Keyboard Navigation (Arrow Keys + Enter) ───
    searchInput.addEventListener('keydown', (e) => {
        const items = searchDropdown.querySelectorAll('.search-result-item, .search-query-suggestion, .search-recent-item, .search-hero-card');
        if (!items.length) {
            if (e.key === 'Enter') {
                const q = searchInput.value.trim();
                if (q) { doLiveSearch(q); saveRecent(q); }
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
        if (!query || !text) return escapeHtml(text);
        const tokens = query.toLowerCase().split(/\s+/).filter(t => t.length >= 2);
        if (!tokens.length) return escapeHtml(text);
        tokens.sort((a, b) => b.length - a.length);
        const escaped = tokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        try {
            const regex = new RegExp(`(${escaped.join('|')})`, 'gi');
            return escapeHtml(text).replace(regex, '<mark class="search-hl">$1</mark>');
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

    // ─── Live Search via Apple iTunes API + Typo Engine ──────────
    async function doLiveSearch(rawQuery) {
        const { normalized, wasCorrected, original } = normalizeQueryWithTypoCheck(rawQuery);
        const searchQ = normalized || rawQuery.trim();
        if (!searchQ) return;
        lastExecutedQuery = rawQuery;

        searchSpinner.style.display = 'flex';
        searchRecos.style.display = 'none';
        searchResultsList.style.display = '';

        try {
            const url = `https://itunes.apple.com/search?term=${encodeURIComponent(searchQ)}&limit=45&media=music&entity=song`;
            const res = await fetch(url);
            const json = await res.json();

            searchSpinner.style.display = 'none';

            if (!json.results || !json.results.length) {
                // If corrected query returned 0, fallback to raw query
                if (wasCorrected) {
                    const fallbackUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(rawQuery)}&limit=30&media=music&entity=song`;
                    const fbRes = await fetch(fallbackUrl);
                    const fbJson = await fbRes.json();
                    if (fbJson.results && fbJson.results.length) {
                        renderResults(fbJson.results, rawQuery, false, '');
                        return;
                    }
                }
                showNoResults(rawQuery);
                return;
            }

            renderResults(json.results, searchQ, wasCorrected, original);

        } catch (err) {
            searchSpinner.style.display = 'none';
            console.error('Search error', err);
            searchResultsList.innerHTML = `<div class="search-empty">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <p>Search unavailable</p><small>Check your internet connection</small></div>`;
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
                if (!r.trackName || !r.artworkUrl100) return false;
                const key = `${(r.trackName||'').toLowerCase()}|${(r.artistName||'').toLowerCase()}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, 15)
            .map(({ r }) => ({
                title: r.trackName || 'Unknown',
                artist: r.artistName || '',
                album: r.collectionName || '',
                thumbnail: (r.artworkUrl100 || '').replace('100x100bb', '400x400bb'),
                appleArt: (r.artworkUrl100 || '').replace('100x100bb', '1000x1000bb'),
                duration: formatTime(r.trackTimeMillis),
            }));

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

        // 5. High-Readability Track List
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
                    </div>
                </div>
                ${t.duration ? `<span class="sri-dur">${t.duration}</span>` : ''}
                <div class="sri-play-btn">
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
            <small>Check for spelling errors or try artist names like Arijit Singh, Kishore Kumar, Taylor Swift</small></div>`;
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
            renderPlaylistNav();
            currentPl = data.playlists[existingIdx];
        } else {
            data.playlists.unshift(searchPl);
            renderPlaylistNav();
            currentPl = data.playlists[0];
        }
        currentIdx = startIdx;
        mobilePlName.textContent = searchPl.title;
        renderQueue();
        syncMeta();
        if (playerReady) playTrack(startIdx);
    }


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
        });
    }

    if (sidebarBackdrop) {
        sidebarBackdrop.addEventListener('click', () => {
            sidebar.classList.remove('open');
        });
    }

    if (btnQueueMobile) {
        btnQueueMobile.addEventListener('click', () => {
            queue.classList.toggle('open');
        });
    }

    if (btnCloseQueue) {
        btnCloseQueue.addEventListener('click', () => {
            queue.classList.remove('open');
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
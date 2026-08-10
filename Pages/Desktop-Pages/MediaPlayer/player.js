/* =========================================================================
   SUSHIMINIS MEDIA PLAYER  -  motor del reproductor
   HTML + CSS + JS puro, sin librerias. Funciona en Neocities.
   ========================================================================= */
(function () {
    'use strict';

    var $ = function (id) { return document.getElementById(id); };

    /* ------------------------------------------------------------------ */
    /* Estado                                                              */
    /* ------------------------------------------------------------------ */
    var tracks   = [];      // {title, artist, album, src, cover, coverUrl, duration}
    var current  = -1;
    var shuffle  = false;
    var repeat   = 0;       // 0 = off, 1 = all, 2 = one
    var vizIndex = 0;
    var history  = [];      // para "anterior" en modo aleatorio

    var VIZ_NAMES = ['Ambience: Water', 'Bars and Waves: Bars',
                     'Bars and Waves: Scope', 'Battery: Sync-a-tron'];

    var audio = new Audio();
    audio.preload = 'metadata';

    /* Web Audio (visualizador real). Se conecta al primer play. */
    var actx = null, analyser = null, srcNode = null, graphOn = false;
    var freqData = null, waveData = null;

    /* ------------------------------------------------------------------ */
    /* Utilidades                                                          */
    /* ------------------------------------------------------------------ */
    function fmt(sec) {
        if (!isFinite(sec) || sec < 0) sec = 0;
        var m = Math.floor(sec / 60), s = Math.floor(sec % 60);
        return m + ':' + (s < 10 ? '0' : '') + s;
    }
    function fmt2(sec) {
        if (!isFinite(sec) || sec < 0) sec = 0;
        var m = Math.floor(sec / 60), s = Math.floor(sec % 60);
        return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    }
    function nameFromPath(p) {
        var f = String(p).split('/').pop().split('\\').pop();
        return decodeURIComponent(f).replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ');
    }
    /* true si el archivo vive en el mismo sitio (necesario para el analizador) */
    function isLocalSrc(src) {
        if (!src) return false;
        if (src.indexOf('blob:') === 0) return true;
        if (/^https?:\/\//i.test(src)) {
            try { return new URL(src).origin === location.origin; } catch (e) { return false; }
        }
        return true;
    }
    function store(k, v) {
        try { if (v === undefined) return localStorage.getItem('wmp.' + k);
              localStorage.setItem('wmp.' + k, v); } catch (e) {}
        return null;
    }

    /* ------------------------------------------------------------------ */
    /* Carga de la playlist declarada en playlist.js                       */
    /* ------------------------------------------------------------------ */
    function normalize(entry) {
        if (typeof entry === 'string') entry = { src: entry };
        if (!entry || !entry.src) return null;
        return {
            src:      entry.src,
            title:    entry.title  || nameFromPath(entry.src),
            artist:   entry.artist || 'Unknown artist',
            album:    entry.album  || 'Unknown album',
            cover:    entry.cover  || null,
            coverUrl: null,
            duration: entry.duration || null
        };
    }

    function loadDeclaredPlaylist() {
        var list = (window.PLAYLIST && window.PLAYLIST.length) ? window.PLAYLIST : [];
        for (var i = 0; i < list.length; i++) {
            var t = normalize(list[i]);
            if (t) tracks.push(t);
        }
        renderAll();
        probeDurations();
    }

    /* Pide solo los metadatos de cada pista para armar el "Total Time" */
    function probeDurations() {
        tracks.forEach(function (t) {
            if (t.duration || !t.src) return;
            var a = new Audio();
            a.preload = 'metadata';
            a.addEventListener('loadedmetadata', function () {
                t.duration = a.duration;
                renderAll();
            });
            a.addEventListener('error', function () {
                t.missing = true;
                renderAll();
            });
            a.src = t.src;
        });
    }

    /* ------------------------------------------------------------------ */
    /* Render                                                              */
    /* ------------------------------------------------------------------ */
    function renderAll() { renderPlaylist(); renderLibrary(); }

    function renderPlaylist() {
        var ul = $('plList');
        ul.innerHTML = '';

        if (!tracks.length) {
            var li = document.createElement('li');
            li.className = 'pl-empty';
            li.innerHTML = 'The playlist is empty.<br><br>' +
                           '&bull; Drag <b>.mp3</b> files onto this window, or<br>' +
                           '&bull; copy them into <b>MediaPlayer/music/</b> and list them in <b>playlist.js</b>.';
            ul.appendChild(li);
        } else {
            tracks.forEach(function (t, i) {
                var li = document.createElement('li');
                if (i === current) li.className = 'playing';
                li.title = t.title + (t.missing ? '  (file not found)' : '');
                var name = document.createElement('span');
                name.className = 'pl-name';
                name.textContent = (t.missing ? '! ' : '') + t.title;
                var dur = document.createElement('span');
                dur.className = 'pl-dur';
                dur.textContent = t.duration ? fmt(t.duration) : '--:--';
                li.appendChild(name); li.appendChild(dur);
                li.addEventListener('click', function () { play(i); });
                ul.appendChild(li);
            });
        }

        var total = tracks.reduce(function (s, t) { return s + (t.duration || 0); }, 0);
        $('plTotal').textContent = fmt(total);
        $('plCount').textContent = tracks.length + (tracks.length === 1 ? ' item' : ' items');
    }

    function renderLibrary() {
        var tb = $('libBody');
        tb.innerHTML = '';
        tracks.forEach(function (t, i) {
            var tr = document.createElement('tr');
            if (i === current) tr.className = 'playing';
            [String(i + 1), t.title, t.artist, t.album,
             t.duration ? fmt(t.duration) : '--:--'].forEach(function (v) {
                var td = document.createElement('td');
                td.textContent = v;
                td.title = v;
                tr.appendChild(td);
            });
            tr.addEventListener('click', function () { play(i); });
            tb.appendChild(tr);
        });
    }

    function updateNowPlaying() {
        var t = tracks[current];
        var art = $('artBox');
        if (!t) {
            $('npArtist').textContent = 'Sushiminis';
            $('npTitle').textContent  = 'Windows Media Player';
            $('npAlbum').textContent  = '—';
            $('npSub').textContent    = 'No file loaded';
            art.innerHTML = '<span>?</span>';
            $('statusText').textContent = 'Ready';
            $('vizEmpty').classList.toggle('hidden', tracks.length > 0);
            document.title = 'Windows Media Player - Sushiminis';
            return;
        }
        $('npArtist').textContent = t.artist;
        $('npTitle').textContent  = t.title;
        $('npAlbum').textContent  = 'Album: ' + t.album;
        $('npSub').textContent    = t.artist;
        $('vizEmpty').classList.add('hidden');
        document.title = t.title + ' - Windows Media Player';
        if (t.duration) $('timeTotal').textContent = fmt2(t.duration);

        var img = t.coverUrl || t.cover;
        art.innerHTML = img ? '' : '<span>♪</span>';
        if (img) {
            var el = document.createElement('img');
            el.src = img; el.alt = t.album;
            el.onerror = function () { art.innerHTML = '<span>♪</span>'; };
            art.appendChild(el);
        }
        renderAll();
    }

    /* ------------------------------------------------------------------ */
    /* Reproduccion                                                        */
    /* ------------------------------------------------------------------ */
    function play(i) {
        if (!tracks.length) return;
        if (i < 0) i = tracks.length - 1;
        if (i >= tracks.length) i = 0;

        if (i !== current) {
            if (current >= 0) history.push(current);
            current = i;
            audio.src = tracks[i].src;
        }
        updateNowPlaying();
        connectGraph();
        var p = audio.play();
        if (p && p.catch) {
            p.catch(function () {
                $('statusText').textContent = 'Cannot play: ' + tracks[i].src;
            });
        }
    }

    function togglePlay() {
        if (current < 0) { play(0); return; }
        if (audio.paused) { connectGraph(); audio.play(); }
        else audio.pause();
    }

    function stop() {
        audio.pause();
        audio.currentTime = 0;
        setPlayIcon(false);
        $('statusText').textContent = 'Stopped';
    }

    function next(auto) {
        if (!tracks.length) return;
        if (shuffle && tracks.length > 1) {
            var n;
            do { n = Math.floor(Math.random() * tracks.length); } while (n === current);
            play(n);
            return;
        }
        if (current + 1 >= tracks.length) {
            if (auto && repeat !== 1) { stop(); return; }
            play(0);
        } else play(current + 1);
    }

    function prev() {
        if (!tracks.length) return;
        if (audio.currentTime > 3) { audio.currentTime = 0; return; }
        if (shuffle && history.length) { play(history.pop()); return; }
        play(current - 1);
    }

    function setPlayIcon(playing) {
        var svg = $('playIcon');
        svg.innerHTML = playing
            ? '<rect x="7" y="5.5" width="3.6" height="13"/><rect x="13.4" y="5.5" width="3.6" height="13"/>'
            : '<path d="M8 5.5 L18 12 L8 18.5 Z"/>';
    }

    audio.addEventListener('play',  function () {
        setPlayIcon(true);
        var t = tracks[current];
        $('statusText').textContent = 'Playing: ' + (t ? t.artist + ' - ' + t.title : '');
    });
    audio.addEventListener('pause', function () {
        setPlayIcon(false);
        if (audio.currentTime > 0 && !audio.ended) $('statusText').textContent = 'Paused';
    });
    audio.addEventListener('ended', function () {
        if (repeat === 2) { audio.currentTime = 0; audio.play(); return; }
        next(true);
    });
    audio.addEventListener('error', function () {
        var t = tracks[current];
        if (t) { t.missing = true; renderAll(); }
        $('statusText').textContent = 'Error: file not found' + (t ? ' "' + t.src + '"' : '');
    });
    audio.addEventListener('loadedmetadata', function () {
        var t = tracks[current];
        if (t) { t.duration = audio.duration; t.missing = false; renderAll(); }
        $('timeTotal').textContent = fmt2(audio.duration);
    });
    audio.addEventListener('timeupdate', function () {
        if (dragging) return;
        var d = audio.duration || 0;
        var r = d ? audio.currentTime / d : 0;
        $('seekFill').style.width = (r * 100) + '%';
        $('seekThumb').style.left = (r * 100) + '%';
        $('timeNow').textContent = fmt2(audio.currentTime);
    });

    /* ------------------------------------------------------------------ */
    /* Barras arrastrables (seek + volumen)                                */
    /* ------------------------------------------------------------------ */
    var dragging = false;

    function bindSlider(el, onChange, onCommit) {
        function ratioFrom(e) {
            var r = el.getBoundingClientRect();
            var x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
            return Math.max(0, Math.min(1, x / r.width));
        }
        function down(e) {
            e.preventDefault();
            dragging = true;
            onChange(ratioFrom(e));
            document.addEventListener('mousemove', move);
            document.addEventListener('mouseup', up);
            document.addEventListener('touchmove', move, { passive: false });
            document.addEventListener('touchend', up);
        }
        function move(e) { e.preventDefault(); onChange(ratioFrom(e)); }
        function up(e) {
            dragging = false;
            if (onCommit) onCommit();
            document.removeEventListener('mousemove', move);
            document.removeEventListener('mouseup', up);
            document.removeEventListener('touchmove', move);
            document.removeEventListener('touchend', up);
        }
        el.addEventListener('mousedown', down);
        el.addEventListener('touchstart', down, { passive: false });
    }

    var seekRatio = 0;
    bindSlider($('seek'), function (r) {
        seekRatio = r;
        $('seekFill').style.width = (r * 100) + '%';
        $('seekThumb').style.left = (r * 100) + '%';
        if (audio.duration) $('timeNow').textContent = fmt2(r * audio.duration);
    }, function () {
        if (audio.duration) audio.currentTime = seekRatio * audio.duration;
    });

    function setVolume(v) {
        v = Math.max(0, Math.min(1, v));
        audio.volume = v;
        audio.muted = (v === 0);
        $('volFill').style.width = (v * 100) + '%';
        $('volThumb').style.left = (v * 100) + '%';
        $('wave1').style.opacity = audio.muted ? 0.25 : 1;
        store('volume', v);
    }
    bindSlider($('vol'), setVolume);

    /* ------------------------------------------------------------------ */
    /* Visualizador                                                        */
    /* ------------------------------------------------------------------ */
    function connectGraph() {
        if (graphOn) return;
        if (location.protocol === 'file:') return;          // file:// silencia el grafo
        var t = tracks[current];
        if (!t || !isLocalSrc(t.src)) return;               // evita audio remoto sin CORS
        try {
            var AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return;
            actx = new AC();
            srcNode = actx.createMediaElementSource(audio);
            analyser = actx.createAnalyser();
            analyser.fftSize = 512;
            analyser.smoothingTimeConstant = 0.78;
            srcNode.connect(analyser);
            analyser.connect(actx.destination);
            freqData = new Uint8Array(analyser.frequencyBinCount);
            waveData = new Uint8Array(analyser.frequencyBinCount);
            graphOn = true;
        } catch (e) { graphOn = false; analyser = null; }
        if (actx && actx.state === 'suspended') actx.resume();
    }

    var canvas = $('viz'), cx = canvas.getContext('2d');
    var cw = 0, ch = 0, dpr = window.devicePixelRatio || 1;

    function resizeCanvas() {
        var r = canvas.getBoundingClientRect();
        cw = Math.max(1, Math.round(r.width));
        ch = Math.max(1, Math.round(r.height));
        canvas.width  = Math.round(cw * dpr);
        canvas.height = Math.round(ch * dpr);
        cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    window.addEventListener('resize', resizeCanvas);
    if (window.ResizeObserver) new ResizeObserver(resizeCanvas).observe(canvas);

    var css = getComputedStyle(document.body);
    function color(v, fb) { return (css.getPropertyValue(v) || fb).trim() || fb; }
    function refreshColors() { css = getComputedStyle(document.body); }

    var simFreq = new Uint8Array(256), simWave = new Uint8Array(256);

    function gatherData(t, playing) {
        if (graphOn && analyser) {
            analyser.getByteFrequencyData(freqData);
            analyser.getByteTimeDomainData(waveData);
            return { f: freqData, w: waveData, n: freqData.length };
        }
        /* Sin Web Audio: datos simulados para que igual se mueva bonito */
        var amp = playing ? 1 : 0.12;
        for (var i = 0; i < 256; i++) {
            var x = i / 256;
            var v = Math.sin(t * 2.1 + i * 0.16) * 0.5 + Math.sin(t * 3.7 + i * 0.07) * 0.3
                  + Math.sin(t * 1.3 + i * 0.31) * 0.2;
            var env = Math.pow(1 - x, 1.7);
            simFreq[i] = Math.max(0, Math.min(255, (v * 0.5 + 0.5) * 235 * env * amp));
            simWave[i] = 128 + Math.sin(t * 5 + i * 0.22) * 52 * amp
                             + Math.sin(t * 11 + i * 0.08) * 16 * amp;
        }
        return { f: simFreq, w: simWave, n: 256 };
    }

    function draw(ts) {
        requestAnimationFrame(draw);
        if (!cw || !ch) resizeCanvas();
        var t = ts / 1000;
        var playing = !audio.paused && !audio.ended;
        var d = gatherData(t, playing);

        cx.clearRect(0, 0, cw, ch);
        var c1 = color('--viz1', '#67c8ff'), c2 = color('--viz2', '#0b3f9c'),
            hl = color('--hl', '#7fc0ff');

        if (vizIndex === 0)      drawWater(d, t, c1, c2, hl);
        else if (vizIndex === 1) drawBars(d, c1, c2, hl);
        else if (vizIndex === 2) drawScope(d, t, c1, hl);
        else                     drawSync(d, t, c1, c2, hl);
    }

    /* --- 0. Ambience: Water --- */
    function drawWater(d, t, c1, c2, hl) {
        var cxp = cw / 2, cyp = ch / 2;
        var base = Math.min(cw, ch) * 0.16;
        var rays = 128;

        var g = cx.createRadialGradient(cxp, cyp, 2, cxp, cyp, Math.min(cw, ch) * 0.55);
        g.addColorStop(0, c1); g.addColorStop(0.55, c2); g.addColorStop(1, 'rgba(0,0,0,0)');

        for (var pass = 0; pass < 2; pass++) {
            cx.beginPath();
            for (var i = 0; i <= rays; i++) {
                var a = (i / rays) * Math.PI * 2 + t * (pass ? -0.25 : 0.35);
                var bin = Math.floor((i % (rays / 2)) / (rays / 2) * (d.n * 0.7));
                var v = d.f[bin] / 255;
                var rr = base * (pass ? 0.72 : 1) + v * Math.min(cw, ch) * (pass ? 0.16 : 0.30)
                       + Math.sin(a * 6 + t * 2) * 3;
                var x = cxp + Math.cos(a) * rr, y = cyp + Math.sin(a) * rr * 0.92;
                if (i === 0) cx.moveTo(x, y); else cx.lineTo(x, y);
            }
            cx.closePath();
            cx.globalAlpha = pass ? 0.45 : 0.9;
            cx.fillStyle = pass ? c2 : g;
            cx.fill();
            cx.globalAlpha = 1;
            cx.strokeStyle = hl; cx.lineWidth = pass ? 0.6 : 1.1;
            cx.stroke();
        }

        /* ondas concentricas */
        for (var k = 0; k < 3; k++) {
            var rad = ((t * 40 + k * 55) % 170) + base;
            cx.beginPath();
            cx.ellipse(cxp, cyp, rad, rad * 0.92, 0, 0, Math.PI * 2);
            cx.strokeStyle = hl;
            cx.globalAlpha = Math.max(0, 0.32 - rad / 620);
            cx.lineWidth = 1;
            cx.stroke();
            cx.globalAlpha = 1;
        }
    }

    /* --- 1. Bars --- */
    var peaks = [];
    function drawBars(d, c1, c2, hl) {
        var n = 48, bw = cw / n;
        for (var i = 0; i < n; i++) {
            var bin = Math.floor(Math.pow(i / n, 1.45) * d.n * 0.85);
            var v = d.f[bin] / 255;
            var h = Math.max(2, v * ch * 0.94);
            var g = cx.createLinearGradient(0, ch, 0, ch - h);
            g.addColorStop(0, c2); g.addColorStop(0.6, c1); g.addColorStop(1, '#ffffff');
            cx.fillStyle = g;
            cx.fillRect(i * bw + 1, ch - h, bw - 2, h);

            peaks[i] = (peaks[i] === undefined) ? h : Math.max(h, peaks[i] - 1.6);
            cx.fillStyle = hl;
            cx.fillRect(i * bw + 1, ch - peaks[i] - 2, bw - 2, 2);
        }
    }

    /* --- 2. Scope --- */
    function drawScope(d, t, c1, hl) {
        cx.lineWidth = 1.6;
        for (var pass = 0; pass < 2; pass++) {
            cx.beginPath();
            for (var i = 0; i < d.n; i++) {
                var x = (i / (d.n - 1)) * cw;
                var v = (d.w[i] - 128) / 128;
                var y = ch / 2 + v * ch * (pass ? 0.22 : 0.42);
                if (i === 0) cx.moveTo(x, y); else cx.lineTo(x, y);
            }
            cx.strokeStyle = pass ? hl : c1;
            cx.globalAlpha = pass ? 0.55 : 1;
            cx.stroke();
            cx.globalAlpha = 1;
        }
        cx.strokeStyle = 'rgba(255,255,255,.12)';
        cx.lineWidth = 1;
        cx.beginPath(); cx.moveTo(0, ch / 2); cx.lineTo(cw, ch / 2); cx.stroke();
    }

    /* --- 3. Sync-a-tron --- */
    function drawSync(d, t, c1, c2, hl) {
        var cols = 26, rows = 9;
        var gw = cw / cols, gh = ch / rows;
        for (var i = 0; i < cols; i++) {
            var bin = Math.floor(Math.pow(i / cols, 1.3) * d.n * 0.8);
            var lit = Math.round((d.f[bin] / 255) * rows);
            for (var j = 0; j < rows; j++) {
                var on = (rows - j) <= lit;
                cx.fillStyle = on
                    ? (j < 2 ? '#ffffff' : (j < 4 ? hl : c1))
                    : c2;
                cx.globalAlpha = on ? 1 : 0.22;
                cx.fillRect(i * gw + 1.5, j * gh + 1.5, gw - 3, gh - 3);
            }
        }
        cx.globalAlpha = 1;
    }

    function setViz(i) {
        vizIndex = (i + VIZ_NAMES.length) % VIZ_NAMES.length;
        $('vizName').textContent = VIZ_NAMES[vizIndex];
        peaks = [];
        store('viz', vizIndex);
    }
    $('vizPrev').addEventListener('click', function () { setViz(vizIndex - 1); });
    $('vizNext').addEventListener('click', function () { setViz(vizIndex + 1); });
    $('viz').addEventListener('click', function () { setViz(vizIndex + 1); });

    /* ------------------------------------------------------------------ */
    /* Lector de tags ID3v2 (titulo / artista / album / portada)           */
    /* ------------------------------------------------------------------ */
    function decodeText(bytes, enc) {
        try {
            if (enc === 1) return new TextDecoder('utf-16').decode(bytes);
            if (enc === 2) return new TextDecoder('utf-16be').decode(bytes);
            if (enc === 3) return new TextDecoder('utf-8').decode(bytes);
            return new TextDecoder('iso-8859-1').decode(bytes);
        } catch (e) {
            return String.fromCharCode.apply(null, bytes);
        }
    }

    function readID3(file) {
        if (!file.slice || typeof file.slice(0, 1).arrayBuffer !== 'function') {
            return Promise.resolve(null);
        }
        return file.slice(0, 10).arrayBuffer().then(function (headBuf) {
            var h = new Uint8Array(headBuf);
            if (h.length < 10 || h[0] !== 0x49 || h[1] !== 0x44 || h[2] !== 0x33) return null;
            var major = h[3];
            var size = (h[6] << 21) | (h[7] << 14) | (h[8] << 7) | h[9];
            if (size <= 0 || size > 20 * 1024 * 1024) return null;
            return file.slice(10, 10 + size).arrayBuffer().then(function (buf) {
                return parseFrames(new Uint8Array(buf), major);
            });
        }).catch(function () { return null; });
    }

    function parseFrames(b, major) {
        var out = {}, p = 0;
        var idLen = (major === 2) ? 3 : 4;
        var hdrLen = (major === 2) ? 6 : 10;

        while (p + hdrLen <= b.length) {
            var id = '';
            for (var i = 0; i < idLen; i++) id += String.fromCharCode(b[p + i]);
            if (!/^[A-Z0-9]{3,4}$/.test(id)) break;

            var size;
            if (major === 2) {
                size = (b[p + 3] << 16) | (b[p + 4] << 8) | b[p + 5];
            } else if (major === 4) {
                size = (b[p + 4] << 21) | (b[p + 5] << 14) | (b[p + 6] << 7) | b[p + 7];
            } else {
                size = (b[p + 4] << 24) | (b[p + 5] << 16) | (b[p + 6] << 8) | b[p + 7];
            }
            if (size <= 0 || p + hdrLen + size > b.length) break;

            var data = b.subarray(p + hdrLen, p + hdrLen + size);

            if (id === 'TIT2' || id === 'TT2') out.title  = decodeText(data.subarray(1), data[0]).replace(/\0+$/, '');
            if (id === 'TPE1' || id === 'TP1') out.artist = decodeText(data.subarray(1), data[0]).replace(/\0+$/, '');
            if (id === 'TALB' || id === 'TAL') out.album  = decodeText(data.subarray(1), data[0]).replace(/\0+$/, '');
            if ((id === 'APIC' || id === 'PIC') && !out.picture) out.picture = parsePicture(data, id);

            p += hdrLen + size;
        }
        return out;
    }

    function parsePicture(data, id) {
        try {
            var enc = data[0], i = 1, mime = '';
            if (id === 'PIC') {                       // ID3v2.2: 3 chars de formato
                var fmtStr = String.fromCharCode(data[1], data[2], data[3]).toLowerCase();
                mime = fmtStr === 'png' ? 'image/png' : 'image/jpeg';
                i = 4;
            } else {
                while (i < data.length && data[i] !== 0) { mime += String.fromCharCode(data[i]); i++; }
                i++;                                   // salta el 0
            }
            i++;                                       // picture type
            /* descripcion terminada en 0 (o 00 00 si es UTF-16) */
            if (enc === 1 || enc === 2) {
                while (i + 1 < data.length && !(data[i] === 0 && data[i + 1] === 0)) i += 2;
                i += 2;
            } else {
                while (i < data.length && data[i] !== 0) i++;
                i++;
            }
            if (i >= data.length) return null;
            var blob = new Blob([data.subarray(i)], { type: mime || 'image/jpeg' });
            return URL.createObjectURL(blob);
        } catch (e) { return null; }
    }

    /* ------------------------------------------------------------------ */
    /* Agregar archivos locales                                            */
    /* ------------------------------------------------------------------ */
    function addFiles(fileList) {
        var files = Array.prototype.slice.call(fileList || []).filter(function (f) {
            return /^audio\//.test(f.type) || /\.(mp3|ogg|wav|m4a|flac|aac)$/i.test(f.name);
        });
        if (!files.length) {
            $('statusText').textContent = 'No audio files in that drop';
            return;
        }
        files.sort(function (a, b) { return a.name.localeCompare(b.name, undefined, { numeric: true }); });

        var startedEmpty = tracks.length === 0;

        files.forEach(function (f) {
            var t = {
                src: URL.createObjectURL(f),
                title: nameFromPath(f.name),
                artist: 'Unknown artist',
                album: 'Local files',
                cover: null, coverUrl: null, duration: null, local: true
            };
            tracks.push(t);

            var a = new Audio();
            a.preload = 'metadata';
            a.addEventListener('loadedmetadata', function () { t.duration = a.duration; renderAll(); });
            a.src = t.src;

            if (f.slice && window.TextDecoder) {
                readID3(f).then(function (tags) {
                    if (!tags) return;
                    if (tags.title)  t.title  = tags.title;
                    if (tags.artist) t.artist = tags.artist;
                    if (tags.album)  t.album  = tags.album;
                    if (tags.picture) t.coverUrl = tags.picture;
                    renderAll();
                    if (tracks[current] === t) updateNowPlaying();
                });
            }
        });

        renderAll();
        $('statusText').textContent = files.length + ' file(s) added to the playlist';
        if (startedEmpty) play(0);
    }

    /* drag & drop */
    var dz = $('dropzone'), dragDepth = 0;
    window.addEventListener('dragenter', function (e) {
        e.preventDefault(); dragDepth++; dz.classList.add('show');
    });
    window.addEventListener('dragover', function (e) { e.preventDefault(); });
    window.addEventListener('dragleave', function (e) {
        e.preventDefault(); dragDepth--; if (dragDepth <= 0) { dragDepth = 0; dz.classList.remove('show'); }
    });
    window.addEventListener('drop', function (e) {
        e.preventDefault(); dragDepth = 0; dz.classList.remove('show');
        if (e.dataTransfer && e.dataTransfer.files) addFiles(e.dataTransfer.files);
    });

    $('filePicker').addEventListener('change', function () { addFiles(this.files); this.value = ''; });
    $('folderPicker').addEventListener('change', function () { addFiles(this.files); this.value = ''; });

    /* ------------------------------------------------------------------ */
    /* Botones de control                                                  */
    /* ------------------------------------------------------------------ */
    $('btnPlay').addEventListener('click', togglePlay);
    $('btnStop').addEventListener('click', stop);
    $('btnPrev').addEventListener('click', prev);
    $('btnNext').addEventListener('click', function () { next(false); });

    $('btnShuffle').addEventListener('click', function () {
        shuffle = !shuffle;
        this.classList.toggle('on', shuffle);
        store('shuffle', shuffle ? '1' : '0');
        $('statusText').textContent = 'Shuffle ' + (shuffle ? 'on' : 'off');
    });
    $('btnRepeat').addEventListener('click', function () {
        repeat = (repeat + 1) % 3;
        this.classList.toggle('on', repeat > 0);
        this.title = ['Repeat: off', 'Repeat: all', 'Repeat: one'][repeat];
        store('repeat', repeat);
        $('statusText').textContent = this.title;
    });
    $('btnMute').addEventListener('click', function () {
        if (audio.volume > 0) { store('prevVol', audio.volume); setVolume(0); }
        else setVolume(parseFloat(store('prevVol')) || 0.7);
    });

    /* ------------------------------------------------------------------ */
    /* Paneles laterales                                                   */
    /* ------------------------------------------------------------------ */
    var PANEL_IDS = { now:'panel-now', guide:'panel-guide', cd:'panel-cd',
                      library:'panel-library', radio:'panel-radio',
                      burn:'panel-burn', skins:'panel-skins' };

    function showPanel(key) {
        Object.keys(PANEL_IDS).forEach(function (k) {
            var el = $(PANEL_IDS[k]);
            if (el) el.classList.toggle('active', k === key);
        });
        document.querySelectorAll('.task').forEach(function (b) {
            b.classList.toggle('active', b.getAttribute('data-panel') === key);
        });
        if (key === 'now') resizeCanvas();
    }
    document.querySelectorAll('.task').forEach(function (b) {
        b.addEventListener('click', function () { showPanel(this.getAttribute('data-panel')); });
    });

    $('libAdd').addEventListener('click', function () { $('filePicker').click(); });
    $('libClear').addEventListener('click', clearPlaylist);

    function clearPlaylist() {
        stop();
        tracks = []; current = -1; history = [];
        audio.removeAttribute('src'); audio.load();
        $('timeTotal').textContent = '00:00';
        $('timeNow').textContent = '00:00';
        $('seekFill').style.width = '0%'; $('seekThumb').style.left = '0%';
        updateNowPlaying();
        renderAll();
    }

    /* ------------------------------------------------------------------ */
    /* Skins                                                               */
    /* ------------------------------------------------------------------ */
    document.querySelectorAll('.skin-card').forEach(function (b) {
        b.addEventListener('click', function () {
            var s = this.getAttribute('data-skin');
            document.body.setAttribute('data-skin', s);
            store('skin', s);
            refreshColors();
            $('statusText').textContent = 'Skin applied: ' + this.textContent.trim();
        });
    });

    /* ------------------------------------------------------------------ */
    /* Menus                                                               */
    /* ------------------------------------------------------------------ */
    document.querySelectorAll('.menu').forEach(function (m) {
        m.querySelector('.menu-label').addEventListener('click', function (e) {
            e.stopPropagation();
            var open = m.classList.contains('open');
            document.querySelectorAll('.menu').forEach(function (x) { x.classList.remove('open'); });
            m.classList.toggle('open', !open);
        });
    });
    document.addEventListener('click', function () {
        document.querySelectorAll('.menu').forEach(function (x) { x.classList.remove('open'); });
    });

    document.querySelectorAll('.menu-drop li').forEach(function (li) {
        li.addEventListener('click', function () {
            var act = this.getAttribute('data-act');
            if (!act) return;
            document.querySelectorAll('.menu').forEach(function (x) { x.classList.remove('open'); });

            if (act === 'open')            $('filePicker').click();
            else if (act === 'open-folder') $('folderPicker').click();
            else if (act === 'clear')       clearPlaylist();
            else if (act === 'reload')      location.reload();
            else if (act.indexOf('viz-') === 0) { showPanel('now'); setViz(parseInt(act.slice(4), 10)); }
            else if (act === 'toggle-playlist') $('playlistPane').classList.toggle('hidden');
            else if (act === 'playpause')   togglePlay();
            else if (act === 'stop')        stop();
            else if (act === 'prev')        prev();
            else if (act === 'next')        next(false);
            else if (act === 'shuffle')     $('btnShuffle').click();
            else if (act === 'repeat')      $('btnRepeat').click();
            else if (act === 'options')     openOptions();
            else if (act === 'about')       openAbout();
        });
    });

    /* ------------------------------------------------------------------ */
    /* Dialogos                                                            */
    /* ------------------------------------------------------------------ */
    function openDialog(title, html) {
        $('dlgTitle').textContent = title;
        $('dlgBody').innerHTML = html;
        $('modalBack').classList.add('show');
    }
    function closeDialog() { $('modalBack').classList.remove('show'); }
    $('dlgOk').addEventListener('click', closeDialog);
    $('dlgX').addEventListener('click', closeDialog);
    $('modalBack').addEventListener('click', function (e) { if (e.target === this) closeDialog(); });

    function openOptions() {
        openDialog('Options', '' +
            '<label><input type="checkbox" id="optShuffle"' + (shuffle ? ' checked' : '') + '> Play in random order</label>' +
            '<label><input type="checkbox" id="optRepeat"' + (repeat > 0 ? ' checked' : '') + '> Repeat the playlist</label>' +
            '<label><input type="checkbox" id="optList" checked> Show the playlist</label>');
        $('optList').checked = !$('playlistPane').classList.contains('hidden');
        $('optShuffle').addEventListener('change', function () { if (this.checked !== shuffle) $('btnShuffle').click(); });
        $('optRepeat').addEventListener('change', function () {
            if (this.checked && repeat === 0) $('btnRepeat').click();
            if (!this.checked && repeat !== 0) { repeat = 2; $('btnRepeat').click(); }
        });
        $('optList').addEventListener('change', function () {
            $('playlistPane').classList.toggle('hidden', !this.checked);
        });
    }

    function openAbout() {
        openDialog('About', '' +
            '<div style="display:flex;gap:10px;align-items:flex-start">' +
            '<img src="../../Assets/icons/windows-media-player-icon.png" width="40" height="40" alt="">' +
            '<div><b>Sushiminis Media Player</b><br>Version 9.0 (Neocities Edition)<br><br>' +
            'Built with HTML, CSS and JavaScript.<br><br>' +
            '<span style="font-size:10px;opacity:.75">Shortcuts: Space = play/pause, &larr;/&rarr; = 5s, ' +
            '&uarr;/&darr; = volume, N/P = next/previous, V = visualization</span></div></div>');
    }

    /* ------------------------------------------------------------------ */
    /* Teclado                                                             */
    /* ------------------------------------------------------------------ */
    document.addEventListener('keydown', function (e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
        var k = e.key;
        if (k === ' ')            { e.preventDefault(); togglePlay(); }
        else if (k === 'ArrowRight') { e.preventDefault(); audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 5); }
        else if (k === 'ArrowLeft')  { e.preventDefault(); audio.currentTime = Math.max(0, audio.currentTime - 5); }
        else if (k === 'ArrowUp')    { e.preventDefault(); setVolume(audio.volume + 0.05); }
        else if (k === 'ArrowDown')  { e.preventDefault(); setVolume(audio.volume - 0.05); }
        else if (k === 'n' || k === 'N') next(false);
        else if (k === 'p' || k === 'P') prev();
        else if (k === 'v' || k === 'V') setViz(vizIndex + 1);
        else if (k === 'Escape') closeDialog();
    });

    /* El escritorio avisa cuando se cierra o minimiza la ventana */
    window.addEventListener('message', function (e) {
        if (e.data && e.data.wmp === 'pause') audio.pause();
    });

    /* ------------------------------------------------------------------ */
    /* Arranque                                                            */
    /* ------------------------------------------------------------------ */
    (function init() {
        var savedSkin = store('skin');
        if (savedSkin) document.body.setAttribute('data-skin', savedSkin);
        refreshColors();

        var v = parseFloat(store('volume'));
        setVolume(isNaN(v) ? 0.7 : v);

        shuffle = store('shuffle') === '1';
        $('btnShuffle').classList.toggle('on', shuffle);

        repeat = parseInt(store('repeat'), 10) || 0;
        $('btnRepeat').classList.toggle('on', repeat > 0);
        $('btnRepeat').title = ['Repeat: off', 'Repeat: all', 'Repeat: one'][repeat];

        setViz(parseInt(store('viz'), 10) || 0);
        setPlayIcon(false);

        resizeCanvas();
        requestAnimationFrame(draw);

        loadDeclaredPlaylist();
        updateNowPlaying();

        if (!tracks.length) {
            $('statusText').textContent = 'Playlist is empty — drop your .mp3 files here or list them in playlist.js';
        }
    })();

})();

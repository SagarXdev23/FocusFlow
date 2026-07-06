/**
 * FocusFlow — Music Module (Web Audio API)
 * Generates procedural ambient audio for focus sessions.
 * Tracks: Rain, Ambient Drone, Lofi, Focus (Binaural)
 * No external audio files needed — everything is synthesized.
 */
(function () {
  'use strict';

  var Music = {
    currentTrack: 'mute',
    buttons: {},
    audioCtx: null,
    masterGain: null,
    activeNodes: [],   // all currently playing audio nodes
    fadeTime: 1.2,     // seconds for crossfade
    volume: 0.45,

    init: function () {
      this.buttons = {
        rain: document.getElementById('btn-music-rain'),
        ambient: document.getElementById('btn-music-ambient'),
        lofi: document.getElementById('btn-music-lofi'),
        focus: document.getElementById('btn-music-focus'),
        mute: document.getElementById('btn-music-mute')
      };

      this.setupListeners();

      // Load saved preference (just UI state, don't auto-play — browser blocks it)
      var savedTrack = localStorage.getItem('focusflow_music');
      if (savedTrack && savedTrack !== 'mute' && this.buttons[savedTrack]) {
        this._updateButtonUI(savedTrack);
      }
    },

    _ensureContext: function () {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.audioCtx.createGain();
        this.masterGain.gain.value = this.volume;
        this.masterGain.connect(this.audioCtx.destination);
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
    },

    setupListeners: function () {
      var self = this;

      if (this.buttons.rain) this.buttons.rain.addEventListener('click', function () { self.setTrack('rain'); });
      if (this.buttons.ambient) this.buttons.ambient.addEventListener('click', function () { self.setTrack('ambient'); });
      if (this.buttons.lofi) this.buttons.lofi.addEventListener('click', function () { self.setTrack('lofi'); });
      if (this.buttons.focus) this.buttons.focus.addEventListener('click', function () { self.setTrack('focus'); });
      if (this.buttons.mute) this.buttons.mute.addEventListener('click', function () { self.setTrack('mute'); });
    },

    setTrack: function (trackName) {
      // If clicking the same active track, toggle mute
      if (trackName === this.currentTrack && trackName !== 'mute') {
        trackName = 'mute';
      }

      // Stop all current audio
      this._stopAll();

      // Update button styles
      this._updateButtonUI(trackName);

      this.currentTrack = trackName;
      localStorage.setItem('focusflow_music', trackName);

      // Play selected track
      if (trackName !== 'mute') {
        this._ensureContext();
        this._startTrack(trackName);
      }
    },

    _updateButtonUI: function (trackName) {
      for (var btnKey in this.buttons) {
        if (this.buttons[btnKey]) {
          if (btnKey === trackName) {
            this.buttons[btnKey].classList.add('active');
            this.buttons[btnKey].style.opacity = '1';
            this.buttons[btnKey].style.background = 'rgba(99, 102, 241, 0.25)';
          } else {
            this.buttons[btnKey].classList.remove('active');
            this.buttons[btnKey].style.opacity = '0.5';
            this.buttons[btnKey].style.background = 'transparent';
          }
        }
      }
    },

    _startTrack: function (trackName) {
      switch (trackName) {
        case 'rain':
          this._createRain();
          break;
        case 'ambient':
          this._createAmbient();
          break;
        case 'lofi':
          this._createLofi();
          break;
        case 'focus':
          this._createFocus();
          break;
      }
    },

    /* ═══════════════════════════════════════════
       RAIN — Layered filtered noise + droplets
       ═══════════════════════════════════════════ */
    _createRain: function () {
      var ctx = this.audioCtx;
      var master = this.masterGain;
      var self = this;

      // --- Layer 1: Continuous rain (filtered white noise) ---
      var bufferSize = ctx.sampleRate * 4;
      var noiseBuffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
      for (var ch = 0; ch < 2; ch++) {
        var data = noiseBuffer.getChannelData(ch);
        for (var i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1);
        }
      }

      var noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

      // Band-pass filter to shape white noise into rain
      var rainFilter = ctx.createBiquadFilter();
      rainFilter.type = 'bandpass';
      rainFilter.frequency.value = 1800;
      rainFilter.Q.value = 0.5;

      // Highpass to remove rumble
      var highpass = ctx.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.value = 400;
      highpass.Q.value = 0.3;

      var rainGain = ctx.createGain();
      rainGain.gain.value = 0;
      rainGain.gain.linearRampToValueAtTime(0.6, ctx.currentTime + this.fadeTime);

      noiseSource.connect(rainFilter);
      rainFilter.connect(highpass);
      highpass.connect(rainGain);
      rainGain.connect(master);
      noiseSource.start();

      this.activeNodes.push({ source: noiseSource, gain: rainGain });

      // --- Layer 2: Low rumble (distant thunder/ambience) ---
      var rumbleBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      var rumbleData = rumbleBuffer.getChannelData(0);
      for (var i = 0; i < bufferSize; i++) {
        rumbleData[i] = (Math.random() * 2 - 1);
      }

      var rumbleSource = ctx.createBufferSource();
      rumbleSource.buffer = rumbleBuffer;
      rumbleSource.loop = true;

      var rumbleLow = ctx.createBiquadFilter();
      rumbleLow.type = 'lowpass';
      rumbleLow.frequency.value = 150;
      rumbleLow.Q.value = 0.7;

      var rumbleGain = ctx.createGain();
      rumbleGain.gain.value = 0;
      rumbleGain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + this.fadeTime);

      rumbleSource.connect(rumbleLow);
      rumbleLow.connect(rumbleGain);
      rumbleGain.connect(master);
      rumbleSource.start();

      this.activeNodes.push({ source: rumbleSource, gain: rumbleGain });

      // --- Layer 3: Raindrop patter (high-frequency crackle) ---
      var crackleBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      var crackleData = crackleBuffer.getChannelData(0);
      for (var i = 0; i < bufferSize; i++) {
        // Sparse crackle — mostly silence with random pops
        crackleData[i] = Math.random() < 0.02 ? (Math.random() * 2 - 1) * 0.6 : 0;
      }

      var crackleSource = ctx.createBufferSource();
      crackleSource.buffer = crackleBuffer;
      crackleSource.loop = true;

      var crackleHigh = ctx.createBiquadFilter();
      crackleHigh.type = 'highpass';
      crackleHigh.frequency.value = 3000;

      var crackleGain = ctx.createGain();
      crackleGain.gain.value = 0;
      crackleGain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + this.fadeTime);

      crackleSource.connect(crackleHigh);
      crackleHigh.connect(crackleGain);
      crackleGain.connect(master);
      crackleSource.start();

      this.activeNodes.push({ source: crackleSource, gain: crackleGain });

      // --- Slow modulation of rain intensity ---
      this._startModulation(rainFilter, 'frequency', 1200, 2400, 8);
    },

    /* ═══════════════════════════════════════════
       AMBIENT — Warm evolving drone pads
       ═══════════════════════════════════════════ */
    _createAmbient: function () {
      var ctx = this.audioCtx;
      var master = this.masterGain;

      // Chord frequencies — Cmaj7 voicing in low register
      var freqs = [65.41, 82.41, 98.00, 123.47, 146.83]; // C2, E2, G2, B2, D3

      for (var i = 0; i < freqs.length; i++) {
        var osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freqs[i];

        // Slight detune for warmth
        osc.detune.value = (Math.random() - 0.5) * 12;

        var oscGain = ctx.createGain();
        oscGain.gain.value = 0;
        oscGain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + this.fadeTime + i * 0.3);

        // Very slow LFO for each voice
        var lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.05 + Math.random() * 0.1; // 0.05-0.15 Hz

        var lfoGain = ctx.createGain();
        lfoGain.gain.value = 0.03;

        lfo.connect(lfoGain);
        lfoGain.connect(oscGain.gain);
        lfo.start();

        osc.connect(oscGain);
        oscGain.connect(master);
        osc.start();

        this.activeNodes.push({ source: osc, gain: oscGain, extra: [lfo] });
      }

      // Add a soft filtered noise bed for texture
      var bufferSize = ctx.sampleRate * 4;
      var noiseBuffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
      for (var ch = 0; ch < 2; ch++) {
        var data = noiseBuffer.getChannelData(ch);
        var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (var j = 0; j < bufferSize; j++) {
          var white = Math.random() * 2 - 1;
          // Pink noise approximation
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          data[j] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
          b6 = white * 0.115926;
        }
      }

      var noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

      var lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 300;
      lp.Q.value = 0.5;

      var noiseGain = ctx.createGain();
      noiseGain.gain.value = 0;
      noiseGain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + this.fadeTime);

      noiseSource.connect(lp);
      lp.connect(noiseGain);
      noiseGain.connect(master);
      noiseSource.start();

      this.activeNodes.push({ source: noiseSource, gain: noiseGain });
    },

    /* ═══════════════════════════════════════════
       LOFI — Warm chords + vinyl crackle + tape wow
       ═══════════════════════════════════════════ */
    _createLofi: function () {
      var ctx = this.audioCtx;
      var master = this.masterGain;
      var self = this;

      // --- Warm chord pad ---
      // Dm7 → Em7 → Fmaj7 → G chord progression via oscillators
      var chordSets = [
        [146.83, 174.61, 220.00, 261.63],  // Dm7
        [164.81, 196.00, 246.94, 293.66],  // Em7
        [174.61, 220.00, 261.63, 329.63],  // Fmaj7
        [196.00, 246.94, 293.66, 392.00]   // G
      ];

      var currentChord = 0;
      var chordOscs = [];
      var chordGains = [];

      // Create oscillators for chord
      for (var i = 0; i < 4; i++) {
        var osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = chordSets[0][i];
        osc.detune.value = (Math.random() - 0.5) * 15; // slight detune

        var gain = ctx.createGain();
        gain.gain.value = 0;
        gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + self.fadeTime);

        // Lowpass for warmth
        var warmth = ctx.createBiquadFilter();
        warmth.type = 'lowpass';
        warmth.frequency.value = 800;
        warmth.Q.value = 0.7;

        osc.connect(warmth);
        warmth.connect(gain);
        gain.connect(master);
        osc.start();

        chordOscs.push(osc);
        chordGains.push(gain);
        self.activeNodes.push({ source: osc, gain: gain });
      }

      // Chord progression — change every 8 seconds
      var chordTimer = setInterval(function () {
        currentChord = (currentChord + 1) % chordSets.length;
        var t = ctx.currentTime;
        for (var i = 0; i < chordOscs.length; i++) {
          chordOscs[i].frequency.linearRampToValueAtTime(chordSets[currentChord][i], t + 2);
        }
      }, 8000);

      self._chordTimer = chordTimer;

      // --- Sub bass ---
      var subOsc = ctx.createOscillator();
      subOsc.type = 'sine';
      subOsc.frequency.value = 55; // A1

      var subGain = ctx.createGain();
      subGain.gain.value = 0;
      subGain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + self.fadeTime);

      subOsc.connect(subGain);
      subGain.connect(master);
      subOsc.start();
      self.activeNodes.push({ source: subOsc, gain: subGain });

      // --- Vinyl crackle ---
      var bufferSize = ctx.sampleRate * 3;
      var crackleBuffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
      for (var ch = 0; ch < 2; ch++) {
        var data = crackleBuffer.getChannelData(ch);
        for (var j = 0; j < bufferSize; j++) {
          // Sparse crackle simulating vinyl
          if (Math.random() < 0.003) {
            data[j] = (Math.random() * 2 - 1) * 0.3;
          } else {
            data[j] = (Math.random() * 2 - 1) * 0.01; // very faint hiss
          }
        }
      }

      var crackleSource = ctx.createBufferSource();
      crackleSource.buffer = crackleBuffer;
      crackleSource.loop = true;

      var crackleHP = ctx.createBiquadFilter();
      crackleHP.type = 'highpass';
      crackleHP.frequency.value = 2000;

      var crackleGain = ctx.createGain();
      crackleGain.gain.value = 0;
      crackleGain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + self.fadeTime);

      crackleSource.connect(crackleHP);
      crackleHP.connect(crackleGain);
      crackleGain.connect(master);
      crackleSource.start();
      self.activeNodes.push({ source: crackleSource, gain: crackleGain });

      // --- Tape wow (pitch wobble via LFO) ---
      var wowLfo = ctx.createOscillator();
      wowLfo.type = 'sine';
      wowLfo.frequency.value = 0.3;

      var wowDepth = ctx.createGain();
      wowDepth.gain.value = 4; // cents of detune wobble

      wowLfo.connect(wowDepth);
      for (var k = 0; k < chordOscs.length; k++) {
        wowDepth.connect(chordOscs[k].detune);
      }
      wowLfo.start();
      self.activeNodes.push({ source: wowLfo, gain: wowDepth });
    },

    /* ═══════════════════════════════════════════
       FOCUS — Binaural beats + brown noise
       Deep concentration audio
       ═══════════════════════════════════════════ */
    _createFocus: function () {
      var ctx = this.audioCtx;
      var master = this.masterGain;

      // --- Binaural beat (10 Hz alpha waves for focus) ---
      // Left ear: 200 Hz, Right ear: 210 Hz → 10 Hz binaural beat
      var merger = ctx.createChannelMerger(2);

      var oscLeft = ctx.createOscillator();
      oscLeft.type = 'sine';
      oscLeft.frequency.value = 200;

      var gainLeft = ctx.createGain();
      gainLeft.gain.value = 0;
      gainLeft.gain.linearRampToValueAtTime(0.12, ctx.currentTime + this.fadeTime);

      oscLeft.connect(gainLeft);
      gainLeft.connect(merger, 0, 0);

      var oscRight = ctx.createOscillator();
      oscRight.type = 'sine';
      oscRight.frequency.value = 210;

      var gainRight = ctx.createGain();
      gainRight.gain.value = 0;
      gainRight.gain.linearRampToValueAtTime(0.12, ctx.currentTime + this.fadeTime);

      oscRight.connect(gainRight);
      gainRight.connect(merger, 0, 1);

      merger.connect(master);
      oscLeft.start();
      oscRight.start();

      this.activeNodes.push({ source: oscLeft, gain: gainLeft });
      this.activeNodes.push({ source: oscRight, gain: gainRight });

      // --- Second binaural layer (40 Hz gamma for concentration) ---
      var merger2 = ctx.createChannelMerger(2);

      var oscLeft2 = ctx.createOscillator();
      oscLeft2.type = 'sine';
      oscLeft2.frequency.value = 300;

      var gainLeft2 = ctx.createGain();
      gainLeft2.gain.value = 0;
      gainLeft2.gain.linearRampToValueAtTime(0.05, ctx.currentTime + this.fadeTime + 1);

      oscLeft2.connect(gainLeft2);
      gainLeft2.connect(merger2, 0, 0);

      var oscRight2 = ctx.createOscillator();
      oscRight2.type = 'sine';
      oscRight2.frequency.value = 340;

      var gainRight2 = ctx.createGain();
      gainRight2.gain.value = 0;
      gainRight2.gain.linearRampToValueAtTime(0.05, ctx.currentTime + this.fadeTime + 1);

      oscRight2.connect(gainRight2);
      gainRight2.connect(merger2, 0, 1);

      merger2.connect(master);
      oscLeft2.start();
      oscRight2.start();

      this.activeNodes.push({ source: oscLeft2, gain: gainLeft2 });
      this.activeNodes.push({ source: oscRight2, gain: gainRight2 });

      // --- Brown noise bed ---
      var bufferSize = ctx.sampleRate * 4;
      var brownBuffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
      for (var ch = 0; ch < 2; ch++) {
        var data = brownBuffer.getChannelData(ch);
        var lastOut = 0;
        for (var i = 0; i < bufferSize; i++) {
          var white = Math.random() * 2 - 1;
          var brown = (lastOut + (0.02 * white)) / 1.02;
          lastOut = brown;
          data[i] = brown * 3.5;
        }
      }

      var brownSource = ctx.createBufferSource();
      brownSource.buffer = brownBuffer;
      brownSource.loop = true;

      var brownLP = ctx.createBiquadFilter();
      brownLP.type = 'lowpass';
      brownLP.frequency.value = 500;
      brownLP.Q.value = 0.3;

      var brownGain = ctx.createGain();
      brownGain.gain.value = 0;
      brownGain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + this.fadeTime);

      brownSource.connect(brownLP);
      brownLP.connect(brownGain);
      brownGain.connect(master);
      brownSource.start();

      this.activeNodes.push({ source: brownSource, gain: brownGain });

      // --- Slow evolving pad underneath ---
      var padFreqs = [110, 164.81, 220]; // A2, E3, A3
      for (var p = 0; p < padFreqs.length; p++) {
        var pad = ctx.createOscillator();
        pad.type = 'sine';
        pad.frequency.value = padFreqs[p];
        pad.detune.value = (Math.random() - 0.5) * 8;

        var padGain = ctx.createGain();
        padGain.gain.value = 0;
        padGain.gain.linearRampToValueAtTime(0.03, ctx.currentTime + this.fadeTime + 2);

        // Slow tremolo
        var trem = ctx.createOscillator();
        trem.type = 'sine';
        trem.frequency.value = 0.03 + Math.random() * 0.05;

        var tremGain = ctx.createGain();
        tremGain.gain.value = 0.015;

        trem.connect(tremGain);
        tremGain.connect(padGain.gain);
        trem.start();

        pad.connect(padGain);
        padGain.connect(master);
        pad.start();

        this.activeNodes.push({ source: pad, gain: padGain, extra: [trem] });
      }
    },

    /* ═══════════════════════════════════════════
       Utility — Slow modulation
       ═══════════════════════════════════════════ */
    _startModulation: function (filterNode, param, minVal, maxVal, periodSec) {
      var self = this;
      var startTime = Date.now();

      function modulate() {
        if (!self.audioCtx || self.currentTrack === 'mute') return;
        var elapsed = (Date.now() - startTime) / 1000;
        var t = (Math.sin(elapsed * (2 * Math.PI / periodSec)) + 1) / 2;
        filterNode[param].value = minVal + t * (maxVal - minVal);
        self._modRAF = requestAnimationFrame(modulate);
      }
      modulate();
    },

    /* ═══════════════════════════════════════════
       Stop all audio
       ═══════════════════════════════════════════ */
    _stopAll: function () {
      var ctx = this.audioCtx;

      // Cancel modulation
      if (this._modRAF) {
        cancelAnimationFrame(this._modRAF);
        this._modRAF = null;
      }

      // Clear chord timer (lofi)
      if (this._chordTimer) {
        clearInterval(this._chordTimer);
        this._chordTimer = null;
      }

      // Fade out and disconnect all nodes
      for (var i = 0; i < this.activeNodes.length; i++) {
        var node = this.activeNodes[i];
        try {
          if (node.gain && ctx) {
            node.gain.gain.cancelScheduledValues(ctx.currentTime);
            node.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
          }
          // Schedule stop after fade
          (function (n) {
            setTimeout(function () {
              try {
                if (n.source) n.source.stop();
              } catch (e) { /* already stopped */ }
              try {
                if (n.extra) {
                  for (var j = 0; j < n.extra.length; j++) {
                    n.extra[j].stop();
                  }
                }
              } catch (e) { /* already stopped */ }
            }, 600);
          })(node);
        } catch (e) { /* ignore */ }
      }

      this.activeNodes = [];
    },

    // --- Hooks for Timer module ---
    playCurrent: function () {
      if (this.currentTrack !== 'mute') {
        this._ensureContext();
        if (this.activeNodes.length === 0) {
          this._startTrack(this.currentTrack);
        }
      }
    },

    pauseCurrent: function () {
      this._stopAll();
    }
  };

  window.Music = Music;
})();

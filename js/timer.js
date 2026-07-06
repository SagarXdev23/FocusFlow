/**
 * FocusFlow — Timer Module
 * Focus session timer with duration picker, accurate countdown,
 * pause/resume, motivational quotes, and immersive UI.
 * Uses wall-clock time (Date.now()) for accuracy.
 */
(function () {
  'use strict';

  var QUOTES = [
    '"The secret of getting ahead is getting started." — Mark Twain',
    '"Focus on being productive instead of busy." — Tim Ferriss',
    '"Small daily improvements over time lead to stunning results." — Robin Sharma',
    '"You don\'t have to be great to start, but you have to start to be great." — Zig Ziglar',
    '"The only way to do great work is to love what you do." — Steve Jobs',
    '"It does not matter how slowly you go as long as you do not stop." — Confucius',
    '"Action is the foundational key to all success." — Pablo Picasso',
    '"Discipline is choosing what you want most over what you want now." — Abraham Lincoln',
    '"Start where you are. Use what you have. Do what you can." — Arthur Ashe',
    '"The harder you work for something, the greater you\'ll feel when you achieve it."',
    '"Don\'t watch the clock; do what it does. Keep going." — Sam Levenson',
    '"Your future is created by what you do today, not tomorrow." — Robert Kiyosaki',
    '"Success is the sum of small efforts repeated day in and day out." — Robert Collier',
    '"It always seems impossible until it\'s done." — Nelson Mandela',
    '"The way to get started is to quit talking and begin doing." — Walt Disney',
    '"Consistency is what transforms average into excellence."',
    '"One hour of focused work is worth three hours of distracted effort."',
    '"Progress, not perfection, is what matters."',
    '"Every expert was once a beginner."',
    '"You are one focused session away from a better day."',
    '"Deep work is the superpower of the 21st century." — Cal Newport',
    '"Starve your distractions, feed your focus."',
    '"Be stubborn about your goals, flexible about your methods."',
  ];

  var Timer = {
    duration: 1200,       // selected duration in seconds (default 20 min)
    remaining: 1200,
    elapsed: 0,
    intervalId: null,
    isPaused: false,
    isRunning: false,
    startedAt: null,      // wall-clock timestamp when current run started
    pausedElapsed: 0,     // seconds elapsed before last pause
    quoteIndex: 0,
    quoteInterval: null,
    _lastSessionId: null, // ID of the saved session (for reflection)

    init: function () {
      this.setupListeners();
    },

    /* ───────── Event Listeners ───────── */
    setupListeners: function () {
      var self = this;

      // Duration picker buttons
      var picker = document.getElementById('duration-picker');
      if (picker) {
        picker.addEventListener('click', function (e) {
          var opt = e.target.closest('.duration-option');
          if (!opt) return;
          var secs = parseInt(opt.getAttribute('data-duration'), 10);
          if (!isNaN(secs)) {
            self.selectDuration(secs);
            // Clear custom input
            var customInput = document.getElementById('custom-duration-input');
            if (customInput) customInput.value = '';
          }
        });
      }

      // Custom duration input
      var customInput = document.getElementById('custom-duration-input');
      if (customInput) {
        customInput.addEventListener('input', function () {
          var mins = parseInt(customInput.value, 10);
          if (!isNaN(mins) && mins >= 1 && mins <= 120) {
            self.duration = mins * 60;
            self.remaining = self.duration;
            // Deselect all preset buttons
            var options = document.querySelectorAll('.duration-option');
            options.forEach(function (o) { o.classList.remove('active'); });
          }
        });
      }

      // Begin session
      var beginBtn = document.getElementById('btn-begin-session');
      if (beginBtn) {
        beginBtn.addEventListener('click', function () {
          self.startSession();
        });
      }

      // Pause / Resume
      var pauseBtn = document.getElementById('btn-pause');
      if (pauseBtn) {
        pauseBtn.addEventListener('click', function () {
          self.togglePause();
        });
      }

      // End session
      var endBtn = document.getElementById('btn-end-session');
      if (endBtn) {
        endBtn.addEventListener('click', function () {
          self.endSession(true);
        });
      }

      // Back button
      var backBtn = document.getElementById('btn-back-from-session');
      if (backBtn) {
        backBtn.addEventListener('click', function () {
          if (window.App) App.navigateTo('dashboard');
        });
      }
    },

    /* ───────── Duration Selection ───────── */
    selectDuration: function (seconds) {
      this.duration = seconds;
      this.remaining = seconds;

      // Update active class on buttons
      var options = document.querySelectorAll('.duration-option');
      options.forEach(function (opt) {
        var d = parseInt(opt.getAttribute('data-duration'), 10);
        opt.classList.toggle('active', d === seconds);
      });
    },

    /* ───────── Start Session ───────── */
    startSession: function () {
      var self = this;

      // Switch UI phases
      var preEl = document.getElementById('session-pre');
      var activeEl = document.getElementById('session-active');
      if (preEl) preEl.classList.add('hidden');
      if (activeEl) activeEl.classList.remove('hidden');

      // Set visuals to Zen Focus mode
      if (window.Visuals) {
        Visuals.setMode('FOCUS');
      }

      // Reset state
      this.remaining = this.duration;
      this.elapsed = 0;
      this.pausedElapsed = 0;
      this.isPaused = false;
      this.isRunning = true;
      this.startedAt = Date.now();

      // Render timer ring
      this.renderTimerRing();
      this.updateDisplay();

      // Reset pause/play icons
      var pauseIcon = document.getElementById('pause-icon');
      var playIcon = document.getElementById('play-icon');
      if (pauseIcon) pauseIcon.classList.remove('hidden');
      if (playIcon) playIcon.classList.add('hidden');

      // Update label
      var label = document.getElementById('timer-label');
      if (label) label.textContent = 'Stay focused. You\'ve got this.';

      // Start interval
      this.intervalId = setInterval(function () {
        self.tick();
      }, 250); // tick every 250ms for smooth ring + accurate timing

      // Start quotes
      this.startQuoteRotation();
    },

    /* ───────── Timer Tick ───────── */
    tick: function () {
      if (this.isPaused || !this.isRunning) return;

      // Wall-clock elapsed calculation for accuracy
      var wallElapsed = (Date.now() - this.startedAt) / 1000;
      this.elapsed = this.pausedElapsed + wallElapsed;
      this.remaining = Math.max(0, this.duration - this.elapsed);

      this.updateDisplay();

      if (this.remaining <= 0) {
        this.completeSession();
      }
    },

    /* ───────── Update Display ───────── */
    updateDisplay: function () {
      var totalSec = Math.ceil(this.remaining);
      var mins = Math.floor(totalSec / 60);
      var secs = totalSec % 60;

      var minEl = document.getElementById('timer-minutes');
      var secEl = document.getElementById('timer-seconds');
      if (minEl) minEl.textContent = String(mins).padStart(2, '0');
      if (secEl) secEl.textContent = String(secs).padStart(2, '0');

      // Update ring progress
      this.updateTimerRing();
    },

    /* ───────── Pause / Resume ───────── */
    togglePause: function () {
      if (!this.isRunning) return;

      var pauseIcon = document.getElementById('pause-icon');
      var playIcon = document.getElementById('play-icon');
      var label = document.getElementById('timer-label');

      if (this.isPaused) {
        // Resume
        this.isPaused = false;
        this.startedAt = Date.now();
        if (pauseIcon) pauseIcon.classList.remove('hidden');
        if (playIcon) playIcon.classList.add('hidden');
        if (label) label.textContent = 'Stay focused. You\'ve got this.';

        var btn = document.getElementById('btn-pause');
        if (btn) btn.setAttribute('aria-label', 'Pause session');
      } else {
        // Pause — save elapsed so far
        this.isPaused = true;
        var wallElapsed = (Date.now() - this.startedAt) / 1000;
        this.pausedElapsed += wallElapsed;
        if (pauseIcon) pauseIcon.classList.add('hidden');
        if (playIcon) playIcon.classList.remove('hidden');
        if (label) label.textContent = 'Paused — take a breath.';

        var btn2 = document.getElementById('btn-pause');
        if (btn2) btn2.setAttribute('aria-label', 'Resume session');
      }
    },

    /* ───────── End Session Early ───────── */
    endSession: function (early) {
      this._clearTimers();

      var actualSec = Math.round(this.elapsed);

      // Save as incomplete session
      var session = Store.saveSession({
        duration: this.duration,
        actualDuration: actualSec,
        completed: !early,
        reflection: null
      });

      this._lastSessionId = session.id;
      this.resetState();

      if (early) {
        if (window.App) App.navigateTo('dashboard');
      } else {
        // Completed — go to reflection
        if (window.Reflection) Reflection.start(session.id);
        if (window.App) App.navigateTo('reflection');
      }
    },

    /* ───────── Complete Session ───────── */
    completeSession: function () {
      this._clearTimers();

      var actualSec = Math.round(this.duration); // completed full duration

      var session = Store.saveSession({
        duration: this.duration,
        actualDuration: actualSec,
        completed: true,
        reflection: null
      });

      this._lastSessionId = session.id;
      this.resetState();

      // Go to reflection
      if (window.Reflection) Reflection.start(session.id);
      if (window.App) App.navigateTo('reflection');
    },

    /* ───────── Timer Ring ───────── */
    renderTimerRing: function () {
      var container = document.getElementById('timer-ring-container');
      if (!container) return;

      // Responsive size - Massive and Spectacular!
      var maxRingSize = window.innerHeight < 700 ? 320 : 440;
      var size = Math.min(window.innerWidth * 0.85, maxRingSize);
      var strokeWidth = 14;
      var radius = (size - strokeWidth - 30) / 2;
      var circumference = 2 * Math.PI * radius;
      var center = size / 2;
      var gradId = 'timer-grad';

      var svg =
        '<svg id="timer-ring-svg" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" aria-hidden="true" style="overflow: visible;">' +
          '<defs>' +
            '<linearGradient id="' + gradId + '" x1="0%" y1="0%" x2="100%" y2="100%">' +
              '<stop offset="0%" style="stop-color:#818cf8"/>' +
              '<stop offset="100%" style="stop-color:#c084fc"/>' +
            '</linearGradient>' +
            '<filter id="heavy-glow" x="-20%" y="-20%" width="140%" height="140%">' +
              '<feGaussianBlur stdDeviation="8" result="blur" />' +
              '<feMerge>' +
                '<feMergeNode in="blur"/>' +
                '<feMergeNode in="SourceGraphic"/>' +
              '</feMerge>' +
            '</filter>' +
          '</defs>' +
          '<g transform="rotate(-90 ' + center + ' ' + center + ')">' +
            '<circle class="progress-ring__bg" cx="' + center + '" cy="' + center + '" r="' + radius + '" stroke-width="' + strokeWidth + '" style="stroke: rgba(255,255,255,0.05); fill: none;"/>' +
            '<circle id="timer-ring-fill" class="progress-ring__fill" cx="' + center + '" cy="' + center + '" r="' + radius + '" stroke-width="' + strokeWidth + '"' +
              ' stroke="url(#' + gradId + ')"' +
              ' stroke-linecap="round"' +
              ' fill="none"' +
              ' filter="url(#heavy-glow)"' +
              ' stroke-dasharray="' + circumference + '"' +
              ' stroke-dashoffset="0"' +
              ' style="transition: stroke-dashoffset 0.3s cubic-bezier(0.4, 0, 0.2, 1);"' +
            '/>' +
          '</g>' +
        '</svg>';

      // Store circumference for updates
      this._ringCircumference = circumference;

      container.innerHTML = svg;
    },

    updateTimerRing: function () {
      var fillEl = document.getElementById('timer-ring-fill');
      if (!fillEl || !this._ringCircumference) return;

      var progress = this.duration > 0 ? this.elapsed / this.duration : 0;
      progress = Math.min(progress, 1);
      // Negative offset makes it empty out clockwise
      var offset = -(progress * this._ringCircumference);
      fillEl.setAttribute('stroke-dashoffset', offset);
    },

    /* ───────── Quotes ───────── */
    startQuoteRotation: function () {
      var self = this;

      // Shuffle quotes
      this._shuffledQuotes = QUOTES.slice().sort(function () { return Math.random() - 0.5; });
      this.quoteIndex = 0;

      this._showQuote();

      this.quoteInterval = setInterval(function () {
        self.quoteIndex = (self.quoteIndex + 1) % self._shuffledQuotes.length;
        self._showQuote();
      }, 90000); // 90 seconds
    },

    _showQuote: function () {
      var el = document.getElementById('quote-text');
      if (!el) return;

      // Fade out and slide down slightly
      el.style.transition = 'opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1), transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
      el.style.opacity = '0';
      el.style.transform = 'translateY(6px)';
      
      var self = this;
      setTimeout(function () {
        el.textContent = self._shuffledQuotes[self.quoteIndex];
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, 400);
    },

    /* ───────── Reset ───────── */
    resetState: function () {
      this.remaining = this.duration;
      this.elapsed = 0;
      this.pausedElapsed = 0;
      this.isPaused = false;
      this.isRunning = false;
      this.startedAt = null;

      // Reset canvas mode to Normal
      if (window.Visuals) {
        Visuals.setMode('NORMAL');
      }

      // Show pre-session, hide active
      var preEl = document.getElementById('session-pre');
      var activeEl = document.getElementById('session-active');
      if (preEl) preEl.classList.remove('hidden');
      if (activeEl) activeEl.classList.add('hidden');
    },

    _clearTimers: function () {
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
      if (this.quoteInterval) {
        clearInterval(this.quoteInterval);
        this.quoteInterval = null;
      }
    },

    getLastSessionId: function () {
      return this._lastSessionId;
    }
  };

  window.Timer = Timer;
})();

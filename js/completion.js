/**
 * FocusFlow — Completion Module
 * Celebration screen after a completed focus session.
 * Shows confetti, session summary, streak update, and navigation CTAs.
 */
(function () {
  'use strict';

  var CONFETTI_COLORS = ['#6366F1', '#8B5CF6', '#A78BFA', '#34D399', '#FBBF24', '#F5F5F7', '#FB923C'];

  var MESSAGES = {
    first:    'You completed your first session! The journey begins. 🌟',
    streak1:  'Great start! Come back tomorrow to build your streak.',
    streak3:  'Three days strong! You\'re building real momentum. 🔥',
    streak7:  'A full week of consistency! That\'s incredible discipline. 💪',
    streak14: 'Two weeks of focus. You\'re unstoppable! 🚀',
    streak30: 'A whole month! You\'ve built a true habit. 🏆',
    record:   'New personal record streak! You\'re on fire! 🔥🔥🔥',
    default:  'You stayed focused and completed your session. Well done!'
  };

  var Completion = {
    autoRedirectTimeout: null,

    init: function () {
      this.setupListeners();
    },

    /**
     * Show the completion screen with session data.
     * @param {object|null} sessionData — the completed session from Store
     */
    show: function (sessionData) {
      var self = this;

      // Duration
      var durationMin = 0;
      if (sessionData) {
        durationMin = Math.round((sessionData.actualDuration || sessionData.duration || 0) / 60);
      }
      var durEl = document.getElementById('completion-duration');
      if (durEl) durEl.textContent = durationMin;

      // Streak
      var streak = Store.getStreak();
      var streakEl = document.getElementById('completion-streak');
      if (streakEl) streakEl.textContent = '🔥 ' + streak.current;

      // Message
      var msgEl = document.getElementById('completion-message');
      if (msgEl) msgEl.textContent = this._getMessage(streak);

      // Confetti!
      this.createConfetti();

      // Auto-redirect to dashboard after 15 seconds
      this.autoRedirectTimeout = setTimeout(function () {
        if (window.App) App.navigateTo('dashboard');
      }, 15000);
    },

    /* ───────── Confetti ───────── */
    createConfetti: function () {
      var container = document.getElementById('confetti-container');
      if (!container) return;

      container.innerHTML = '';

      var pieceCount = 60;
      for (var i = 0; i < pieceCount; i++) {
        var piece = document.createElement('div');
        piece.className = 'confetti-piece';

        var color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
        var left = Math.random() * 100;
        var width = Math.random() * 8 + 5;
        var height = Math.random() * 6 + 4;
        var duration = Math.random() * 2 + 2;
        var delay = Math.random() * 1.5;
        var rotation = Math.random() * 360;

        piece.style.cssText =
          'left:' + left + '%;' +
          'width:' + width + 'px;' +
          'height:' + height + 'px;' +
          'background:' + color + ';' +
          '--duration:' + duration + 's;' +
          'animation-delay:' + delay + 's;' +
          'transform: rotate(' + rotation + 'deg);' +
          'border-radius:' + (Math.random() > 0.5 ? '50%' : '2px') + ';';

        container.appendChild(piece);
      }

      // Clean up confetti after animations complete
      setTimeout(function () {
        if (container) container.innerHTML = '';
      }, 5000);
    },

    /* ───────── Message Selection ───────── */
    _getMessage: function (streak) {
      var stats = Store.getTotalStats();

      if (stats.totalSessions === 1) return MESSAGES.first;
      if (streak.current === streak.longest && streak.current > 1) return MESSAGES.record;
      if (streak.current >= 30) return MESSAGES.streak30;
      if (streak.current >= 14) return MESSAGES.streak14;
      if (streak.current >= 7) return MESSAGES.streak7;
      if (streak.current >= 3) return MESSAGES.streak3;
      if (streak.current === 1) return MESSAGES.streak1;

      return MESSAGES.default;
    },

    /* ───────── Event Listeners ───────── */
    setupListeners: function () {
      var self = this;

      var anotherBtn = document.getElementById('btn-start-another');
      if (anotherBtn) {
        anotherBtn.addEventListener('click', function () {
          self.cleanup();
          if (window.App) App.navigateTo('session');
        });
      }

      var dashBtn = document.getElementById('btn-back-dashboard');
      if (dashBtn) {
        dashBtn.addEventListener('click', function () {
          self.cleanup();
          if (window.App) App.navigateTo('dashboard');
        });
      }
    },

    /* ───────── Cleanup ───────── */
    cleanup: function () {
      if (this.autoRedirectTimeout) {
        clearTimeout(this.autoRedirectTimeout);
        this.autoRedirectTimeout = null;
      }
      var container = document.getElementById('confetti-container');
      if (container) container.innerHTML = '';
    }
  };

  window.Completion = Completion;
})();

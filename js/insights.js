/**
 * FocusFlow — Insights Module
 * Pattern-based insight generator that analyzes session history
 * and produces warm, actionable insight strings.
 * Depends on window.Store being initialised.
 */
(function () {
  'use strict';

  const DAY_LABELS = [
    'Sundays',
    'Mondays',
    'Tuesdays',
    'Wednesdays',
    'Thursdays',
    'Fridays',
    'Saturdays',
  ];

  const MILESTONES = [1, 5, 10, 25, 50, 100, 250, 500, 1000];

  const WELCOME_MESSAGES = [
    "Welcome to FocusFlow! Start your first session to begin tracking your focus journey. ✨",
    "Ready to build your focus muscle? Start a session and let's get going! 💪",
    "Your focus journey starts now. Set a goal and begin your first session! 🎯",
  ];

  /* ------------------------------------------------------------------ */
  /*  Time-window classification                                         */
  /* ------------------------------------------------------------------ */

  const TIME_WINDOWS = {
    morning:   { label: 'the morning',   start: 5,  end: 12 },
    afternoon: { label: 'the afternoon', start: 12, end: 17 },
    evening:   { label: 'the evening',   start: 17, end: 21 },
    night:     { label: 'the night',     start: 21, end: 5  },
  };

  /**
   * Classify an "HH:MM" string into a time window key.
   */
  function _classifyTime(timeStr) {
    const hour = parseInt(timeStr.split(':')[0], 10);
    if (hour >= 5  && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  }

  /* ------------------------------------------------------------------ */
  /*  Insight generators                                                 */
  /* ------------------------------------------------------------------ */

  function _getBestFocusTime(sessions) {
    const completed = sessions.filter(function (s) { return s.completed; });
    if (completed.length < 3) return null;

    const counts = { morning: 0, afternoon: 0, evening: 0, night: 0 };
    completed.forEach(function (s) {
      counts[_classifyTime(s.startTime)]++;
    });

    let best = 'morning';
    let max = 0;
    for (var key in counts) {
      if (counts[key] > max) {
        max = counts[key];
        best = key;
      }
    }

    return 'You focus best in ' + TIME_WINDOWS[best].label + '. Try scheduling sessions then. ✨';
  }

  function _getAverageDuration(sessions) {
    const completed = sessions.filter(function (s) { return s.completed; });
    if (completed.length === 0) return null;

    let total = 0;
    completed.forEach(function (s) {
      total += s.actualDuration || 0;
    });

    const avgMinutes = Math.round(total / completed.length / 60);
    return 'Your average focus session is ' + avgMinutes + ' minutes. Keep it up! 💪';
  }

  function _getStreakInsight(streak) {
    if (!streak) return null;

    if (streak.current === 0) {
      return 'Start a session today to begin a new streak! 🔥';
    }
    if (streak.current === streak.longest && streak.current > 1) {
      return "You're on your longest streak ever — " + streak.current + ' days! 🔥';
    }
    if (streak.current > 0 && streak.current < streak.longest) {
      return (
        "You're on a " +
        streak.current +
        '-day streak! Your best is ' +
        streak.longest +
        ' days. Keep going! 💪'
      );
    }
    if (streak.current === 1) {
      return "Great start! You've got a 1-day streak going. Come back tomorrow! ✨";
    }

    return null;
  }

  function _getConsistencyInsight(sessions) {
    const completed = sessions.filter(function (s) { return s.completed; });
    if (completed.length < 5) return null;

    const dayCounts = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat
    completed.forEach(function (s) {
      const d = new Date(s.date + 'T00:00:00');
      dayCounts[d.getDay()]++;
    });

    let bestDay = 0;
    let max = 0;
    for (var i = 0; i < 7; i++) {
      if (dayCounts[i] > max) {
        max = dayCounts[i];
        bestDay = i;
      }
    }

    return "You're most consistent on " + DAY_LABELS[bestDay] + '. Nice rhythm! 🎯';
  }

  function _getDistractionInsight(sessions) {
    const freq = {};
    let hasAny = false;

    sessions.forEach(function (s) {
      if (s.reflection && Array.isArray(s.reflection.distractions)) {
        s.reflection.distractions.forEach(function (d) {
          const key = d.trim().toLowerCase();
          if (key) {
            freq[key] = (freq[key] || 0) + 1;
            hasAny = true;
          }
        });
      }
    });

    if (!hasAny) return null;

    let top = '';
    let max = 0;
    for (var key in freq) {
      if (freq[key] > max) {
        max = freq[key];
        top = key;
      }
    }

    // Capitalise first letter
    var label = top.charAt(0).toUpperCase() + top.slice(1);
    return label + ' is your top distraction. Try putting it in another room. 🚀';
  }

  function _getMilestoneInsight(stats) {
    if (!stats) return null;

    var total = stats.totalSessions;

    // Check if just passed a milestone
    for (var i = MILESTONES.length - 1; i >= 0; i--) {
      var m = MILESTONES[i];
      if (total >= m && total < m + 3) {
        return "You've completed " + total + ' focus sessions! Amazing progress. 🎯';
      }
    }

    // Check if near next milestone
    for (var j = 0; j < MILESTONES.length; j++) {
      var next = MILESTONES[j];
      if (total < next) {
        var remaining = next - total;
        if (remaining <= 3) {
          return 'Just ' + remaining + ' more session' + (remaining === 1 ? '' : 's') + ' to reach ' + next + '! You got this! 💪';
        }
        break;
      }
    }

    return null;
  }

  /* ------------------------------------------------------------------ */
  /*  Public API                                                         */
  /* ------------------------------------------------------------------ */

  var Insights = {
    /**
     * Returns a single insight string based on current data.
     */
    generate: function () {
      // Ensure Store is available
      if (!window.Store || typeof window.Store.getData !== 'function') {
        return WELCOME_MESSAGES[0];
      }

      var data = window.Store.getData();
      if (!data) return WELCOME_MESSAGES[0];

      var sessions = data.sessions || [];
      var streak = window.Store.getStreak();
      var stats = window.Store.getTotalStats();

      // --- Fewer than 3 sessions: welcome / streak message ---
      if (sessions.length < 3) {
        var streakMsg = _getStreakInsight(streak);
        if (streakMsg) return streakMsg;
        return WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)];
      }

      // --- Near a milestone? Prioritise that. ---
      var milestoneMsg = _getMilestoneInsight(stats);
      if (milestoneMsg) return milestoneMsg;

      // --- Rotate through remaining insights based on day of week ---
      var generators = [
        function () { return _getBestFocusTime(sessions); },
        function () { return _getStreakInsight(streak); },
        function () { return _getConsistencyInsight(sessions); },
        function () { return _getAverageDuration(sessions); },
        function () { return _getDistractionInsight(sessions); },
      ];

      // Pick based on day-of-week so user sees variety across the week
      var dayIndex = new Date().getDay(); // 0-6
      var startIdx = dayIndex % generators.length;

      // Try from the picked index, then wrap around
      for (var i = 0; i < generators.length; i++) {
        var idx = (startIdx + i) % generators.length;
        var result = generators[idx]();
        if (result) return result;
      }

      // Ultimate fallback
      return "You're building a great focus habit. Keep it going! ✨";
    },

    /* Expose internals for direct use if needed */
    _getBestFocusTime: _getBestFocusTime,
    _getAverageDuration: _getAverageDuration,
    _getStreakInsight: _getStreakInsight,
    _getConsistencyInsight: _getConsistencyInsight,
    _getDistractionInsight: _getDistractionInsight,
    _getMilestoneInsight: _getMilestoneInsight,
  };

  /* ------------------------------------------------------------------ */
  /*  Expose globally                                                    */
  /* ------------------------------------------------------------------ */
  window.Insights = Insights;
})();

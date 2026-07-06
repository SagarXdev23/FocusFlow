/**
 * FocusFlow — Store Module
 * localStorage-based persistence layer and single source of truth.
 * Exposes window.Store with synchronous methods for sessions, goals,
 * streaks, reflections, and user data.
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'focusflow_data';

  const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  /* ------------------------------------------------------------------ */
  /*  Internal state                                                     */
  /* ------------------------------------------------------------------ */
  let _data = null;

  /* ------------------------------------------------------------------ */
  /*  Helpers                                                            */
  /* ------------------------------------------------------------------ */

  function _generateId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback: 32-char hex string
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function _formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function _today() {
    return _formatDate(new Date());
  }

  function _getDateDaysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return _formatDate(d);
  }

  function _currentTime() {
    const now = new Date();
    return (
      String(now.getHours()).padStart(2, '0') +
      ':' +
      String(now.getMinutes()).padStart(2, '0')
    );
  }

  function _defaultData() {
    return {
      user: {
        name: '',
        createdAt: new Date().toISOString(),
        dailyGoalMinutes: 60,
      },
      sessions: [],
      goals: [],
    };
  }

  /**
   * Returns the day-of-week index (0 = Mon … 6 = Sun) for a YYYY-MM-DD string.
   */
  function _isoDayIndex(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return (d.getDay() + 6) % 7; // JS Sunday=0 → we want Monday=0
  }

  /**
   * Get the date string one day before a given YYYY-MM-DD.
   */
  function _dayBefore(dateStr) {
    const d = new Date(dateStr + 'T12:00:00'); // noon to avoid DST issues
    d.setDate(d.getDate() - 1);
    return _formatDate(d);
  }

  /**
   * Get the Monday of the current ISO week.
   */
  function _getMonday() {
    const now = new Date();
    const day = now.getDay(); // 0=Sun
    const diff = day === 0 ? 6 : day - 1; // days since Monday
    const mon = new Date(now);
    mon.setDate(now.getDate() - diff);
    mon.setHours(0, 0, 0, 0);
    return mon;
  }

  /* ------------------------------------------------------------------ */
  /*  Persistence                                                        */
  /* ------------------------------------------------------------------ */

  function _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(_data));
    } catch (e) {
      console.error('[FocusFlow Store] Failed to save:', e);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Public API                                                         */
  /* ------------------------------------------------------------------ */

  const Store = {
    /* -------- lifecycle -------- */

    init: function () {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          _data = JSON.parse(raw);
          // Ensure all top-level keys exist (forward compat)
          if (!_data.user) _data.user = _defaultData().user;
          if (!Array.isArray(_data.sessions)) _data.sessions = [];
          if (!Array.isArray(_data.goals)) _data.goals = [];
        } else {
          _data = _defaultData();
          _save();
        }
      } catch (e) {
        console.warn('[FocusFlow Store] Corrupt data, resetting.', e);
        _data = _defaultData();
        _save();
      }
      return _data;
    },

    getData: function () {
      return _data;
    },

    _save: _save,

    /* -------- user -------- */

    getUserName: function () {
      return (_data && _data.user && _data.user.name) || '';
    },

    setUserName: function (name) {
      _data.user.name = name;
      _save();
    },

    isFirstRun: function () {
      return !this.getUserName();
    },

    /* -------- sessions -------- */

    saveSession: function (session) {
      const entry = {
        id: _generateId(),
        date: _today(),
        startTime: _currentTime(),
        duration: session.duration || 0,
        actualDuration: session.actualDuration || 0,
        completed: !!session.completed,
        reflection: session.reflection || null,
      };
      _data.sessions.push(entry);
      _save();
      return entry;
    },

    getTodaySessions: function () {
      const today = _today();
      return _data.sessions.filter(function (s) {
        return s.date === today;
      });
    },

    getTodayMinutes: function () {
      const today = _today();
      let totalSeconds = 0;
      _data.sessions.forEach(function (s) {
        if (s.date === today && s.completed) {
          totalSeconds += s.actualDuration || 0;
        }
      });
      return Math.round(totalSeconds / 60);
    },

    getWeekData: function () {
      const monday = _getMonday();
      const result = [];

      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const dateStr = _formatDate(d);

        let minutes = 0;
        let sessionCount = 0;

        _data.sessions.forEach(function (s) {
          if (s.date === dateStr && s.completed) {
            minutes += (s.actualDuration || 0) / 60;
            sessionCount++;
          }
        });

        result.push({
          day: DAY_NAMES[i],
          date: dateStr,
          minutes: Math.round(minutes),
          sessions: sessionCount,
        });
      }

      return result;
    },

    getMonthData: function () {
      const result = [];

      for (let i = 29; i >= 0; i--) {
        const dateStr = _getDateDaysAgo(i);
        let minutes = 0;

        _data.sessions.forEach(function (s) {
          if (s.date === dateStr && s.completed) {
            minutes += (s.actualDuration || 0) / 60;
          }
        });

        minutes = Math.round(minutes);

        let level = 0;
        if (minutes > 0 && minutes < 15) level = 1;
        else if (minutes >= 15 && minutes < 30) level = 2;
        else if (minutes >= 30 && minutes < 60) level = 3;
        else if (minutes >= 60) level = 4;

        result.push({ date: dateStr, minutes: minutes, level: level });
      }

      return result;
    },

    getTotalStats: function () {
      let totalSeconds = 0;
      let completedCount = 0;
      const total = _data.sessions.length;

      _data.sessions.forEach(function (s) {
        if (s.completed) {
          totalSeconds += s.actualDuration || 0;
          completedCount++;
        }
      });

      return {
        totalMinutes: Math.round(totalSeconds / 60),
        totalSessions: completedCount,
        completionRate: total > 0 ? Math.round((completedCount / total) * 100) : 0,
      };
    },

    /* -------- streaks -------- */

    getStreak: function () {
      // Collect unique dates of completed sessions, sorted descending
      const dateSet = {};
      _data.sessions.forEach(function (s) {
        if (s.completed) {
          dateSet[s.date] = true;
        }
      });

      const sortedDates = Object.keys(dateSet).sort(function (a, b) {
        return a < b ? 1 : a > b ? -1 : 0; // descending
      });

      return {
        current: _calculateCurrentStreak(sortedDates),
        longest: _calculateLongestStreak(sortedDates),
      };
    },

    /* -------- goals -------- */

    addGoal: function (text) {
      const todayGoals = this.getTodayGoals();
      if (todayGoals.length >= 5) return false;

      const goal = {
        id: _generateId(),
        text: text,
        date: _today(),
        completed: false,
        completedAt: null,
      };
      _data.goals.push(goal);
      _save();
      return goal;
    },

    toggleGoal: function (id) {
      for (let i = 0; i < _data.goals.length; i++) {
        if (_data.goals[i].id === id) {
          const goal = _data.goals[i];
          goal.completed = !goal.completed;
          goal.completedAt = goal.completed ? new Date().toISOString() : null;
          _save();
          return goal;
        }
      }
      return null;
    },

    deleteGoal: function (id) {
      _data.goals = _data.goals.filter(function (g) {
        return g.id !== id;
      });
      _save();
    },

    getTodayGoals: function () {
      const today = _today();
      return _data.goals.filter(function (g) {
        return g.date === today;
      });
    },

    getGoalCompletion: function () {
      const todayGoals = this.getTodayGoals();
      const completed = todayGoals.filter(function (g) {
        return g.completed;
      }).length;
      const total = todayGoals.length;
      return {
        completed: completed,
        total: total,
        percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    },

    /* -------- reflections -------- */

    addReflection: function (sessionId, reflection) {
      for (let i = 0; i < _data.sessions.length; i++) {
        if (_data.sessions[i].id === sessionId) {
          _data.sessions[i].reflection = {
            topic: reflection.topic || '',
            focusRating: Math.max(1, Math.min(5, reflection.focusRating || 3)),
            distractions: Array.isArray(reflection.distractions)
              ? reflection.distractions
              : [],
          };
          _save();
          return _data.sessions[i];
        }
      }
      return null;
    },

    getRecentReflections: function (count) {
      if (count === undefined) count = 5;
      const withReflections = _data.sessions.filter(function (s) {
        return s.reflection !== null && s.reflection !== undefined;
      });
      // Sort newest first by date then startTime
      withReflections.sort(function (a, b) {
        if (a.date !== b.date) return a.date < b.date ? 1 : -1;
        return a.startTime < b.startTime ? 1 : -1;
      });
      return withReflections.slice(0, count);
    },

    /* -------- utilities -------- */

    clearAll: function () {
      localStorage.removeItem(STORAGE_KEY);
      this.init();
    },

    _today: _today,
    _generateId: _generateId,
    _getDateDaysAgo: _getDateDaysAgo,
    _formatDate: _formatDate,
  };

  /* ------------------------------------------------------------------ */
  /*  Streak helpers (private)                                           */
  /* ------------------------------------------------------------------ */

  /**
   * @param {string[]} sortedDates – unique YYYY-MM-DD strings, descending
   */
  function _calculateCurrentStreak(sortedDates) {
    if (sortedDates.length === 0) return 0;

    const today = _today();
    const yesterday = _getDateDaysAgo(1);

    // The most recent session must be today or yesterday for a streak to be active
    if (sortedDates[0] !== today && sortedDates[0] !== yesterday) {
      return 0;
    }

    let streak = 1;
    for (let i = 1; i < sortedDates.length; i++) {
      const expected = _dayBefore(sortedDates[i - 1]);
      if (sortedDates[i] === expected) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }

  /**
   * @param {string[]} sortedDates – unique YYYY-MM-DD strings, descending
   */
  function _calculateLongestStreak(sortedDates) {
    if (sortedDates.length === 0) return 0;

    // Work ascending for longest
    const asc = sortedDates.slice().sort();

    let longest = 1;
    let current = 1;

    for (let i = 1; i < asc.length; i++) {
      const expected = _dayBefore(asc[i]); // day before asc[i] should === asc[i-1]
      if (asc[i - 1] === expected) {
        current++;
        if (current > longest) longest = current;
      } else {
        current = 1;
      }
    }

    return longest;
  }

  /* ------------------------------------------------------------------ */
  /*  Expose globally                                                    */
  /* ------------------------------------------------------------------ */
  window.Store = Store;
})();

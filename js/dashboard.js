/**
 * FocusFlow — Dashboard Module
 * Renders all dashboard sections from Store data: hero, progress,
 * goals, streaks, heatmap, weekly chart, and AI insights.
 */
(function () {
  'use strict';

  var Dashboard = {
    init: function () {
      this.setupListeners();
      this.render();
      this.startLiveClock();
    },

    render: function () {
      this.renderGreeting();
      this.renderHeroProgress();
      this.renderStreak();
      this.renderTodayFocus();
      this.renderWeeklyChart();
      this.renderGoals();
      this.renderHeatmap();
      this.renderInsight();
    },

    /* ───────── Live Clock ───────── */
    startLiveClock: function () {
      var timeEl = document.getElementById('live-time');
      var dateEl = document.getElementById('live-date');
      if (!timeEl || !dateEl) return;

      var updateClock = function () {
        var now = new Date();
        var hours = now.getHours();
        var minutes = now.getMinutes();
        var ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        minutes = minutes < 10 ? '0' + minutes : minutes;
        timeEl.innerHTML = hours + ':' + minutes + ' <span style="font-size: 1.5rem; font-weight: 600; opacity: 0.5;">' + ampm + '</span>';

        var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        dateEl.textContent = days[now.getDay()] + ', ' + months[now.getMonth()] + ' ' + now.getDate();
      };

      updateClock();
      setInterval(updateClock, 1000); // update every second
    },

    /* ───────── Greeting ───────── */
    renderGreeting: function () {
      var hour = new Date().getHours();
      var greeting;
      if (hour >= 5 && hour < 12) greeting = 'Good morning,';
      else if (hour >= 12 && hour < 17) greeting = 'Good afternoon,';
      else if (hour >= 17 && hour < 21) greeting = 'Good evening,';
      else greeting = 'Good night,';

      var name = Store.getUserName() || 'Friend';

      var greetEl = document.getElementById('greeting-text');
      var nameEl = document.getElementById('greeting-name');
      if (greetEl) greetEl.textContent = greeting;
      if (nameEl) nameEl.textContent = name;
    },

    /* ───────── Hero Progress Ring ───────── */
    renderHeroProgress: function () {
      var container = document.getElementById('hero-progress');
      if (!container) return;

      var todayMin = Store.getTodayMinutes();
      var goal = Store.getData().user.dailyGoalMinutes || 60;
      var pct = Math.min(Math.round((todayMin / goal) * 100), 100);

      this._createProgressRing(container, 80, 6, pct, todayMin + 'min');
    },

    /* ───────── Streak Badge ───────── */
    renderStreak: function () {
      var streak = Store.getStreak();
      var badgeEl = document.getElementById('streak-badge');
      if (badgeEl) {
        var days = streak.current === 1 ? 'day' : 'days';
        badgeEl.textContent = '🔥 ' + streak.current + ' ' + days + ' streak';
      }

      var currentEl = document.getElementById('current-streak');
      var longestEl = document.getElementById('longest-streak');
      if (currentEl) currentEl.textContent = streak.current;
      if (longestEl) longestEl.textContent = streak.longest;
    },

    /* ───────── Today's Focus ───────── */
    renderTodayFocus: function () {
      var todayMin = Store.getTodayMinutes();
      var minEl = document.getElementById('today-minutes');
      if (minEl) minEl.textContent = todayMin;

      var container = document.getElementById('today-progress-ring');
      if (!container) return;

      var goal = Store.getData().user.dailyGoalMinutes || 60;
      var pct = Math.min(Math.round((todayMin / goal) * 100), 100);
      this._createProgressRing(container, 64, 5, pct, pct + '%');
    },

    /* ───────── Weekly Chart ───────── */
    renderWeeklyChart: function () {
      var container = document.getElementById('weekly-chart');
      if (!container) return;

      var weekData = Store.getWeekData();
      var today = Store._today();
      var goal = Store.getData().user.dailyGoalMinutes || 60;

      // Find max for scaling
      var maxMin = goal;
      weekData.forEach(function (d) {
        if (d.minutes > maxMin) maxMin = d.minutes;
      });

      var html = '';
      weekData.forEach(function (d) {
        var heightPct = maxMin > 0 ? Math.max(4, (d.minutes / maxMin) * 100) : 4;
        var isToday = d.date === today;
        var barClass = 'chart-bar' + (isToday || d.minutes > 0 ? ' active' : '');

        html += '<div class="chart-bar-wrapper">' +
          '<div class="' + barClass + '" style="height:' + heightPct + '%" title="' + d.minutes + ' min"></div>' +
          '<span class="chart-label' + (isToday ? ' active' : '') + '">' + d.day + '</span>' +
          '</div>';
      });

      container.innerHTML = html;
    },

    /* ───────── Goals ───────── */
    renderGoals: function () {
      var container = document.getElementById('goals-list');
      if (!container) return;

      var goals = Store.getTodayGoals();
      var completion = Store.getGoalCompletion();

      // Update badge
      var badgeEl = document.getElementById('goals-completion');
      if (badgeEl) badgeEl.textContent = completion.completed + '/' + completion.total;

      if (goals.length === 0) {
        container.innerHTML =
          '<div class="empty-state" style="padding: var(--space-6) var(--space-4);">' +
            '<div class="empty-state__title">No goals yet</div>' +
            '<div class="empty-state__text">Add a small, achievable goal to get started</div>' +
          '</div>';
        return;
      }

      var html = '';
      goals.forEach(function (goal) {
        var completedClass = goal.completed ? ' completed' : '';
        html += '<div class="checkbox-item' + completedClass + '" data-goal-id="' + goal.id + '">' +
          '<div class="checkbox-custom">' +
            '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7l3 3 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
          '</div>' +
          '<span class="checkbox-text">' + _escapeHtml(goal.text) + '</span>' +
          '<button class="btn-delete-goal" data-delete-id="' + goal.id + '" aria-label="Delete goal" title="Delete goal">&times;</button>' +
          '</div>';
      });

      container.innerHTML = html;
    },

    /* ───────── Heatmap ───────── */
    renderHeatmap: function () {
      var container = document.getElementById('heatmap-grid');
      if (!container) return;

      var monthData = Store.getMonthData();

      // Pad to start from Monday: find what day the first entry is
      var firstDate = new Date(monthData[0].date + 'T00:00:00');
      var firstDayIdx = (firstDate.getDay() + 6) % 7; // 0=Mon

      var html = '';
      // Add empty cells for padding
      for (var p = 0; p < firstDayIdx; p++) {
        html += '<div class="heatmap-cell" style="opacity:0.3;" data-level="0"></div>';
      }

      monthData.forEach(function (d) {
        html += '<div class="heatmap-cell" data-level="' + d.level + '" title="' + d.date + ': ' + d.minutes + ' min"></div>';
      });

      container.innerHTML = html;
    },

    /* ───────── Insight ───────── */
    renderInsight: function () {
      var el = document.getElementById('insight-text');
      if (el && window.Insights) {
        el.textContent = Insights.generate();
      }
    },

    /* ───────── Event Listeners ───────── */
    setupListeners: function () {
      var self = this;

      // Start session CTA
      var startBtn = document.getElementById('btn-start-session');
      if (startBtn) {
        startBtn.addEventListener('click', function () {
          if (window.App) App.navigateTo('session');
        });
      }

      // Add goal
      var addBtn = document.getElementById('btn-add-goal');
      var goalInput = document.getElementById('goal-input');

      if (addBtn && goalInput) {
        addBtn.addEventListener('click', function () {
          self._addGoal(goalInput);
        });
        goalInput.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            self._addGoal(goalInput);
          }
        });
      }

      // Goal toggle + delete (event delegation)
      var goalsList = document.getElementById('goals-list');
      if (goalsList) {
        goalsList.addEventListener('click', function (e) {
          // Delete button
          var delBtn = e.target.closest('.btn-delete-goal');
          if (delBtn) {
            var deleteId = delBtn.getAttribute('data-delete-id');
            if (deleteId) {
              Store.deleteGoal(deleteId);
              self.renderGoals();
            }
            return;
          }

          // Toggle checkbox
          var item = e.target.closest('.checkbox-item');
          if (item) {
            var goalId = item.getAttribute('data-goal-id');
            if (goalId) {
              Store.toggleGoal(goalId);
              self.renderGoals();
            }
          }
        });
      }
    },

    _addGoal: function (input) {
      var text = input.value.trim();
      if (!text) return;

      var result = Store.addGoal(text);
      if (result === false) {
        // Max 5 goals
        input.value = '';
        input.placeholder = 'Max 5 goals per day';
        setTimeout(function () { input.placeholder = 'Add a micro goal…'; }, 2000);
        return;
      }

      input.value = '';
      this.renderGoals();
    },

    /* ───────── SVG Progress Ring Helper ───────── */
    _createProgressRing: function (container, size, strokeWidth, percentage, label) {
      var radius = (size - strokeWidth) / 2;
      var circumference = 2 * Math.PI * radius;
      var offset = circumference - (percentage / 100) * circumference;
      var center = size / 2;

      var gradientId = 'grad-' + Math.random().toString(36).substr(2, 6);

      var svg =
        '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" class="progress-ring" aria-label="' + percentage + '% complete">' +
          '<defs>' +
            '<linearGradient id="' + gradientId + '" x1="0%" y1="0%" x2="100%" y2="100%">' +
              '<stop offset="0%" style="stop-color:#00F2FE"/>' +
              '<stop offset="100%" style="stop-color:#7C3AED"/>' +
            '</linearGradient>' +
          '</defs>' +
          '<circle class="progress-ring__bg" cx="' + center + '" cy="' + center + '" r="' + radius + '" stroke-width="' + strokeWidth + '"/>' +
          '<circle class="progress-ring__fill" cx="' + center + '" cy="' + center + '" r="' + radius + '" stroke-width="' + strokeWidth + '"' +
            ' stroke="url(#' + gradientId + ')"' +
            ' filter="url(#ring-glow)"' +
            ' stroke-dasharray="' + circumference + '"' +
            ' stroke-dashoffset="' + offset + '"' +
          '/>' +
          '<text class="progress-ring__text" x="' + center + '" y="' + center + '"' +
            ' transform="rotate(90 ' + center + ' ' + center + ')"' +
            ' font-size="' + (size * 0.18) + '">' +
            label +
          '</text>' +
        '</svg>';

      container.innerHTML = svg;
    }
  };

  /* ── Utility ── */
  function _escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  window.Dashboard = Dashboard;
})();

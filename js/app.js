/**
 * FocusFlow — App Module
 * Main application controller: view routing, onboarding,
 * initialization, and global event handling.
 */
(function () {
  'use strict';

  var App = {
    currentView: 'dashboard',

    /* ───────── Initialize ───────── */
    init: function () {
      // 1. Initialize Store
      Store.init();

      // 2. Check first run — show onboarding if needed
      if (Store.isFirstRun()) {
        this.showOnboarding();
      }

      // 3. Initialize all modules
      Dashboard.init();
      Timer.init();
      Reflection.init();
      Completion.init();
      if (window.Music) Music.init();

      // 4. Show dashboard
      this.showView('dashboard');

      // 5. Setup global listeners
      this.setupListeners();
    },

    /* ───────── View Routing ───────── */
    showView: function (viewName) {
      var views = document.querySelectorAll('.view');
      var self = this;

      views.forEach(function (view) {
        if (view.id === 'view-' + viewName) {
          // Show — use a tiny delay so the animation triggers after display change
          view.style.display = 'flex';
          view.style.flexDirection = 'column';

          // Force reflow then add active class for animation
          requestAnimationFrame(function () {
            requestAnimationFrame(function () {
              view.classList.add('active');
            });
          });
        } else {
          view.classList.remove('active');
          view.style.display = 'none';
        }
      });

      this.currentView = viewName;

      // Dynamic ambient canvas view state triggers
      if (window.Visuals) {
        if (viewName === 'completion') {
          Visuals.setMode('COMPLETED');
        } else if (viewName === 'session' && window.Timer && Timer.isRunning) {
          Visuals.setMode('FOCUS');
        } else {
          Visuals.setMode('NORMAL');
        }
      }

      // Refresh dashboard data when returning to it
      if (viewName === 'dashboard' && window.Dashboard) {
        Dashboard.render();
      }

      // Scroll to top
      window.scrollTo(0, 0);
    },

    navigateTo: function (view) {
      this.showView(view);
    },

    /* ───────── Onboarding ───────── */
    showOnboarding: function () {
      var modal = document.getElementById('onboarding-modal');
      var nameInput = document.getElementById('onboarding-name');
      var submitBtn = document.getElementById('onboarding-submit');
      var self = this;

      if (!modal) return;

      modal.classList.remove('hidden');

      // Focus name input after animation
      setTimeout(function () {
        if (nameInput) nameInput.focus();
      }, 400);

      function handleSubmit() {
        var name = nameInput ? nameInput.value.trim() : '';
        if (!name) {
          // Shake the input briefly
          if (nameInput) {
            nameInput.style.borderColor = 'var(--error)';
            nameInput.focus();
            setTimeout(function () {
              nameInput.style.borderColor = '';
            }, 1500);
          }
          return;
        }

        Store.setUserName(name);

        // Hide modal with animation
        var card = modal.querySelector('.modal-card');
        if (card) {
          card.style.transform = 'scale(0.95)';
          card.style.opacity = '0';
          card.style.transition = 'all 0.3s ease';
        }

        setTimeout(function () {
          modal.classList.add('hidden');
          // Reset card styles
          if (card) {
            card.style.transform = '';
            card.style.opacity = '';
            card.style.transition = '';
          }
          // Refresh dashboard
          if (window.Dashboard) Dashboard.render();
        }, 300);
      }

      // Submit button
      if (submitBtn) {
        submitBtn.addEventListener('click', handleSubmit);
      }

      // Enter key
      if (nameInput) {
        nameInput.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmit();
          }
        });
      }
    },

    /* ───────── Global Listeners ───────── */
    setupListeners: function () {
      var self = this;

      // Escape key — go back to dashboard from any view
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          if (self.currentView === 'session' && !Timer.isRunning) {
            self.navigateTo('dashboard');
          } else if (self.currentView === 'completion') {
            if (window.Completion) Completion.cleanup();
            self.navigateTo('dashboard');
          }
          // Don't allow escape during active session or reflection
        }
      });
    }
  };

  window.App = App;
  document.addEventListener('DOMContentLoaded', function () {
    App.init();
  });
})();

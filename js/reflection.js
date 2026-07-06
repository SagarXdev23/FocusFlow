/**
 * FocusFlow — Reflection Module
 * Post-session reflection flow with 3 steps:
 * 1. What did you work on? (free text)
 * 2. How focused were you? (1-5 rating)
 * 3. What distracted you? (selectable tags)
 */
(function () {
  'use strict';

  var Reflection = {
    currentSessionId: null,
    selectedRating: 0,
    selectedTags: [],

    init: function () {
      this.setupListeners();
    },

    /**
     * Called when navigating to the reflection view.
     * @param {string} sessionId — the session to attach reflection to
     */
    start: function (sessionId) {
      this.currentSessionId = sessionId;
      this.selectedRating = 0;
      this.selectedTags = [];
      this.reset();

      // Focus the topic input after view transition
      setTimeout(function () {
        var input = document.getElementById('reflection-topic');
        if (input) input.focus();
      }, 400);
    },

    /* ───────── Event Listeners ───────── */
    setupListeners: function () {
      var self = this;

      // Rating dots
      var ratingContainer = document.getElementById('focus-rating');
      if (ratingContainer) {
        ratingContainer.addEventListener('click', function (e) {
          var dot = e.target.closest('.rating-dot');
          if (!dot) return;

          var rating = parseInt(dot.getAttribute('data-rating'), 10);
          if (isNaN(rating)) return;

          self.selectedRating = rating;

          // Update active states
          var dots = ratingContainer.querySelectorAll('.rating-dot');
          dots.forEach(function (d) {
            var r = parseInt(d.getAttribute('data-rating'), 10);
            d.classList.toggle('active', r === rating);
          });
        });
      }

      // Distraction tags
      var tagsContainer = document.getElementById('distraction-tags');
      if (tagsContainer) {
        tagsContainer.addEventListener('click', function (e) {
          var tag = e.target.closest('.tag');
          if (!tag) return;

          var tagValue = tag.getAttribute('data-tag');
          if (!tagValue) return;

          var idx = self.selectedTags.indexOf(tagValue);
          if (idx >= 0) {
            self.selectedTags.splice(idx, 1);
            tag.classList.remove('active');
          } else {
            self.selectedTags.push(tagValue);
            tag.classList.add('active');
          }
        });
      }

      // Save reflection
      var saveBtn = document.getElementById('btn-save-reflection');
      if (saveBtn) {
        saveBtn.addEventListener('click', function () {
          self.saveReflection();
        });
      }

      // Skip reflection
      var skipBtn = document.getElementById('btn-skip-reflection');
      if (skipBtn) {
        skipBtn.addEventListener('click', function () {
          self.skip();
        });
      }

      // Enter key on topic input → save
      var topicInput = document.getElementById('reflection-topic');
      if (topicInput) {
        topicInput.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            self.saveReflection();
          }
        });
      }
    },

    /* ───────── Save Reflection ───────── */
    saveReflection: function () {
      var topicInput = document.getElementById('reflection-topic');
      var topic = topicInput ? topicInput.value.trim() : '';

      var reflection = {
        topic: topic,
        focusRating: this.selectedRating || 3,
        distractions: this.selectedTags.slice()
      };

      // Save to store
      if (this.currentSessionId) {
        Store.addReflection(this.currentSessionId, reflection);
      }

      // Navigate to completion
      this._showCompletion();
    },

    /* ───────── Skip ───────── */
    skip: function () {
      this._showCompletion();
    },

    _showCompletion: function () {
      if (window.Completion) {
        // Get the session data for the completion screen
        var sessions = Store.getTodaySessions();
        var lastSession = null;
        for (var i = sessions.length - 1; i >= 0; i--) {
          if (sessions[i].id === this.currentSessionId) {
            lastSession = sessions[i];
            break;
          }
        }
        Completion.show(lastSession);
      }
      if (window.App) App.navigateTo('completion');
    },

    /* ───────── Reset UI ───────── */
    reset: function () {
      // Clear topic input
      var topicInput = document.getElementById('reflection-topic');
      if (topicInput) topicInput.value = '';

      // Deselect all rating dots
      var dots = document.querySelectorAll('#focus-rating .rating-dot');
      dots.forEach(function (d) { d.classList.remove('active'); });

      // Deselect all tags
      var tags = document.querySelectorAll('#distraction-tags .tag');
      tags.forEach(function (t) { t.classList.remove('active'); });
    }
  };

  window.Reflection = Reflection;
})();

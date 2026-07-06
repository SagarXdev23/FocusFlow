/**
 * FocusFlow — Visuals & Micro-interactions Module
 * Full-screen canvas particle system (Normal, Zen Focus, Celebration modes)
 * and dynamic 3D tilting hover effects for cards.
 */
(function () {
  'use strict';

  var Visuals = {
    canvas: null,
    ctx: null,
    timeOffset: 0,
    mode: 'NORMAL', // 'NORMAL', 'FOCUS', 'COMPLETED'
    theme: 'abstract', // 'sakura', 'abstract', 'ocean'
    animationId: null,
    mouse: { x: null, y: null, targetX: null, targetY: null },
    colors: {
      normal: ['rgba(99, 102, 241, 0.4)', 'rgba(124, 58, 237, 0.4)', 'rgba(236, 72, 153, 0.3)', 'rgba(0, 242, 254, 0.4)'],
      focus: ['rgba(99, 102, 241, 0.2)', 'rgba(0, 242, 254, 0.35)', 'rgba(5, 255, 192, 0.25)'],
      completed: ['#00F2FE', '#7C3AED', '#FE019A', '#05FFC0', '#FBBF24', '#34D399']
    },

    init: function () {
      this.canvas = document.getElementById('ambient-canvas');
      if (!this.canvas) return;

      this.ctx = this.canvas.getContext('2d');
      this.resizeCanvas();
      this.setupListeners();
      
      // Load YouTube IFrame API
      if (!window.YT) {
        var tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        var firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      }

      // Force default reset to Aura if first time after update
      if (!localStorage.getItem('focusflow_updated_v3')) {
        localStorage.removeItem('focusflow_theme');
        localStorage.setItem('focusflow_updated_v3', 'true');
      }
      // Load saved theme or default
      var savedTheme = localStorage.getItem('focusflow_theme') || 'abstract';
      this.setTheme(savedTheme);
      
      this.initTiltEffect();
    },

    resizeCanvas: function () {
      if (!this.canvas) return;
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    },

    setupListeners: function () {
      var self = this;
      window.addEventListener('resize', function () {
        self.resizeCanvas();
        self.generateParticles();
      });

      // Track mouse position with easing
      window.addEventListener('mousemove', function (e) {
        self.mouse.targetX = e.clientX;
        self.mouse.targetY = e.clientY;
      });

      // Reset mouse position when cursor leaves window
      document.addEventListener('mouseleave', function () {
        self.mouse.targetX = null;
        self.mouse.targetY = null;
      });

      var btnSunset = document.getElementById('btn-theme-sunset');
      var btnAbstract = document.getElementById('btn-theme-abstract');
      var btnForest = document.getElementById('btn-theme-forest');
      var btnCustom = document.getElementById('btn-theme-custom');

      if (btnSunset) btnSunset.addEventListener('click', function () { self.setTheme('sunset'); });
      if (btnAbstract) btnAbstract.addEventListener('click', function () { self.setTheme('abstract'); });
      if (btnForest) btnForest.addEventListener('click', function () { self.setTheme('forest'); });
      if (btnCustom) btnCustom.addEventListener('click', function () { self.setCustomTheme(); });
    },

    setCustomTheme: function() {
      var url = prompt("Paste any YouTube URL or direct MP4 link for your background:");
      if (!url) return;
      localStorage.setItem('focusflow_custom_url', url);
      this.setTheme('custom');
    },

    setTheme: function (themeName) {
      this.theme = themeName;
      localStorage.setItem('focusflow_theme', themeName);

      var videoMp4 = document.getElementById('bg-video-element');
      var iframeYt = document.getElementById('bg-youtube-element');
      var overlay = document.getElementById('video-overlay');

      var btnSunset = document.getElementById('btn-theme-sunset');
      var btnAbstract = document.getElementById('btn-theme-abstract');
      var btnForest = document.getElementById('btn-theme-forest');
      var btnCustom = document.getElementById('btn-theme-custom');

      if (btnSunset) btnSunset.classList.remove('active');
      if (btnAbstract) btnAbstract.classList.remove('active');
      if (btnForest) btnForest.classList.remove('active');
      if (btnCustom) btnCustom.classList.remove('active');

      if (themeName === 'sunset' && btnSunset) btnSunset.classList.add('active');
      else if (themeName === 'abstract' && btnAbstract) btnAbstract.classList.add('active');
      else if (themeName === 'forest' && btnForest) btnForest.classList.add('active');
      else if (themeName === 'custom' && btnCustom) btnCustom.classList.add('active');

      // Helper to extract Youtube ID
      function getYoutubeId(url) {
        var regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
        var match = url.match(regExp);
        return match ? match[1] : null;
      }

      var ytId = null;
      var mp4Url = null;

      if (themeName === 'sunset') {
        ytId = 'ScMzIvxBSi4'; // 4K Beautiful Sunset
      } else if (themeName === 'forest') {
        ytId = 'aqz-KE-bpKQ'; // 4K Costa Rica Jungle
      } else if (themeName === 'abstract') {
        mp4Url = 'https://assets.codepen.io/3364143/7btrrd.mp4';
      } else if (themeName === 'custom') {
        var customUrl = localStorage.getItem('focusflow_custom_url');
        if (customUrl) {
          var extractedYt = getYoutubeId(customUrl);
          if (extractedYt) {
            ytId = extractedYt;
          } else {
            mp4Url = customUrl; // Assume direct MP4
          }
        } else {
          // Fallback if empty
          this.setTheme('abstract');
          return;
        }
      }

      if (ytId) {
        // Load YouTube
        if (videoMp4) { 
          videoMp4.style.opacity = '0'; 
          setTimeout(function() { if(videoMp4.style.opacity === '0') { videoMp4.style.display = 'none'; videoMp4.pause(); videoMp4.src = ''; } }, 1000);
        }
        if (iframeYt) {
          var src = 'https://www.youtube.com/embed/' + ytId + '?autoplay=1&mute=1&controls=0&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1&playsinline=1&loop=1&enablejsapi=1&playlist=' + ytId;
          
          if (iframeYt.src !== src) {
             iframeYt.style.opacity = '0';
             iframeYt.src = src;
             
             // Use YouTube API to fade in ONLY when video is actually playing
             var checkYtInterval = setInterval(function() {
               if (window.YT && window.YT.Player) {
                 clearInterval(checkYtInterval);
                 
                 // Clean up old player if exists
                 if (window.currentYtPlayer) {
                   window.currentYtPlayer.destroy();
                 }
                 
                 window.currentYtPlayer = new YT.Player(iframeYt.id, {
                   events: {
                     'onStateChange': function(event) {
                       // YT.PlayerState.PLAYING is 1
                       if (event.data === 1) {
                         iframeYt.style.opacity = '1';
                       }
                     }
                   }
                 });
               }
             }, 100);
          }
          iframeYt.style.display = 'block';
        }
      } else if (mp4Url) {
        // Load MP4
        if (iframeYt) { 
          iframeYt.style.opacity = '0'; 
          setTimeout(function(){ if(iframeYt.style.opacity === '0') { iframeYt.style.display = 'none'; iframeYt.src = ''; } }, 1000); 
        }
        if (videoMp4) {
          videoMp4.style.display = 'block';
          if (!videoMp4.src.includes(mp4Url)) videoMp4.src = mp4Url;
          videoMp4.play().catch(function(e){ console.warn(e); });
          setTimeout(function() { videoMp4.style.opacity = '1'; }, 100); // fade in smoothly
        }
      }
      
      // We still run the canvas loop for micro-interactions (mouse ripples), but clear backgrounds
      if (this.canvas) this.canvas.style.opacity = '1';
      this.startLoop();
    },

    generateParticles: function () {
      this.timeOffset = 0;
      if (!this.canvas) return;
      this.particles = [];
      
      if (this.theme === 'sakura') {
        var count = Math.min(Math.floor((this.canvas.width * this.canvas.height) / 12000), 80);
        for (var i = 0; i < count; i++) {
          this.particles.push({
            x: Math.random() * this.canvas.width,
            y: Math.random() * this.canvas.height,
            size: Math.random() * 8 + 6,
            speedY: Math.random() * 1 + 0.5,
            speedX: Math.random() * 1 - 0.5,
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() * 0.05) - 0.025,
            sway: Math.random() * Math.PI * 2,
            opacity: Math.random() * 0.5 + 0.3
          });
        }
        return;
      }
      
      if (this.theme === 'ocean') {
        var count = Math.min(Math.floor((this.canvas.width * this.canvas.height) / 10000), 60);
        for (var i = 0; i < count; i++) {
          this.particles.push({
            x: Math.random() * this.canvas.width,
            y: Math.random() * this.canvas.height,
            radius: Math.random() * 40 + 10, // soft blurry circles
            speed: Math.random() * 0.4 + 0.1, // very slow floating up
            opacity: Math.random() * 0.5 + 0.1,
            pulseOffset: Math.random() * Math.PI * 2,
            colorHue: Math.random() > 0.5 ? '14, 165, 233' : '16, 185, 129' // Cyan or Emerald
          });
        }
        return;
      }
      
      var count = Math.min(Math.floor((this.canvas.width * this.canvas.height) / 18000), 80);

      for (var i = 0; i < count; i++) {
        this.particles.push(this.createParticle());
      }
    },

    createParticle: function (isExplosion, originX, originY) {
      var w = this.canvas.width;
      var h = this.canvas.height;
      var colorsArr = this.colors.normal;
      if (this.mode === 'FOCUS') colorsArr = this.colors.focus;
      if (this.mode === 'COMPLETED') colorsArr = this.colors.completed;

      var randColor = colorsArr[Math.floor(Math.random() * colorsArr.length)];

      if (isExplosion) {
        var angle = Math.random() * Math.PI * 2;
        var speed = Math.random() * 8 + 4;
        return {
          x: originX !== undefined ? originX : w / 2,
          y: originY !== undefined ? originY : h / 2,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - (Math.random() * 2), // slight upward bias
          size: Math.random() * 6 + 4,
          color: randColor,
          opacity: 1,
          decay: Math.random() * 0.015 + 0.008,
          gravity: 0.12,
          type: 'firework'
        };
      }

      // Default normal/focus drifting particle
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 20 + 8,
        color: randColor,
        opacity: Math.random() * 0.5 + 0.1,
        pulseSpeed: Math.random() * 0.02 + 0.005,
        pulseDir: Math.random() > 0.5 ? 1 : -1,
        angle: Math.random() * Math.PI * 2,
        angularSpeed: (Math.random() - 0.5) * 0.005
      };
    },

    setMode: function (modeName) {
      if (this.mode === modeName) return;
      this.mode = modeName;
      this.generateParticles();

      if (modeName === 'COMPLETED') {
        this.triggerExplosion();
      }
    },

    triggerExplosion: function () {
      var self = this;
      var originX = this.canvas.width / 2;
      var originY = this.canvas.height * 0.45;

      // Burst of firework particles
      for (var i = 0; i < 120; i++) {
        this.particles.push(this.createParticle(true, originX, originY));
      }

      // Add a couple secondary bursts
      setTimeout(function () {
        if (self.mode !== 'COMPLETED') return;
        for (var j = 0; j < 50; j++) {
          self.particles.push(self.createParticle(true, originX - 150, originY + 100));
          self.particles.push(self.createParticle(true, originX + 150, originY + 100));
        }
      }, 400);
    },

    startLoop: function () {
      if (this.animationId) return; // already running
      var self = this;
      function tick() {
        self.update();
        self.draw();
        self.animationId = requestAnimationFrame(tick);
      }
      tick();
    },

    stopLoop: function() {
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
    },

    update: function () {
      if (!this.canvas) return;
      var w = this.canvas.width;
      var h = this.canvas.height;
      this.timeOffset += 0.002; // Made 10x slower for a calm, positive vibe

      // Mouse position easing for interactivity
      if (this.mouse.targetX !== null && this.mouse.targetY !== null) {
        if (this.mouse.x === null) {
          this.mouse.x = this.mouse.targetX;
          this.mouse.y = this.mouse.targetY;
        } else {
          this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.08;
          this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.08;
        }
      } else {
        this.mouse.x = null;
        this.mouse.y = null;
      }

      for (var i = this.particles.length - 1; i >= 0; i--) {
        var p = this.particles[i];

        if (p.type === 'firework') {
          // Update explosive firework particles
          p.x += p.vx;
          p.y += p.vy;
          p.vy += p.gravity;
          p.opacity -= p.decay;
          p.size = Math.max(0.1, p.size - 0.05);

          if (p.opacity <= 0 || p.size <= 0.1) {
            this.particles.splice(i, 1);
          }
        } else {
          // Update standard drift particles
          p.opacity += p.pulseSpeed * p.pulseDir;
          if (p.opacity >= 0.7) p.pulseDir = -1;
          if (p.opacity <= 0.15) p.pulseDir = 1;

          if (this.mode === 'FOCUS') {
            // In focus view, make them slowly orbit the center
            var dx = p.x - w / 2;
            var dy = p.y - h / 2;
            var dist = Math.sqrt(dx * dx + dy * dy);
            
            // Slow circular rotation forces
            var orbitalSpeed = 0.0003;
            p.x += -dy * orbitalSpeed;
            p.y += dx * orbitalSpeed;

            // Slow radial drift towards center
            p.x -= dx * 0.0001;
            p.y -= dy * 0.0001;

            // Bounce back if they get too close to center
            if (dist < 80) {
              p.x = w / 2 + dx * 3;
              p.y = h / 2 + dy * 3;
            }
          } else {
            // Normal drifting movement
            p.x += p.vx;
            p.y += p.vy;

            // Soft gravity/pull towards cursor
            if (this.mouse.x !== null) {
              var mdx = this.mouse.x - p.x;
              var mdy = this.mouse.y - p.y;
              var mdist = Math.sqrt(mdx * mdx + mdy * mdy);
              if (mdist < 350) {
                var force = (350 - mdist) / 10000;
                p.x += mdx * force;
                p.y += mdy * force;
              }
            }
          }

          // Border wrap around
          if (p.x < -p.size) p.x = w + p.size;
          if (p.x > w + p.size) p.x = -p.size;
          if (p.y < -p.size) p.y = h + p.size;
          if (p.y > h + p.size) p.y = -p.size;
        }
      }
    },

    draw: function () {
      if (!this.canvas) return;
      var w = this.canvas.width;
      var h = this.canvas.height;
      var ctx = this.ctx;
      ctx.clearRect(0, 0, w, h);

      // Canvas is now only used for interactive mouse effects and minor particles, not huge themes.
      // So no background clearing/filling needed.

      for (var i = 0; i < this.particles.length; i++) {
        var p = this.particles[i];

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.opacity);

        if (p.type === 'firework') {
          // Draw bright crisp celebratory fireworks
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.shadowBlur = 15;
          ctx.shadowColor = p.color;
          ctx.fill();
        } else {
          // Draw soft ambient floating glows
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
          
          var grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
          grad.addColorStop(0, p.color);
          grad.addColorStop(1, 'rgba(0,0,0,0)');

          ctx.fillStyle = grad;
          ctx.fill();
        }
        ctx.restore();
      }
    },

    /* ───────── 3D Card Hover Tilt Effect ───────── */
    initTiltEffect: function () {
      var self = this;

      // Event delegation for tilting cards dynamically
      document.addEventListener('mousemove', function (e) {
        var card = e.target.closest('.card, .modal-card');
        if (!card) return;

        // Skip tilting during active focus session
        if (self.mode === 'FOCUS') {
          card.style.transform = '';
          return;
        }

        var rect = card.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var y = e.clientY - rect.top;

        // Calculate rotation angles (-6 to +6 degrees)
        var rx = -((y - rect.height / 2) / (rect.height / 2)) * 6;
        var ry = ((x - rect.width / 2) / (rect.width / 2)) * 6;

        // Apply transformations
        card.style.transform = 'perspective(1000px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg) translateY(-4px)';
        card.style.transition = 'transform 100ms ease-out, box-shadow var(--transition-spring)';

        // Add visual shift inside card content (parallax)
        var title = card.querySelector('.card-title');
        if (title) {
          title.style.transform = 'translateZ(10px)';
          title.style.transition = 'transform 100ms ease-out';
        }
      });

      document.addEventListener('mouseout', function (e) {
        var card = e.target.closest('.card, .modal-card');
        if (!card) return;

        // Reset positions
        card.style.transform = '';
        card.style.transition = 'transform 400ms ease-out, box-shadow var(--transition-spring)';

        var title = card.querySelector('.card-title');
        if (title) title.style.transform = '';
      });
    }
  };

  window.Visuals = Visuals;
  document.addEventListener('DOMContentLoaded', function () {
    Visuals.init();
  });
})();

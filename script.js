// ============================================================
// 1. INTRO TYPEWRITER
//    types "krish patel" into #typed one letter at a time, then
//    collapses the intro header and fades the rest of the page in.
// ============================================================
(function typeIntro() {
  const target = "krish patel";
  const typedEl = document.getElementById("typed");
  const introEl = document.getElementById("intro");
  const contentEl = document.getElementById("content");

  // project detail pages don't have the typing intro — skip on those
  if (!typedEl || !introEl || !contentEl) return;

  let i = 0;

  function typeNextChar() {
    if (i < target.length) {
      typedEl.textContent += target[i];
      i++;
      // small random jitter so it doesn't feel like a robotic fixed interval
      setTimeout(typeNextChar, 60 + Math.random() * 60);
    } else {
      // done typing — pause briefly, then collapse the header and reveal
      // the rest of the page
      setTimeout(() => {
        introEl.classList.add("collapsed");
        contentEl.classList.add("visible");
      }, 400);
    }
  }

  typeNextChar();
})();


// ============================================================
// 2. SCROLL PROGRESS BAR
//    thin line along the top edge that fills as you scroll down.
// ============================================================
(function scrollProgress() {
  const bar = document.getElementById("progress");
  if (!bar) return;
  window.addEventListener("scroll", () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
    bar.style.width = pct + "%";
  });
})();


// ============================================================
// 3. PER-SECTION SCROLL REVEAL
//    any element with class "reveal" fades/slides in the first time
//    it scrolls into view, instead of everything appearing at once.
//    timeline dots get a small pulse the moment their entry is visible.
// ============================================================
(function scrollReveal() {
  const revealEls = document.querySelectorAll(".reveal");
  if (revealEls.length) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            revealObserver.unobserve(entry.target); // only ever reveal once
          }
        });
      },
      { threshold: 0.15 }
    );
    revealEls.forEach((el) => revealObserver.observe(el));
  }

  const timelineItems = document.querySelectorAll(".timeline-item");
  if (timelineItems.length) {
    const dotObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("in-view");
        });
      },
      { threshold: 0.6 }
    );
    timelineItems.forEach((el) => dotObserver.observe(el));
  }
})();


// ============================================================
// 4. 3D TILT ON PROJECT CARDS
//    the card rotates slightly toward the cursor instead of just
//    lifting straight up, then eases back flat on mouseleave.
// ============================================================
(function projectTilt() {
  document.querySelectorAll(".project-card").forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `perspective(500px) rotateX(${-py * 6}deg) rotateY(${px * 8}deg) translateY(-2px)`;
    });
    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
    });
  });
})();


// ============================================================
// 5. "click an asteroid" HINT
//    fades out on its own after a few seconds, or the first time
//    the visitor actually breaks one (see section 6).
// ============================================================
const hintEl = document.getElementById("hint");
if (hintEl) {
  setTimeout(() => hintEl.classList.add("faded"), 6000);
}


// ============================================================
// 6. BACKGROUND CANVAS
//    layers, back to front:
//      - a faint, barely-drifting starfield
//      - dust dots that get pushed away from the cursor
//      - an asteroid belt: chunky rock-shaped polygons (built from a
//        smoothed jagged outline, not a spiky star) that drift, rotate,
//        and can be clicked — breaking one spawns fragments + sparks
//        + an impact ring, and a fresh asteroid drifts in later
//      - the occasional comet streaking past with a fading trail
// ============================================================
(function backgroundAnimation() {
  const canvas = document.getElementById("bg-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  let width, height;
  const mouse = { x: -9999, y: -9999 };

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  let stars = [];
  let dots = [];
  let asteroids = [];
  let fragments = [];
  let sparks = [];
  let rings = [];
  let comets = [];

  const DOT_COUNT = 70;
  const STAR_COUNT = 90;
  const ASTEROID_TARGET = 5;
  const CURSOR_RADIUS = 90;

  // --- shared shape helpers ---

  // builds a rock-like outline: more vertices than a typical polygon, each
  // one averaged with its neighbours so the silhouette is lumpy and rounded
  // instead of a spiky star.
  function makeRockPoints(baseRadius) {
    const sides = 10 + Math.floor(Math.random() * 5); // 10-14 vertices
    const raw = [];
    for (let s = 0; s < sides; s++) raw.push(baseRadius * (0.8 + Math.random() * 0.4));
    return raw.map((radius, s) => {
      const prev = raw[(s - 1 + sides) % sides];
      const next = raw[(s + 1) % sides];
      return { angle: (s / sides) * Math.PI * 2, radius: (prev + radius * 2 + next) / 4 };
    });
  }

  function makeCraters(r) {
    const count = 1 + Math.floor(Math.random() * 2);
    const craters = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * r * 0.45;
      craters.push({ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, r: r * (0.1 + Math.random() * 0.12) });
    }
    return craters;
  }

  function drawRock(x, y, rotation, points, strokeStyle, craters, alpha) {
    const a = alpha === undefined ? 1 : alpha;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.beginPath();
    points.forEach((p, idx) => {
      const px = Math.cos(p.angle) * p.radius;
      const py = Math.sin(p.angle) * p.radius;
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    // faint fill so it reads as a solid rock, not a pure wireframe
    ctx.fillStyle = `rgba(255,255,255,${0.02 * a})`;
    ctx.fill();
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = 1;
    ctx.stroke();
    if (craters) {
      ctx.fillStyle = `rgba(255,255,255,${0.05 * a})`;
      craters.forEach((c) => {
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    ctx.restore();
  }

  // --- stars ---
  function makeStar() {
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1,
      vx: (Math.random() - 0.5) * 0.015,
      vy: (Math.random() - 0.5) * 0.015,
    };
  }

  // --- dust dots (cursor-avoidant) ---
  function makeDot() {
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.15,
      vy: (Math.random() - 0.5) * 0.15,
      r: 1 + Math.random() * 1.2,
    };
  }

  // --- asteroids ---
  function spawnAsteroid(atX, atY, baseRadius) {
    const r = baseRadius || 16 + Math.random() * 24;
    const x = atX !== undefined ? atX : Math.random() * width;
    const y = atY !== undefined ? atY : Math.random() * height;
    asteroids.push({
      x, y, r,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.0025,
      vx: (Math.random() - 0.5) * 0.12,
      vy: (Math.random() - 0.5) * 0.12,
      points: makeRockPoints(r),
      craters: makeCraters(r),
      alpha: 0, // fades in after spawning
    });
  }

  function breakAsteroid(a, hitX, hitY) {
    asteroids.splice(asteroids.indexOf(a), 1);

    const pieceCount = 3 + Math.floor(Math.random() * 2);
    for (let i = 0; i < pieceCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.6 + Math.random() * 1.4;
      const r = a.r * (0.3 + Math.random() * 0.25);
      fragments.push({
        x: a.x, y: a.y,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.05,
        points: makeRockPoints(r),
        life: 1, decay: 0.006 + Math.random() * 0.004,
      });
    }

    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 2.4;
      sparks.push({ x: hitX, y: hitY, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1 });
    }

    rings.push({ x: hitX, y: hitY, radius: 4, alpha: 0.6 });
    if (hintEl) hintEl.classList.add("faded");
  }

  window.addEventListener("click", (e) => {
    for (const a of asteroids) {
      if (Math.hypot(a.x - e.clientX, a.y - e.clientY) < a.r * 1.15) {
        breakAsteroid(a, e.clientX, e.clientY);
        break;
      }
    }
  });

  // --- comets ---
  function maybeSpawnComet() {
    if (comets.length === 0 && Math.random() < 0.0018) {
      const fromLeft = Math.random() > 0.5;
      const y = Math.random() * height * 0.6;
      comets.push({
        x: fromLeft ? -20 : width + 20, y,
        vx: (fromLeft ? 1 : -1) * (5 + Math.random() * 3),
        vy: 1.2 + Math.random() * 1,
        trail: [],
      });
    }
  }

  function init() {
    resize();
    stars = Array.from({ length: STAR_COUNT }, makeStar);
    dots = Array.from({ length: DOT_COUNT }, makeDot);
    asteroids = [];
    for (let i = 0; i < ASTEROID_TARGET; i++) spawnAsteroid();
    asteroids.forEach((a) => (a.alpha = 1)); // the initial batch is already visible
    fragments = [];
    sparks = [];
    rings = [];
    comets = [];
  }

  function loop() {
    ctx.clearRect(0, 0, width, height);

    // stars
    stars.forEach((s) => {
      s.x += s.vx; s.y += s.vy;
      if (s.x < 0) s.x = width; if (s.x > width) s.x = 0;
      if (s.y < 0) s.y = height; if (s.y > height) s.y = 0;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(208,208,202,0.22)";
      ctx.fill();
    });

    // comets
    maybeSpawnComet();
    for (let i = comets.length - 1; i >= 0; i--) {
      const c = comets[i];
      c.trail.unshift({ x: c.x, y: c.y });
      if (c.trail.length > 12) c.trail.pop();
      c.x += c.vx; c.y += c.vy;
      c.trail.forEach((t, idx) => {
        ctx.beginPath();
        ctx.arc(t.x, t.y, 1.2 * (1 - idx / c.trail.length), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,240,${(1 - idx / c.trail.length) * 0.45})`;
        ctx.fill();
      });
      if (c.x < -60 || c.x > width + 60 || c.y > height + 60) comets.splice(i, 1);
    }

    // dust dots
    dots.forEach((d) => {
      d.x += d.vx; d.y += d.vy;
      const dx = d.x - mouse.x, dy = d.y - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < CURSOR_RADIUS && dist > 0.01) {
        const force = (CURSOR_RADIUS - dist) / CURSOR_RADIUS;
        d.x += (dx / dist) * force * 4;
        d.y += (dy / dist) * force * 4;
      }
      if (d.x < 0) d.x = width; if (d.x > width) d.x = 0;
      if (d.y < 0) d.y = height; if (d.y > height) d.y = 0;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(208, 208, 202, 0.35)";
      ctx.fill();
    });

    // asteroids (replenish toward the target count as they get broken)
    if (asteroids.length < ASTEROID_TARGET && Math.random() < 0.006) spawnAsteroid();
    asteroids.forEach((a) => {
      a.x += a.vx; a.y += a.vy; a.rotation += a.rotationSpeed;
      if (a.alpha < 1) a.alpha += 0.015;
      if (a.x < -a.r - 40) a.x = width + a.r; if (a.x > width + a.r + 40) a.x = -a.r;
      if (a.y < -a.r - 40) a.y = height + a.r; if (a.y > height + a.r + 40) a.y = -a.r;
      drawRock(a.x, a.y, a.rotation, a.points, `rgba(255,255,255,${0.16 * a.alpha})`, a.craters, a.alpha);
    });

    // fragments from a broken asteroid — fly outward and fade
    for (let i = fragments.length - 1; i >= 0; i--) {
      const f = fragments[i];
      f.x += f.vx; f.y += f.vy; f.rotation += f.rotationSpeed;
      f.vx *= 0.985; f.vy *= 0.985; f.life -= f.decay;
      if (f.life <= 0) { fragments.splice(i, 1); continue; }
      drawRock(f.x, f.y, f.rotation, f.points, `rgba(230,220,180,${0.5 * f.life})`, null, f.life);
    }

    // spark burst at the impact point
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.x += s.vx; s.y += s.vy; s.vx *= 0.94; s.vy *= 0.94; s.life -= 0.045;
      if (s.life <= 0) { sparks.splice(i, 1); continue; }
      ctx.beginPath();
      ctx.arc(s.x, s.y, 1.4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,235,180,${s.life})`;
      ctx.fill();
    }

    // expanding impact ring
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      r.radius += 2.6; r.alpha -= 0.028;
      if (r.alpha <= 0) { rings.splice(i, 1); continue; }
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(230,220,180,${r.alpha})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    requestAnimationFrame(loop);
  }

  window.addEventListener("resize", () => { resize(); init(); });
  window.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });
  window.addEventListener("mouseleave", () => {
    mouse.x = -9999;
    mouse.y = -9999;
  });

  init();
  loop();
})();


// ============================================================
// 7. LIVE "RECENT ACTIVITY" FROM GITHUB
//    fetches the 3 latest commits straight from the GitHub API
//    and swaps them in for the hardcoded fallback list below.
//    if the request fails (offline, rate-limited, etc.) the
//    original static list just stays put — never a blank section.
// ============================================================
(function liveActivity() {
  const listEl = document.getElementById("activity-list");

  // only the homepage has this section — skip on project pages
  if (!listEl) return;

  const REPO = "imkrisshpatel/imkrisshpatel.github.io";

  function timeAgo(dateStr) {
    const seconds = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    const units = [
      ["y", 31536000],
      ["mo", 2592000],
      ["d", 86400],
      ["h", 3600],
      ["m", 60],
    ];
    for (const [label, secs] of units) {
      const amount = Math.floor(seconds / secs);
      if (amount >= 1) return `${amount}${label} ago`;
    }
    return "just now";
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  fetch(`https://api.github.com/repos/${REPO}/commits?per_page=3`)
    .then((res) => {
      if (!res.ok) throw new Error("github api request failed");
      return res.json();
    })
    .then((commits) => {
      if (!Array.isArray(commits) || commits.length === 0) return;

      listEl.innerHTML = "";
      commits.forEach((c) => {
        const rawMessage = c.commit.message.split("\n")[0]; // first line only
        const trimmed =
          rawMessage.length > 70 ? rawMessage.slice(0, 67) + "..." : rawMessage;
        const message = escapeHtml(trimmed);

        const item = document.createElement("div");
        item.className = "activity-item";
        item.innerHTML =
          '<span class="activity-icon">&#9670;</span>' +
          '<span class="activity-text">commit: ' + message + "</span>" +
          '<span class="activity-time">' + timeAgo(c.commit.author.date) + "</span>";
        listEl.appendChild(item);
      });
    })
    .catch(() => {
      // network error, rate limit, etc. — leave the static fallback list as-is
    });
})();

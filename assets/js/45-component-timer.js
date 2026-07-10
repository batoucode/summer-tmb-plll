/* ============================================================
   TMB SUMMER BOOK — 45. COMPOSANT PARTAGÉ : CHRONOMÈTRE / MINUTEUR
   Utilisé par la page dédiée d'un exercice (70-view-training.js).
   Aucune dépendance à Supabase — composant purement visuel/local,
   réutilisable ailleurs si besoin. Deux modes basculables :
     - "chrono"   : compte croissant (temps écoulé)
     - "minuteur" : compte à rebours depuis `durationSeconds` (60s par
       défaut si l'exercice n'a pas de durée définie), avec signal
       sonore + flash visuel à zéro.
   Le calcul du temps s'appuie sur Date.now() (horodatage de
   démarrage), pas sur un cumul de setInterval, pour ne pas dériver si
   l'onglet est mis en arrière-plan.

     TMB.components.timer.mount(container, { durationSeconds })
   ============================================================ */
(function () {
  "use strict";
  const { $ } = window.TMB.core;

  function formatTime(totalSeconds) {
    const s = Math.max(0, Math.round(totalSeconds));
    const m = Math.floor(s / 60);
    const rest = s % 60;
    return String(m).padStart(2, "0") + ":" + String(rest).padStart(2, "0");
  }

  /* Bip synthétisé (Web Audio), sans fichier externe — joué à la fin
     du compte à rebours en mode minuteur. */
  function playBeep() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.55);
    } catch (e) { /* pas de son, tant pis */ }
  }

  function mountTimer(container, opts) {
    const targetSeconds = (opts && opts.durationSeconds) || 60;
    const state = {
      mode: "chrono", // "chrono" | "minuteur"
      running: false,
      startedAt: null, // Date.now() au dernier (re)démarrage
      accumulatedMs: 0, // temps déjà écoulé avant la dernière pause
      finished: false
    };
    let rafId = null;

    container.innerHTML = `
      <div class="chrono-widget">
        <div class="chrono-mode-switch">
          <button type="button" class="chrono-mode-btn active" data-mode="chrono">⏱️ Chrono</button>
          <button type="button" class="chrono-mode-btn" data-mode="minuteur">⏳ Minuteur</button>
        </div>
        <div class="chrono-display" id="chronoDisplay">00:00</div>
        <div class="chrono-actions">
          <button type="button" class="btn-primary" id="chronoStart">▶ Démarrer</button>
          <button type="button" class="btn-secondary hidden" id="chronoPause">⏸ Pause</button>
          <button type="button" class="btn-ghost" id="chronoReset">↺ Réinitialiser</button>
        </div>
      </div>
    `;

    const displayEl = $("#chronoDisplay", container);
    const startBtn = $("#chronoStart", container);
    const pauseBtn = $("#chronoPause", container);
    const resetBtn = $("#chronoReset", container);
    const widget = $(".chrono-widget", container);

    function elapsedMs() {
      if (!state.running) return state.accumulatedMs;
      return state.accumulatedMs + (Date.now() - state.startedAt);
    }

    function currentSeconds() {
      const elapsed = elapsedMs() / 1000;
      return state.mode === "minuteur" ? targetSeconds - elapsed : elapsed;
    }

    function render() {
      const secs = currentSeconds();
      displayEl.textContent = formatTime(secs);
      widget.classList.toggle("chrono-finished", state.mode === "minuteur" && secs <= 0);
    }

    function tick() {
      if (state.mode === "minuteur" && currentSeconds() <= 0 && !state.finished) {
        state.finished = true;
        state.running = false;
        state.accumulatedMs = targetSeconds * 1000;
        render();
        playBeep();
        updateButtons();
        return;
      }
      render();
      if (state.running) rafId = requestAnimationFrame(tick);
    }

    function updateButtons() {
      startBtn.classList.toggle("hidden", state.running);
      pauseBtn.classList.toggle("hidden", !state.running);
      startBtn.disabled = state.finished;
      startBtn.textContent = state.accumulatedMs > 0 && !state.running ? "▶ Reprendre" : "▶ Démarrer";
    }

    function start() {
      if (state.running || state.finished) return;
      state.running = true;
      state.startedAt = Date.now();
      updateButtons();
      tick();
    }

    function pause() {
      if (!state.running) return;
      state.accumulatedMs = elapsedMs();
      state.running = false;
      cancelAnimationFrame(rafId);
      updateButtons();
      render();
    }

    function reset() {
      state.running = false;
      state.finished = false;
      state.accumulatedMs = 0;
      state.startedAt = null;
      cancelAnimationFrame(rafId);
      updateButtons();
      render();
    }

    container.querySelectorAll(".chrono-mode-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.mode = btn.dataset.mode;
        container.querySelectorAll(".chrono-mode-btn").forEach((b) => b.classList.toggle("active", b === btn));
        reset();
      });
    });
    startBtn.addEventListener("click", start);
    pauseBtn.addEventListener("click", pause);
    resetBtn.addEventListener("click", reset);

    updateButtons();
    render();
  }

  window.TMB.components.timer.mount = mountTimer;
})();

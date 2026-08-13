(() => {
  "use strict";

  const STORAGE_KEY = "stilltime.settings.v1";
  const LAYOUTS = ["center", "left", "right"];
  const THEMES = ["dark", "warm", "light", "auto"];
  const BACKGROUNDS = ["solid", "radial", "drift"];

  const defaults = Object.freeze({
    hourFormat: "24",
    showSeconds: false,
    showDate: true,
    showWeekday: true,
    theme: "dark",
    fontSize: "medium",
    fontFamily: "modern",
    fontWeight: "light",
    layout: "auto",
    antiStatic: true,
    movement: "subtle",
    keepAwake: false,
    focusMode: false,
    focusMinutes: "25",
    focusRunning: false,
    focusEndTime: null,
    focusRemainingSeconds: 25 * 60
  });

  const state = {
    settings: loadSettings(),
    currentLayout: "center",
    backgroundIndex: 0,
    longSessionLevel: 0,
    settingsOpen: false,
    wakeLock: null,
    timers: new Map()
  };

  const elements = {
    body: document.body,
    ambient: document.getElementById("ambient"),
    stage: document.getElementById("clockStage"),
    time: document.getElementById("time"),
    seconds: document.getElementById("seconds"),
    period: document.getElementById("period"),
    calendar: document.getElementById("calendar"),
    weekday: document.getElementById("weekday"),
    date: document.getElementById("date"),
    focusMeta: document.getElementById("focusMeta"),
    focusStatus: document.getElementById("focusStatus"),
    settingsTrigger: document.getElementById("settingsTrigger"),
    settings: document.getElementById("settings"),
    closeSettings: document.getElementById("closeSettings"),
    movementSetting: document.getElementById("movementSetting"),
    focusTimerControls: document.getElementById("focusTimerControls"),
    focusPanelStatus: document.getElementById("focusPanelStatus"),
    focusStartPause: document.getElementById("focusStartPause"),
    focusReset: document.getElementById("focusReset"),
    wakeLockStatus: document.getElementById("wakeLockStatus")
  };

  function loadSettings() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return { ...defaults, ...(stored && typeof stored === "object" ? stored : {}) };
    } catch {
      return { ...defaults };
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.settings));
    } catch {
      // file:// and privacy modes may block storage; the clock still works normally.
    }
  }

  function setTimer(name, callback, delay) {
    clearNamedTimer(name);
    state.timers.set(name, window.setTimeout(() => {
      state.timers.delete(name);
      callback();
    }, delay));
  }

  function clearNamedTimer(name) {
    const timer = state.timers.get(name);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      state.timers.delete(name);
    }
  }

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function signedRandom(min, max) {
    return randomBetween(min, max) * (Math.random() < 0.5 ? -1 : 1);
  }

  function updateClock() {
    if (state.settings.focusMode) {
      updateFocusTimer();
      return;
    }

    const now = new Date();
    const use12Hour = state.settings.hourFormat === "12";
    let hours = now.getHours();
    let period = "";

    if (use12Hour) {
      period = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12;
    }

    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    const timeText = `${use12Hour ? hours : String(hours).padStart(2, "0")}:${minutes}`;

    elements.time.textContent = timeText;
    elements.time.dateTime = now.toISOString();
    elements.seconds.textContent = seconds;
    elements.period.textContent = period;

    elements.weekday.textContent = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(now);
    elements.date.textContent = new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(now);
    elements.date.dateTime = now.toISOString().slice(0, 10);

    const tick = state.settings.showSeconds ? 1000 : 60000;
    const delay = tick - (Date.now() % tick) + 35;
    setTimer("clock", updateClock, delay);
  }

  function applyVisibility() {
    const focusMode = state.settings.focusMode;
    elements.seconds.hidden = focusMode || !state.settings.showSeconds;
    elements.period.hidden = focusMode || state.settings.hourFormat !== "12";
    elements.weekday.hidden = focusMode || !state.settings.showWeekday;
    elements.date.hidden = focusMode || !state.settings.showDate;
    elements.calendar.hidden = focusMode || (!state.settings.showDate && !state.settings.showWeekday);
    elements.focusMeta.hidden = !focusMode;
  }

  function applyTheme() {
    elements.body.dataset.theme = state.settings.theme;
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.content = state.settings.theme === "light" ? "#e8e4dc" : "#111210";
    }
  }

  function applyFontSize() {
    const multiplier = { small: 0.84, medium: 1, large: 1.14 }[state.settings.fontSize] || 1;
    document.documentElement.style.setProperty("--clock-scale", String(multiplier));
  }

  function applyTypography() {
    const families = {
      modern: '"Segoe UI Variable Display", "Segoe UI", system-ui, sans-serif',
      soft: '"Trebuchet MS", "Segoe UI", system-ui, sans-serif',
      mono: '"Cascadia Mono", "Consolas", "SFMono-Regular", monospace',
      segment: '"DSEG7 Classic", monospace'
    };
    const weights = { thin: 200, light: 300, regular: 400, bold: 700 };
    const tracking = { modern: "-0.062em", soft: "-0.045em", mono: "-0.075em", segment: "0.035em" };
    const root = document.documentElement;

    elements.body.dataset.font = state.settings.fontFamily;
    root.style.setProperty("--clock-font", families[state.settings.fontFamily] || families.modern);
    root.style.setProperty("--clock-weight", String(weights[state.settings.fontWeight] || 300));
    root.style.setProperty("--clock-tracking", tracking[state.settings.fontFamily] || tracking.modern);
    root.style.setProperty("--clock-line-height", state.settings.fontFamily === "segment" ? "1" : "0.82");
  }

  function focusDurationSeconds() {
    return (Number.parseInt(state.settings.focusMinutes, 10) || 25) * 60;
  }

  function normalizeFocusState() {
    const duration = focusDurationSeconds();
    const remaining = Number(state.settings.focusRemainingSeconds);
    if (!Number.isFinite(remaining) || remaining < 0) {
      state.settings.focusRemainingSeconds = duration;
    }
    if (state.settings.focusRunning && !Number.isFinite(Number(state.settings.focusEndTime))) {
      state.settings.focusRunning = false;
      state.settings.focusEndTime = null;
    }
  }

  function focusRemainingSeconds() {
    if (!state.settings.focusRunning) return Math.max(0, Math.ceil(state.settings.focusRemainingSeconds));
    return Math.max(0, Math.ceil((Number(state.settings.focusEndTime) - Date.now()) / 1000));
  }

  function focusStatusText(remaining) {
    if (remaining === 0) return "Complete";
    if (state.settings.focusRunning) return "Focusing";
    if (remaining < focusDurationSeconds()) return "Paused";
    return "Ready";
  }

  function updateFocusTimer() {
    const remaining = focusRemainingSeconds();
    if (state.settings.focusRunning && remaining === 0) {
      state.settings.focusRunning = false;
      state.settings.focusEndTime = null;
      state.settings.focusRemainingSeconds = 0;
      saveSettings();
    }

    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    const status = focusStatusText(remaining);

    elements.time.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    elements.time.dateTime = `PT${remaining}S`;
    elements.focusStatus.textContent = status;
    elements.focusPanelStatus.textContent = `${status} · ${minutes}:${String(seconds).padStart(2, "0")}`;
    elements.focusStartPause.textContent = state.settings.focusRunning ? "Pause" : remaining === 0 ? "Restart" : "Start";

    const delay = state.settings.focusRunning && remaining > 0 ? 1000 - (Date.now() % 1000) + 25 : 60000;
    setTimer("clock", updateClock, delay);
  }

  function startPauseFocusTimer() {
    let remaining = focusRemainingSeconds();
    if (state.settings.focusRunning) {
      state.settings.focusRunning = false;
      state.settings.focusEndTime = null;
      state.settings.focusRemainingSeconds = remaining;
    } else {
      if (remaining === 0) remaining = focusDurationSeconds();
      state.settings.focusRemainingSeconds = remaining;
      state.settings.focusEndTime = Date.now() + remaining * 1000;
      state.settings.focusRunning = true;
    }
    saveSettings();
    updateClock();
  }

  function resetFocusTimer() {
    state.settings.focusRunning = false;
    state.settings.focusEndTime = null;
    state.settings.focusRemainingSeconds = focusDurationSeconds();
    saveSettings();
    updateClock();
  }

  function setWakeStatus(message) {
    elements.wakeLockStatus.textContent = message;
    elements.wakeLockStatus.hidden = !message;
  }

  async function updateWakeLock() {
    if (!state.settings.keepAwake) {
      if (state.wakeLock) {
        const lock = state.wakeLock;
        state.wakeLock = null;
        await lock.release().catch(() => {});
      }
      setWakeStatus("");
      return;
    }

    if (!("wakeLock" in navigator)) {
      setWakeStatus("Not available in this browser or local-file mode.");
      return;
    }
    if (document.visibilityState !== "visible" || state.wakeLock) return;

    try {
      const lock = await navigator.wakeLock.request("screen");
      state.wakeLock = lock;
      setWakeStatus("Screen wake lock active.");
      lock.addEventListener("release", () => {
        if (state.wakeLock === lock) state.wakeLock = null;
        if (state.settings.keepAwake) setWakeStatus("Paused while the page is not active.");
      }, { once: true });
    } catch {
      setWakeStatus("Could not keep the screen awake. Check browser permissions.");
    }
  }

  function applyLayout(immediate = false) {
    const requested = state.settings.layout === "auto" ? state.currentLayout : state.settings.layout;
    if (immediate) {
      elements.stage.dataset.layout = requested;
      return;
    }
    transitionToLayout(requested);
  }

  function transitionToLayout(layout) {
    if (!LAYOUTS.includes(layout) || elements.stage.dataset.layout === layout) return;
    elements.stage.classList.add("is-changing");
    setTimer("layoutTransition", () => {
      elements.stage.dataset.layout = layout;
      setTimer("layoutReveal", () => elements.stage.classList.remove("is-changing"), 60);
    }, 1100);
  }

  function nextLayout(manual = false) {
    const current = state.settings.layout === "auto" ? state.currentLayout : state.settings.layout;
    const next = LAYOUTS[(LAYOUTS.indexOf(current) + 1) % LAYOUTS.length];
    state.currentLayout = next;
    if (manual && state.settings.layout !== "auto") {
      state.settings.layout = next;
      syncControls();
      saveSettings();
    }
    transitionToLayout(next);
  }

  function schedulePixelShift(initial = false) {
    clearNamedTimer("pixelShift");
    if (!state.settings.antiStatic) return;

    const delay = initial ? 4000 : randomBetween(60000, 180000);
    setTimer("pixelShift", () => {
      const normal = state.settings.movement === "normal";
      const sessionBoost = state.longSessionLevel >= 1 ? 1.35 : 1;
      const x = signedRandom(normal ? 14 : 10, normal ? 30 : 20) * sessionBoost;
      const y = signedRandom(normal ? 10 : 8, normal ? 20 : 14) * sessionBoost;
      document.documentElement.style.setProperty("--shift-x", `${Math.round(x)}px`);
      document.documentElement.style.setProperty("--shift-y", `${Math.round(y)}px`);
      schedulePixelShift();
    }, delay);
  }

  function scheduleDrift(initial = false) {
    clearNamedTimer("layoutDrift");
    if (!state.settings.antiStatic) return;

    const delay = initial ? 7500 : randomBetween(10, 20) * 60000;
    setTimer("layoutDrift", () => {
      const normal = state.settings.movement === "normal";
      document.documentElement.style.setProperty("--drift-x", `${Math.round(signedRandom(4, normal ? 18 : 11))}px`);
      document.documentElement.style.setProperty("--drift-y", `${Math.round(signedRandom(3, normal ? 13 : 8))}px`);
      document.documentElement.style.setProperty("--drift-scale", String(randomBetween(normal ? 0.98 : 0.987, normal ? 1.02 : 1.013).toFixed(3)));
      document.documentElement.style.setProperty("--drift-gap", `${Math.round(signedRandom(2, normal ? 10 : 6))}px`);
      scheduleDrift();
    }, delay);
  }

  function scheduleLayoutChange() {
    clearNamedTimer("periodicLayout");
    if (!state.settings.antiStatic || state.settings.layout !== "auto") return;

    setTimer("periodicLayout", () => {
      nextLayout();
      scheduleLayoutChange();
    }, randomBetween(30, 60) * 60000);
  }

  function scheduleBackground(initial = false) {
    setTimer("background", () => {
      state.backgroundIndex = (state.backgroundIndex + 1) % BACKGROUNDS.length;
      elements.body.dataset.background = BACKGROUNDS[state.backgroundIndex];
      document.documentElement.style.setProperty("--background-x", `${Math.round(randomBetween(20, 80))}%`);
      document.documentElement.style.setProperty("--background-y", `${Math.round(randomBetween(20, 80))}%`);
      scheduleBackground();
    }, initial ? 9000 : randomBetween(7, 12) * 60000);
  }

  function resetAntiStatic() {
    elements.ambient.classList.toggle("anti-static", state.settings.antiStatic);
    elements.movementSetting.disabled = !state.settings.antiStatic;

    if (!state.settings.antiStatic) {
      ["pixelShift", "layoutDrift", "periodicLayout", "deepRest", "deepRestRestore"].forEach(clearNamedTimer);
      elements.ambient.classList.remove("is-resting");
      ["--shift-x", "--shift-y", "--drift-x", "--drift-y", "--drift-gap"].forEach((property) => {
        document.documentElement.style.setProperty(property, "0px");
      });
      document.documentElement.style.setProperty("--drift-scale", "1");
      return;
    }

    schedulePixelShift(true);
    scheduleDrift(true);
    scheduleLayoutChange();
    if (state.longSessionLevel >= 2) scheduleDeepRest();
  }

  function scheduleLongSessionMode() {
    setTimer("session2h", () => {
      state.longSessionLevel = 1;
      schedulePixelShift(true);
    }, 2 * 60 * 60 * 1000);

    setTimer("session4h", () => {
      state.longSessionLevel = 2;
      scheduleDeepRest();
    }, 4 * 60 * 60 * 1000);
  }

  function scheduleDeepRest() {
    clearNamedTimer("deepRest");
    if (!state.settings.antiStatic || state.longSessionLevel < 2) return;

    setTimer("deepRest", () => {
      if (state.settings.layout === "auto") nextLayout();
      elements.ambient.classList.add("is-resting");
      setTimer("deepRestRestore", () => elements.ambient.classList.remove("is-resting"), 15000);
      scheduleDeepRest();
    }, randomBetween(60, 90) * 60000);
  }

  function applySettings(options = {}) {
    applyVisibility();
    applyTheme();
    applyFontSize();
    applyTypography();
    applyLayout(Boolean(options.immediate));
    resetAntiStatic();
    updateClock();
    updateWakeLock();
    syncControls();
  }

  function syncControls() {
    document.querySelectorAll('input[type="radio"]').forEach((input) => {
      input.checked = state.settings[input.name] === input.value;
    });
    document.getElementById("showSeconds").checked = state.settings.showSeconds;
    document.getElementById("showDate").checked = state.settings.showDate;
    document.getElementById("showWeekday").checked = state.settings.showWeekday;
    document.getElementById("antiStatic").checked = state.settings.antiStatic;
    document.getElementById("keepAwake").checked = state.settings.keepAwake;
    document.getElementById("focusMode").checked = state.settings.focusMode;
    elements.movementSetting.disabled = !state.settings.antiStatic;
    elements.focusTimerControls.classList.toggle("is-disabled", !state.settings.focusMode);
    elements.focusTimerControls.setAttribute("aria-hidden", String(!state.settings.focusMode));
  }

  function openSettings() {
    state.settingsOpen = true;
    elements.settings.classList.add("is-open");
    elements.settings.setAttribute("aria-hidden", "false");
    elements.settings.scrollTop = 0;
    clearNamedTimer("settingsHide");
  }

  function lockSettingsShellScroll() {
    if (elements.settings.scrollTop !== 0) elements.settings.scrollTop = 0;
  }

  function closeSettings() {
    state.settingsOpen = false;
    elements.settings.classList.remove("is-open");
    elements.settings.setAttribute("aria-hidden", "true");
    clearNamedTimer("settingsHide");
  }

  function toggleSettings() {
    state.settingsOpen ? closeSettings() : openSettings();
  }

  function showCursor() {
    elements.body.classList.remove("is-idle");
    setTimer("cursorHide", () => elements.body.classList.add("is-idle"), 2000);
  }

  function attemptFullscreen() {
    if (document.fullscreenElement) return;
    const promise = document.documentElement.requestFullscreen?.({ navigationUI: "hide" });
    promise?.catch(() => {});
  }

  function updateSettingFromInput(input) {
    if (input.type === "radio") {
      state.settings[input.name] = input.value;
    } else {
      state.settings[input.id] = input.checked;
    }

    if (input.name === "focusMinutes") resetFocusTimer();
    if (input.id === "focusMode") {
      if (input.checked) {
        state.settings.focusRemainingSeconds = focusDurationSeconds();
      } else if (state.settings.focusRunning) {
        state.settings.focusRemainingSeconds = focusRemainingSeconds();
      }
      state.settings.focusRunning = false;
      state.settings.focusEndTime = null;
    }
    saveSettings();
    applySettings();
  }

  document.addEventListener("change", (event) => {
    const input = event.target;
    if (input instanceof HTMLInputElement) {
      updateSettingFromInput(input);
      lockSettingsShellScroll();
    }
  });

  document.addEventListener("pointermove", showCursor, { passive: true });
  document.addEventListener("pointerdown", () => {
    elements.body.classList.remove("is-idle");
    setTimer("cursorHide", () => elements.body.classList.add("is-idle"), 2000);
  }, { passive: true });

  elements.settingsTrigger.addEventListener("pointerenter", (event) => {
    if (event.pointerType !== "touch") openSettings();
  });
  elements.settingsTrigger.addEventListener("pointerleave", () => {
    if (state.settingsOpen) setTimer("settingsHide", closeSettings, 500);
  });
  elements.settings.addEventListener("pointerenter", () => clearNamedTimer("settingsHide"));
  elements.settings.addEventListener("pointerleave", () => setTimer("settingsHide", closeSettings, 500));
  elements.settings.addEventListener("scroll", lockSettingsShellScroll, { passive: true });
  elements.closeSettings.addEventListener("click", closeSettings);
  elements.focusStartPause.addEventListener("click", startPauseFocusTimer);
  elements.focusReset.addEventListener("click", resetFocusTimer);

  document.addEventListener("dblclick", (event) => {
    if (!elements.settings.contains(event.target)) attemptFullscreen();
  });

  document.addEventListener("keydown", (event) => {
    const target = event.target;
    const isControl = target instanceof HTMLInputElement || target instanceof HTMLButtonElement;
    if (isControl && event.code === "Space") return;

    switch (event.key.toLowerCase()) {
      case "f":
        attemptFullscreen();
        break;
      case "s":
        openSettings();
        break;
      case " ":
        event.preventDefault();
        toggleSettings();
        break;
      case "t": {
        const nextTheme = THEMES[(THEMES.indexOf(state.settings.theme) + 1) % THEMES.length];
        state.settings.theme = nextTheme;
        saveSettings();
        applyTheme();
        syncControls();
        break;
      }
      case "l":
        nextLayout(true);
        break;
      case "d":
        state.settings.showDate = !state.settings.showDate;
        saveSettings();
        applyVisibility();
        syncControls();
        break;
      case "escape":
        closeSettings();
        break;
      default:
        break;
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      updateClock();
      updateWakeLock();
    }
  });

  window.addEventListener("pagehide", () => {
    if (state.settings.focusRunning) saveSettings();
    if (state.wakeLock) state.wakeLock.release().catch(() => {});
    state.timers.forEach((timer) => window.clearTimeout(timer));
    state.timers.clear();
  }, { once: true });

  state.currentLayout = "center";
  normalizeFocusState();
  applySettings({ immediate: true });
  scheduleBackground(true);
  scheduleLongSessionMode();
  setTimer("cursorHide", () => elements.body.classList.add("is-idle"), 2000);
})();

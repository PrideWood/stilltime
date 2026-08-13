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
    layout: "auto",
    antiStatic: true,
    movement: "subtle"
  });

  const state = {
    settings: loadSettings(),
    currentLayout: "center",
    backgroundIndex: 0,
    longSessionLevel: 0,
    settingsOpen: false,
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
    settings: document.getElementById("settings"),
    closeSettings: document.getElementById("closeSettings"),
    movementSetting: document.getElementById("movementSetting")
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
    elements.seconds.hidden = !state.settings.showSeconds;
    elements.period.hidden = state.settings.hourFormat !== "12";
    elements.weekday.hidden = !state.settings.showWeekday;
    elements.date.hidden = !state.settings.showDate;
    elements.calendar.hidden = !state.settings.showDate && !state.settings.showWeekday;
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
    applyLayout(Boolean(options.immediate));
    resetAntiStatic();
    updateClock();
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
    elements.movementSetting.disabled = !state.settings.antiStatic;
  }

  function openSettings(autoClose = false) {
    state.settingsOpen = true;
    elements.settings.classList.add("is-open");
    elements.settings.setAttribute("aria-hidden", "false");
    clearNamedTimer("settingsHide");
    if (autoClose) setTimer("settingsHide", closeSettings, 7000);
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

  function showCursorAndControls(event) {
    elements.body.classList.remove("is-idle");
    setTimer("cursorHide", () => elements.body.classList.add("is-idle"), 2000);
    if (event?.pointerType !== "touch" && !state.settingsOpen) openSettings(true);
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
    saveSettings();
    applySettings();
  }

  document.addEventListener("change", (event) => {
    const input = event.target;
    if (input instanceof HTMLInputElement) updateSettingFromInput(input);
  });

  document.addEventListener("pointermove", showCursorAndControls, { passive: true });
  document.addEventListener("pointerdown", () => {
    elements.body.classList.remove("is-idle");
    setTimer("cursorHide", () => elements.body.classList.add("is-idle"), 2000);
  }, { passive: true });

  elements.settings.addEventListener("pointerenter", () => clearNamedTimer("settingsHide"));
  elements.settings.addEventListener("pointerleave", () => setTimer("settingsHide", closeSettings, 3000));
  elements.closeSettings.addEventListener("click", closeSettings);

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
    if (!document.hidden) updateClock();
  });

  window.addEventListener("pagehide", () => {
    state.timers.forEach((timer) => window.clearTimeout(timer));
    state.timers.clear();
  }, { once: true });

  state.currentLayout = "center";
  applySettings({ immediate: true });
  scheduleBackground(true);
  scheduleLongSessionMode();
  setTimer("cursorHide", () => elements.body.classList.add("is-idle"), 2000);
})();

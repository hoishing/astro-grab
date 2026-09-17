// src/theme.ts
var DEFAULT_ASTRO_GRAB_THEME = {
  accent: "#bc52ee",
  accentSoft: "#d8b4fe",
  surface: "#1a1a2e",
  text: "#e0e0e0",
  overlay: "rgba(188, 82, 238, 0.08)",
  border: "rgba(188, 82, 238, 0.4)",
  crosshair: "rgba(188, 82, 238, 0.4)",
  tag: "#86efac"
};
function isDefaultTheme(theme) {
  return Object.keys(DEFAULT_ASTRO_GRAB_THEME).every((key) => theme[key] === DEFAULT_ASTRO_GRAB_THEME[key]);
}

// src/toolbar.ts
var STORAGE_KEY = "astro-grab-toolbar-config";
var ACTIVATION_KEYS = ["Alt", "Control", "Meta", "Shift"];
var DEFAULT_CONFIG = {
  enabled: true,
  key: "Alt"
};
var ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2"/><path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 16"/></svg>`;
var getConfig = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (typeof parsed === "object" && parsed !== null) {
        return {
          ...DEFAULT_CONFIG,
          ...parsed,
          key: ACTIVATION_KEYS.includes(parsed.key) ? parsed.key : DEFAULT_CONFIG.key
        };
      }
    }
  } catch {
  }
  return { ...DEFAULT_CONFIG };
};
var saveConfig = (config) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
};
var dispatchToggle = (enabled) => {
  window.dispatchEvent(
    new CustomEvent("astro-grab:toggle", { detail: { enabled } })
  );
};
var dispatchConfigUpdate = (key) => {
  window.dispatchEvent(
    new CustomEvent("astro-grab:config-update", { detail: { key } })
  );
};
var getActiveTheme = () => {
  const runtimeTheme = window.__ASTRO_GRAB__?.theme;
  return runtimeTheme ?? DEFAULT_ASTRO_GRAB_THEME;
};
var toolbar_default = {
  id: "astro-grab",
  name: "Astro Grab",
  icon: ICON,
  init(canvas, eventTarget) {
    const config = getConfig();
    let activeTheme = getActiveTheme();
    const toolbarWindow = document.createElement("astro-dev-toolbar-window");
    toolbarWindow.style.cssText = "display: flex; flex-direction: column; gap: 0;";
    const header = document.createElement("div");
    header.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 16px 16px 12px;";
    const title = document.createElement("div");
    title.textContent = "Astro Grab";
    title.style.cssText = "font-weight: 600; font-size: 14px;";
    const statusContainer = document.createElement("div");
    statusContainer.style.cssText = "display: flex; align-items: center; gap: 8px;";
    const statusDot = document.createElement("div");
    statusDot.style.cssText = `width: 8px; height: 8px; border-radius: 50%; background-color: ${config.enabled ? "#22c55e" : "#ef4444"}; transition: background-color 0.2s;`;
    const statusText = document.createElement("div");
    statusText.textContent = config.enabled ? "Enabled" : "Disabled";
    statusText.style.cssText = "font-size: 12px; color: #d1d5db;";
    statusContainer.appendChild(statusDot);
    statusContainer.appendChild(statusText);
    header.appendChild(title);
    header.appendChild(statusContainer);
    const content = document.createElement("div");
    content.style.cssText = "padding: 0 16px 16px; display: flex; flex-direction: column; gap: 16px;";
    const enableSection = document.createElement("div");
    enableSection.style.cssText = "display: flex; justify-content: space-between; align-items: center;";
    const enableLabel = document.createElement("div");
    enableLabel.textContent = "Enable Astro Grab";
    enableLabel.style.cssText = "font-size: 13px;";
    const toggle = document.createElement(
      "astro-dev-toolbar-toggle"
    );
    toggle.toggleStyle = config.enabled ? "green" : "gray";
    toggle.input.checked = config.enabled;
    enableSection.appendChild(enableLabel);
    enableSection.appendChild(toggle);
    const keySection = document.createElement("div");
    keySection.style.cssText = "display: flex; flex-direction: column; gap: 8px;";
    const keyLabel = document.createElement("div");
    keyLabel.textContent = "Activation Key";
    keyLabel.style.cssText = "font-size: 13px; font-weight: 500;";
    const keyRow = document.createElement("div");
    keyRow.style.cssText = "display: flex; align-items: center; gap: 8px; flex-wrap: wrap;";
    const keyButtons = /* @__PURE__ */ new Map();
    let currentKey = config.key;
    const createKeyButton = (key) => {
      const btn = document.createElement(
        "astro-dev-toolbar-button"
      );
      btn.textContent = key;
      btn.size = "small";
      btn.buttonStyle = key === currentKey ? "purple" : "ghost";
      btn.style.cssText = "cursor: pointer;";
      keyButtons.set(key, btn);
      return btn;
    };
    for (const key of ACTIVATION_KEYS) {
      const btn = createKeyButton(key);
      btn.addEventListener("click", () => {
        if (key === currentKey) return;
        const prevBtn = keyButtons.get(currentKey);
        if (prevBtn) prevBtn.buttonStyle = "ghost";
        btn.buttonStyle = "purple";
        currentKey = key;
        config.key = key;
        saveConfig(config);
        dispatchConfigUpdate(key);
        currentKeyDisplay.textContent = `Hold ${key} + click to grab`;
      });
      keyRow.appendChild(btn);
    }
    const currentKeyDisplay = document.createElement("div");
    currentKeyDisplay.textContent = `Hold ${currentKey} + click to grab`;
    currentKeyDisplay.style.cssText = "font-size: 11px; color: #9ca3af; margin-top: 4px;";
    keySection.appendChild(keyLabel);
    keySection.appendChild(keyRow);
    keySection.appendChild(currentKeyDisplay);
    const appearanceSection = document.createElement("div");
    appearanceSection.style.cssText = "display: flex; flex-direction: column; gap: 8px;";
    const appearanceLabel = document.createElement("div");
    appearanceLabel.textContent = "Appearance";
    appearanceLabel.style.cssText = "font-size: 13px; font-weight: 500;";
    const appearanceNote = document.createElement("div");
    appearanceNote.style.cssText = "font-size: 11px; color: #9ca3af;";
    const swatchGrid = document.createElement("div");
    swatchGrid.style.cssText = "display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px;";
    const swatchItems = [];
    const createSwatch = (label, key) => {
      const item = document.createElement("div");
      item.style.cssText = "display: flex; align-items: center; gap: 8px; padding: 8px 10px; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 6px;";
      const swatch = document.createElement("span");
      swatch.style.cssText = "width: 12px; height: 12px; border-radius: 4px; border: 1px solid rgba(255, 255, 255, 0.16); flex: 0 0 auto;";
      const copy = document.createElement("div");
      copy.style.cssText = "display: flex; flex-direction: column; gap: 2px; min-width: 0;";
      const name = document.createElement("span");
      name.textContent = label;
      name.style.cssText = "font-size: 11px; color: #d1d5db;";
      const value = document.createElement("span");
      value.style.cssText = "font-size: 10px; color: #9ca3af; font-family: monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;";
      copy.appendChild(name);
      copy.appendChild(value);
      item.appendChild(swatch);
      item.appendChild(copy);
      swatchItems.push({ swatch, value, key });
      return item;
    };
    swatchGrid.appendChild(createSwatch("Accent", "accent"));
    swatchGrid.appendChild(createSwatch("Surface", "surface"));
    swatchGrid.appendChild(createSwatch("Overlay", "overlay"));
    swatchGrid.appendChild(createSwatch("Tag", "tag"));
    const updateThemePreview = (theme) => {
      activeTheme = theme;
      appearanceNote.textContent = isDefaultTheme(theme) ? "OmniAura defaults" : "Customized in config";
      for (const item of swatchItems) {
        item.swatch.style.backgroundColor = theme[item.key];
        item.value.textContent = theme[item.key];
      }
    };
    updateThemePreview(activeTheme);
    appearanceSection.appendChild(appearanceLabel);
    appearanceSection.appendChild(appearanceNote);
    appearanceSection.appendChild(swatchGrid);
    const statusSection = document.createElement("div");
    statusSection.style.cssText = "display: flex; flex-direction: column; gap: 8px; padding-top: 8px; border-top: 1px solid rgba(255, 255, 255, 0.1);";
    const statusLabel = document.createElement("div");
    statusLabel.textContent = "Status";
    statusLabel.style.cssText = "font-size: 13px; font-weight: 500;";
    const stateRow = document.createElement("div");
    stateRow.style.cssText = "display: flex; align-items: center; gap: 8px;";
    const stateBadge = document.createElement("div");
    stateBadge.textContent = "idle";
    stateBadge.style.cssText = "font-size: 11px; font-family: monospace; padding: 2px 8px; border-radius: 4px; background-color: rgba(255, 255, 255, 0.1); color: #d1d5db; text-transform: uppercase; letter-spacing: 0.05em;";
    const stateDescription = document.createElement("div");
    stateDescription.textContent = "Waiting for activation key";
    stateDescription.style.cssText = "font-size: 11px; color: #9ca3af;";
    stateRow.appendChild(stateBadge);
    stateRow.appendChild(stateDescription);
    statusSection.appendChild(statusLabel);
    statusSection.appendChild(stateRow);
    content.appendChild(enableSection);
    content.appendChild(keySection);
    content.appendChild(appearanceSection);
    content.appendChild(statusSection);
    toolbarWindow.appendChild(header);
    toolbarWindow.appendChild(content);
    canvas.appendChild(toolbarWindow);
    const updateStatusUI = (enabled) => {
      statusDot.style.backgroundColor = enabled ? "#22c55e" : "#ef4444";
      statusText.textContent = enabled ? "Enabled" : "Disabled";
    };
    toggle.input.addEventListener("change", () => {
      const enabled = toggle.input.checked;
      toggle.toggleStyle = enabled ? "green" : "gray";
      config.enabled = enabled;
      saveConfig(config);
      updateStatusUI(enabled);
      dispatchToggle(enabled);
      if (!enabled) {
        stateBadge.textContent = "disabled";
        stateBadge.style.backgroundColor = "rgba(239, 68, 68, 0.2)";
        stateBadge.style.color = "#fca5a5";
        stateDescription.textContent = "Astro Grab is disabled";
      } else {
        stateBadge.textContent = "idle";
        stateBadge.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
        stateBadge.style.color = "#d1d5db";
        stateDescription.textContent = "Waiting for activation key";
      }
    });
    window.addEventListener("astro-grab:state-change", ((e) => {
      const state = e.detail?.state;
      if (!config.enabled) return;
      if (state === "targeting") {
        stateBadge.textContent = "targeting";
        stateBadge.style.backgroundColor = "rgba(168, 85, 247, 0.2)";
        stateBadge.style.color = "#d8b4fe";
        stateDescription.textContent = "Hover over an element and click";
      } else {
        stateBadge.textContent = "idle";
        stateBadge.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
        stateBadge.style.color = "#d1d5db";
        stateDescription.textContent = "Waiting for activation key";
      }
    }));
    window.addEventListener("astro-grab:ready", ((e) => {
      if (e.detail?.theme) {
        updateThemePreview(e.detail.theme);
      }
    }));
    if (!config.enabled) {
      stateBadge.textContent = "disabled";
      stateBadge.style.backgroundColor = "rgba(239, 68, 68, 0.2)";
      stateBadge.style.color = "#fca5a5";
      stateDescription.textContent = "Astro Grab is disabled";
      dispatchToggle(false);
    }
    if (config.key !== "Alt") {
      dispatchConfigUpdate(config.key);
    }
  }
};
export {
  STORAGE_KEY,
  toolbar_default as default
};
//# sourceMappingURL=toolbar.js.map
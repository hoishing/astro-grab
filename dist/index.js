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
function resolveTheme(theme) {
  if (!theme) {
    return { ...DEFAULT_ASTRO_GRAB_THEME };
  }
  const resolved = { ...DEFAULT_ASTRO_GRAB_THEME };
  for (const key of Object.keys(DEFAULT_ASTRO_GRAB_THEME)) {
    const value = theme[key];
    if (typeof value === "string" && value.trim() !== "") {
      resolved[key] = value;
    }
  }
  return resolved;
}

// src/overlay.ts
var DEFAULT_MAX_POPUP_WIDTH = 480;
function resolveMaxPopupWidth(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : DEFAULT_MAX_POPUP_WIDTH;
}
function createOverlayStyles(theme, maxPopupWidth) {
  return `
  .astro-grab-overlay {
    position: fixed;
    pointer-events: none;
    z-index: 2147483647;
    border: 2px solid ${theme.accent};
    background: ${theme.overlay};
    border-radius: 3px;
    transition: all 0.08s ease-out;
  }

  .astro-grab-tooltip {
    position: fixed;
    z-index: 2147483647;
    pointer-events: none;
    background: ${theme.surface};
    color: ${theme.text};
    font-family: "SF Mono", "Fira Code", "Cascadia Code", monospace;
    font-size: 12px;
    line-height: 1.4;
    padding: 6px 10px;
    border-radius: 6px;
    border: 1px solid ${theme.border};
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
    max-width: ${maxPopupWidth}px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .astro-grab-tooltip .ag-component {
    color: ${theme.accentSoft};
    font-weight: 600;
  }

  .astro-grab-tooltip .ag-file {
    color: ${theme.accentSoft};
    opacity: 0.85;
  }

  .astro-grab-tooltip .ag-tag {
    color: ${theme.tag};
  }

  .astro-grab-toast {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%) translateY(0);
    z-index: 2147483647;
    background: ${theme.surface};
    color: ${theme.text};
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 13px;
    padding: 10px 18px;
    border-radius: 8px;
    border: 1px solid ${theme.border};
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
    opacity: 0;
    transition: opacity 0.2s, transform 0.2s;
    pointer-events: none;
  }

  .astro-grab-toast.ag-visible {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }

  .astro-grab-badge {
    position: fixed;
    bottom: 12px;
    right: 12px;
    z-index: 2147483646;
    background: ${theme.surface};
    color: ${theme.accentSoft};
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 11px;
    font-weight: 600;
    padding: 4px 10px;
    border-radius: 6px;
    border: 1px solid ${theme.border};
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    cursor: default;
    user-select: none;
    opacity: 0.7;
    transition: opacity 0.15s;
  }

  .astro-grab-badge:hover { opacity: 1; }

  .astro-grab-crosshair {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 2147483646;
    display: none;
  }

  .astro-grab-crosshair-line {
    position: absolute;
    background: ${theme.crosshair};
    pointer-events: none;
  }

  .ag-crosshair-v {
    width: 1px;
  }

  .ag-crosshair-h {
    height: 1px;
  }
`;
}
var Overlay = class {
  styleEl;
  overlayEl;
  tooltipEl;
  toastEl;
  badgeEl;
  crosshairEl;
  lineTop;
  lineBottom;
  lineLeft;
  lineRight;
  toastTimeout = null;
  _mounted = false;
  unsubscribeState = null;
  lastHighlightRect = null;
  theme;
  constructor(theme, maxPopupWidth) {
    this.theme = resolveTheme(theme);
    this.styleEl = document.createElement("style");
    this.styleEl.textContent = createOverlayStyles(
      this.theme,
      resolveMaxPopupWidth(maxPopupWidth)
    );
    this.overlayEl = document.createElement("div");
    this.overlayEl.className = "astro-grab-overlay";
    this.overlayEl.style.display = "none";
    this.tooltipEl = document.createElement("div");
    this.tooltipEl.className = "astro-grab-tooltip";
    this.tooltipEl.style.display = "none";
    this.toastEl = document.createElement("div");
    this.toastEl.className = "astro-grab-toast";
    this.badgeEl = document.createElement("div");
    this.badgeEl.className = "astro-grab-badge";
    this.badgeEl.textContent = "\u26A1 astro-grab";
    this.crosshairEl = document.createElement("div");
    this.crosshairEl.className = "astro-grab-crosshair";
    this.lineTop = this.createCrosshairLine("ag-crosshair-v");
    this.lineBottom = this.createCrosshairLine("ag-crosshair-v");
    this.lineLeft = this.createCrosshairLine("ag-crosshair-h");
    this.lineRight = this.createCrosshairLine("ag-crosshair-h");
    this.crosshairEl.appendChild(this.lineTop);
    this.crosshairEl.appendChild(this.lineBottom);
    this.crosshairEl.appendChild(this.lineLeft);
    this.crosshairEl.appendChild(this.lineRight);
  }
  createCrosshairLine(directionClass) {
    const line = document.createElement("div");
    line.className = `astro-grab-crosshair-line ${directionClass}`;
    return line;
  }
  mount() {
    if (this._mounted) return;
    this._mounted = true;
    document.head.appendChild(this.styleEl);
    document.body.appendChild(this.overlayEl);
    document.body.appendChild(this.tooltipEl);
    document.body.appendChild(this.toastEl);
    document.body.appendChild(this.badgeEl);
    document.body.appendChild(this.crosshairEl);
  }
  unmount() {
    if (!this._mounted) return;
    this._mounted = false;
    this.unsubscribeState?.();
    this.unsubscribeState = null;
    this.styleEl.remove();
    this.overlayEl.remove();
    this.tooltipEl.remove();
    this.toastEl.remove();
    this.badgeEl.remove();
    this.crosshairEl.remove();
  }
  /**
   * Wire the overlay to a state machine.
   * `targeting` → show overlay elements, `idle` → hide overlay + clear highlight.
   */
  connectStateMachine(sm) {
    this.unsubscribeState?.();
    this.unsubscribeState = sm.subscribe((state) => {
      if (state === "idle") {
        this.clearHighlight();
        this.hideCrosshair();
      } else if (state === "targeting") {
        this.crosshairEl.style.display = "block";
      }
    });
  }
  /** Position the overlay highlight over a target element */
  highlight(el) {
    const rect = el.getBoundingClientRect();
    this.lastHighlightRect = rect;
    const s = this.overlayEl.style;
    s.display = "block";
    s.top = rect.top + "px";
    s.left = rect.left + "px";
    s.width = rect.width + "px";
    s.height = rect.height + "px";
  }
  /** Hide the overlay highlight */
  clearHighlight() {
    this.overlayEl.style.display = "none";
    this.tooltipEl.style.display = "none";
    this.lastHighlightRect = null;
  }
  /** Show the tooltip near the highlighted element */
  showTooltip(el, source, componentName) {
    const rect = el.getBoundingClientRect();
    const tag = el.tagName.toLowerCase();
    let html = `<span class="ag-tag">&lt;${tag}&gt;</span>`;
    if (componentName) {
      html = `<span class="ag-component">&lt;${componentName} /&gt;</span> \u2192 ${html}`;
    }
    if (source) {
      html += ` <span class="ag-file">${source.file}:${source.line}</span>`;
    }
    this.tooltipEl.innerHTML = html;
    this.tooltipEl.style.display = "block";
    const tooltipHeight = 32;
    const gap = 8;
    let top = rect.top - tooltipHeight - gap;
    if (top < 4) top = rect.bottom + gap;
    let left = rect.left;
    const tooltipWidth = this.tooltipEl.offsetWidth;
    if (left + tooltipWidth > window.innerWidth - 8) {
      left = window.innerWidth - tooltipWidth - 8;
    }
    if (left < 4) left = 4;
    this.tooltipEl.style.top = top + "px";
    this.tooltipEl.style.left = left + "px";
  }
  /**
   * Update crosshair lines to extend between the cursor and the
   * currently highlighted element's bounding rect edges.
   * If no element is highlighted, hides the crosshair lines.
   */
  updateCrosshair(cursorX, cursorY) {
    const rect = this.lastHighlightRect;
    if (!rect) {
      this.hideCrosshair();
      return;
    }
    this.lineTop.style.left = cursorX + "px";
    this.lineTop.style.top = "0";
    this.lineTop.style.height = Math.max(0, rect.top) + "px";
    this.lineBottom.style.left = cursorX + "px";
    this.lineBottom.style.top = rect.bottom + "px";
    this.lineBottom.style.height = Math.max(0, window.innerHeight - rect.bottom) + "px";
    this.lineLeft.style.left = "0";
    this.lineLeft.style.top = cursorY + "px";
    this.lineLeft.style.width = Math.max(0, rect.left) + "px";
    this.lineRight.style.left = rect.right + "px";
    this.lineRight.style.top = cursorY + "px";
    this.lineRight.style.width = Math.max(0, window.innerWidth - rect.right) + "px";
  }
  /** Hide all crosshair lines */
  hideCrosshair() {
    this.crosshairEl.style.display = "none";
    this.lastHighlightRect = null;
  }
  /** Flash a toast notification */
  toast(message, duration = 2e3) {
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastEl.textContent = message;
    this.toastEl.classList.add("ag-visible");
    this.toastTimeout = setTimeout(() => {
      this.toastEl.classList.remove("ag-visible");
      this.toastTimeout = null;
    }, duration);
  }
  /** Update badge text */
  setBadge(text) {
    this.badgeEl.textContent = text;
  }
};

// src/types.ts
var ATTR_SOURCE = "data-astro-source";
var ATTR_COMPONENT = "data-astro-component";

// src/inspector.ts
function parseSourceAttr(value) {
  if (!value) return null;
  const parts = value.split(":");
  if (parts.length < 3) return null;
  const col = parseInt(parts.pop(), 10);
  const line = parseInt(parts.pop(), 10);
  const file = parts.join(":");
  if (isNaN(line) || isNaN(col)) return null;
  return { file, line, column: col };
}
function findNearestSource(el) {
  let current = el;
  while (current) {
    const attr = current.getAttribute(ATTR_SOURCE);
    if (attr) return parseSourceAttr(attr);
    current = current.parentElement;
  }
  return null;
}
function getElementSource(el) {
  return parseSourceAttr(el.getAttribute(ATTR_SOURCE));
}
function findNearestComponent(el) {
  let current = el;
  while (current) {
    const name = current.getAttribute(ATTR_COMPONENT);
    if (name) return name;
    current = current.parentElement;
  }
  return null;
}
function getComponentChain(el) {
  const chain = [];
  const seen = /* @__PURE__ */ new Set();
  let current = el;
  while (current) {
    const name = current.getAttribute(ATTR_COMPONENT);
    if (name) {
      const source = getElementSource(current);
      const key = `${name}:${source?.file}:${source?.line}`;
      if (!seen.has(key)) {
        seen.add(key);
        chain.push({ name, location: source });
      }
    }
    current = current.parentElement;
  }
  return chain;
}
async function fetchSnippet(sourceAttr, contextLines = 5) {
  try {
    const url = `/__astro-grab/snippet?src=${encodeURIComponent(sourceAttr)}&contextLines=${contextLines}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}
function getElementSnippet(el, maxLen = 200) {
  const html = el.outerHTML;
  if (html.length <= maxLen) return html;
  return html.slice(0, maxLen) + "...";
}
function getElementSummary(el) {
  const tag = el.tagName.toLowerCase();
  const parts = [`<${tag}`];
  const id = el.id;
  if (id) parts.push(`id="${id}"`);
  const cls = el.className;
  if (cls && typeof cls === "string") {
    const trimmed = cls.trim();
    if (trimmed.length <= 80) {
      parts.push(`class="${trimmed}"`);
    } else {
      parts.push(`class="${trimmed.slice(0, 77)}..."`);
    }
  }
  const testId = el.getAttribute("data-testid");
  if (testId) parts.push(`data-testid="${testId}"`);
  return parts.join(" ") + ">";
}
function formatContext(ctx) {
  const lines = [];
  lines.push("--- astro-grab context ---");
  lines.push("");
  lines.push(`Element: ${getElementSummary(ctx.element)}`);
  if (ctx.elementSource) {
    const s = ctx.elementSource;
    lines.push(`Source:  ${s.file}:${s.line}:${s.column}`);
  }
  if (ctx.components.length > 0) {
    lines.push("");
    lines.push("Component tree (innermost \u2192 outermost):");
    for (const comp of ctx.components) {
      const loc = comp.location ? ` \u2192 ${comp.location.file}:${comp.location.line}:${comp.location.column}` : "";
      lines.push(`  <${comp.name} />${loc}`);
    }
  }
  if (ctx.snippet) {
    lines.push("");
    lines.push(`Source (${ctx.snippet.language}, lines ${ctx.snippet.startLine}-${ctx.snippet.endLine}):`);
    lines.push("```" + ctx.snippet.language);
    lines.push(ctx.snippet.snippet);
    lines.push("```");
  } else {
    lines.push("");
    lines.push("HTML:");
    lines.push(getElementSnippet(ctx.element, 500));
  }
  lines.push("");
  lines.push("--- end astro-grab context ---");
  return lines.join("\n");
}
function inspect(el) {
  const elementSource = getElementSource(el) ?? findNearestSource(el);
  const components = getComponentChain(el);
  const partial = {
    element: el,
    tagName: el.tagName.toLowerCase(),
    elementSource,
    components,
    timestamp: Date.now()
  };
  return {
    ...partial,
    formatted: formatContext(partial)
  };
}

// src/agent-bridge.ts
var AgentBridge = class {
  ws = null;
  url;
  reconnectTimer = null;
  _connected = false;
  constructor(url) {
    this.url = url;
  }
  get connected() {
    return this._connected;
  }
  connect() {
    if (this.ws) return;
    try {
      this.ws = new WebSocket(this.url);
      this.ws.onopen = () => {
        this._connected = true;
        console.log("[astro-grab] Agent bridge connected:", this.url);
      };
      this.ws.onclose = () => {
        this._connected = false;
        this.ws = null;
        this.reconnectTimer = setTimeout(() => this.connect(), 3e3);
      };
      this.ws.onerror = () => {
        this.ws?.close();
      };
    } catch {
      console.warn("[astro-grab] Invalid agent bridge URL:", this.url);
    }
  }
  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this._connected = false;
  }
  send(context) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(
      JSON.stringify({
        type: "astro-grab:context",
        payload: {
          tagName: context.tagName,
          elementSource: context.elementSource,
          components: context.components,
          formatted: context.formatted,
          timestamp: context.timestamp
        }
      })
    );
  }
};

// src/state-machine.ts
var StateMachine = class {
  state = "idle";
  listeners = /* @__PURE__ */ new Set();
  getState() {
    return this.state;
  }
  /**
   * Transition to a new state. No-ops if the state is unchanged.
   * Notifies all subscribers when a transition occurs.
   */
  transition(newState) {
    if (this.state === newState) return;
    this.state = newState;
    for (const listener of this.listeners) {
      listener(newState);
    }
  }
  /**
   * Subscribe to all state transitions.
   * Returns an unsubscribe function.
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  /** Reset the machine back to idle. */
  reset() {
    this.transition("idle");
  }
};

// src/index.ts
var initialized = false;
var overlay;
var bridge = null;
var stateMachine;
var opts;
var currentTheme = { ...DEFAULT_ASTRO_GRAB_THEME };
var hoveredEl = null;
var enabled = true;
var holdTimerId = null;
function isActivationKey(e) {
  switch (opts.key) {
    case "Alt":
      return e.key === "Alt" || e.key === "Option" || e.code === "AltLeft" || e.code === "AltRight";
    case "Control":
      return e.key === "Control" || e.code === "ControlLeft" || e.code === "ControlRight";
    case "Meta":
      return e.key === "Meta" || e.key === "OS" || e.code === "MetaLeft" || e.code === "MetaRight";
    case "Shift":
      return e.key === "Shift" || e.code === "ShiftLeft" || e.code === "ShiftRight";
    default:
      return e.key === "Alt" || e.key === "Option" || e.code === "AltLeft" || e.code === "AltRight";
  }
}
function clearHoldTimer() {
  if (holdTimerId !== null) {
    clearTimeout(holdTimerId);
    holdTimerId = null;
  }
}
function activateTargeting() {
  stateMachine.transition("targeting");
  emitStateChange("targeting");
  overlay.setBadge(`\u26A1 astro-grab [${opts.key}]`);
  document.body.style.cursor = "crosshair";
  if (hoveredEl) {
    highlightElement(hoveredEl);
  }
}
function onKeyDown(e) {
  if (!enabled) return;
  if (!isActivationKey(e)) return;
  if (holdTimerId !== null) return;
  if (stateMachine.getState() === "targeting") {
    activateTargeting();
    return;
  }
  if (opts.holdDuration > 0) {
    holdTimerId = setTimeout(() => {
      holdTimerId = null;
      if (!enabled) return;
      activateTargeting();
    }, opts.holdDuration);
    return;
  }
  activateTargeting();
}
function onKeyUp(e) {
  if (!isActivationKey(e)) return;
  clearHoldTimer();
  stateMachine.transition("idle");
  emitStateChange("idle");
  overlay.setBadge("\u26A1 astro-grab");
  document.body.style.cursor = "";
  hoveredEl = null;
}
function findGrabbableTarget(target) {
  if (!(target instanceof HTMLElement)) return null;
  if (target.classList.contains("astro-grab-overlay") || target.classList.contains("astro-grab-tooltip") || target.classList.contains("astro-grab-toast") || target.classList.contains("astro-grab-badge")) {
    return null;
  }
  return target;
}
function highlightElement(el) {
  overlay.highlight(el);
  const source = findNearestSource(el);
  const component = findNearestComponent(el);
  overlay.showTooltip(el, source, component);
}
function onMouseMove(e) {
  if (stateMachine.getState() !== "targeting") return;
  const target = findGrabbableTarget(e.target);
  if (!target) return;
  hoveredEl = target;
  highlightElement(target);
  overlay.updateCrosshair(e.clientX, e.clientY);
}
async function onMouseDown(e) {
  if (stateMachine.getState() !== "targeting") return;
  const target = findGrabbableTarget(e.target);
  if (!target) return;
  e.preventDefault();
  e.stopPropagation();
  const context = inspect(target);
  if (context.elementSource) {
    const sourceAttr = `${context.elementSource.file}:${context.elementSource.line}:${context.elementSource.column}`;
    const snippet = await fetchSnippet(sourceAttr);
    if (snippet) {
      context.snippet = snippet;
      context.formatted = formatContext(context);
    }
  }
  const shouldCopy = opts.onGrab?.(context) !== false;
  if (shouldCopy) {
    copyToClipboard(context.formatted);
  }
  if (bridge?.connected) {
    bridge.send(context);
    overlay.toast("\u2713 Sent to agent", 1500);
  } else if (shouldCopy && opts.showToast) {
    overlay.toast("\u2713 Copied to clipboard", 1500);
  }
  overlay.clearHighlight();
}
function onClick(e) {
  if (stateMachine.getState() !== "targeting") return;
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();
}
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
}
function onBlur() {
  clearHoldTimer();
  if (stateMachine.getState() === "targeting") {
    stateMachine.transition("idle");
    emitStateChange("idle");
    document.body.style.cursor = "";
    hoveredEl = null;
  }
}
function emitStateChange(state) {
  window.dispatchEvent(
    new CustomEvent("astro-grab:state-change", { detail: { state } })
  );
}
function emitReady() {
  window.dispatchEvent(
    new CustomEvent("astro-grab:ready", {
      detail: { key: opts.key, theme: currentTheme }
    })
  );
}
function onToolbarToggle(e) {
  const detail = e.detail;
  if (!detail) return;
  enabled = detail.enabled;
  if (!enabled) {
    clearHoldTimer();
    if (stateMachine.getState() !== "idle") {
      stateMachine.transition("idle");
      emitStateChange("idle");
      overlay.clearHighlight();
      overlay.setBadge("\u26A1 astro-grab");
      document.body.style.cursor = "";
      hoveredEl = null;
    }
  }
}
function onToolbarConfigUpdate(e) {
  const detail = e.detail;
  if (!detail) return;
  let keyChanged = false;
  if (detail.key !== void 0) {
    const validKeys = ["Alt", "Control", "Meta", "Shift"];
    if (validKeys.includes(detail.key)) {
      opts.key = detail.key;
      keyChanged = true;
    }
  }
  if (detail.holdDuration !== void 0 && typeof detail.holdDuration === "number" && Number.isFinite(detail.holdDuration) && detail.holdDuration >= 0) {
    opts.holdDuration = detail.holdDuration;
  }
  if (keyChanged) {
    clearHoldTimer();
    if (stateMachine.getState() === "targeting") {
      stateMachine.transition("idle");
      emitStateChange("idle");
      overlay.clearHighlight();
      overlay.setBadge("\u26A1 astro-grab");
      document.body.style.cursor = "";
      hoveredEl = null;
    }
  }
}
function initAstroGrab(options = {}) {
  if (initialized) return;
  initialized = true;
  opts = {
    key: options.key ?? "Alt",
    showToast: options.showToast ?? true,
    holdDuration: typeof options.holdDuration === "number" && Number.isFinite(options.holdDuration) && options.holdDuration >= 0 ? options.holdDuration : 0,
    onGrab: options.onGrab,
    agentUrl: options.agentUrl
  };
  currentTheme = resolveTheme(options.theme);
  if (typeof window !== "undefined") {
    window.__ASTRO_GRAB__.theme = currentTheme;
  }
  stateMachine = new StateMachine();
  overlay = new Overlay(currentTheme, resolveMaxPopupWidth(options.maxPopupWidth));
  overlay.connectStateMachine(stateMachine);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap);
  } else {
    bootstrap();
  }
}
function bootstrap() {
  overlay.mount();
  emitReady();
  window.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("keyup", onKeyUp, true);
  document.addEventListener("mousemove", onMouseMove, true);
  document.addEventListener("mousedown", onMouseDown, true);
  document.addEventListener("click", onClick, true);
  window.addEventListener("blur", onBlur);
  window.addEventListener("astro-grab:toggle", onToolbarToggle);
  window.addEventListener("astro-grab:config-update", onToolbarConfigUpdate);
  if (opts.agentUrl) {
    bridge = new AgentBridge(opts.agentUrl);
    bridge.connect();
  }
  console.log(
    `%c\u26A1 astro-grab%c Hold ${opts.key} + click to grab element context`,
    `color: ${currentTheme.accentSoft}; font-weight: bold`,
    "color: inherit"
  );
}
function destroyAstroGrab() {
  if (!initialized) return;
  initialized = false;
  window.removeEventListener("keydown", onKeyDown, true);
  window.removeEventListener("keyup", onKeyUp, true);
  document.removeEventListener("mousemove", onMouseMove, true);
  document.removeEventListener("mousedown", onMouseDown, true);
  document.removeEventListener("click", onClick, true);
  window.removeEventListener("blur", onBlur);
  window.removeEventListener("astro-grab:toggle", onToolbarToggle);
  window.removeEventListener("astro-grab:config-update", onToolbarConfigUpdate);
  clearHoldTimer();
  stateMachine.reset();
  overlay.unmount();
  bridge?.disconnect();
  bridge = null;
  enabled = true;
  currentTheme = { ...DEFAULT_ASTRO_GRAB_THEME };
  if (typeof window !== "undefined") {
    window.__ASTRO_GRAB__.theme = currentTheme;
  }
  document.body.style.cursor = "";
}
queueMicrotask(() => {
  if (!initialized) initAstroGrab();
});
if (typeof window !== "undefined") {
  window.__ASTRO_GRAB__ = {
    init: initAstroGrab,
    destroy: destroyAstroGrab,
    inspect,
    theme: currentTheme
  };
}
export {
  DEFAULT_ASTRO_GRAB_THEME,
  StateMachine,
  destroyAstroGrab,
  fetchSnippet,
  initAstroGrab,
  inspect
};
//# sourceMappingURL=index.js.map
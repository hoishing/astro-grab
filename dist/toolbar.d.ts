/**
 * toolbar.ts
 *
 * Astro Dev Toolbar App for astro-grab settings UI.
 * Provides enable/disable toggle, activation key configuration,
 * and live status display.
 *
 * Communicates with the client runtime via CustomEvents on window:
 *   - astro-grab:toggle        { enabled: boolean }
 *   - astro-grab:config-update { key: string }
 *
 * Persists preferences to localStorage under "astro-grab-toolbar-config".
 */
declare const STORAGE_KEY = "astro-grab-toolbar-config";
declare const _default: {
    id: string;
    name: string;
    icon: string;
    init(canvas: ShadowRoot, eventTarget: EventTarget): void;
};

export { STORAGE_KEY, _default as default };

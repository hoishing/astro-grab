import { AstroIntegration } from 'astro';

interface AstroGrabTheme {
    /** Primary accent used for outlines and emphasis. */
    accent: string;
    /** Softer accent used for badge and component labels. */
    accentSoft: string;
    /** Background color for tooltip, toast, and badge surfaces. */
    surface: string;
    /** Primary text color for overlay UI. */
    text: string;
    /** Highlight tint drawn over the targeted element. */
    overlay: string;
    /** Border color for tooltip, toast, and badge surfaces. */
    border: string;
    /** Crosshair guide line color. */
    crosshair: string;
    /** Element tag color inside the tooltip. */
    tag: string;
}
interface AstroGrabIntegrationOptions {
    /**
     * Inject `data-astro-source` attributes into template elements.
     * @default true
     */
    jsxLocation?: boolean;
    /**
     * Inject `data-astro-component` attributes onto component root elements.
     * @default true
     */
    componentLocation?: boolean;
    /**
     * Auto-import the astro-grab runtime in dev mode.
     * @default true
     */
    autoImport?: boolean;
    /**
     * Activation key to hold while hovering to grab elements.
     * Passed through to the dev runtime bootstrap.
     * @default "Alt"
     */
    key?: "Alt" | "Control" | "Meta" | "Shift";
    /**
     * Override the runtime overlay theme.
     * Omitted values fall back to the built-in OmniAura theme.
     */
    theme?: Partial<AstroGrabTheme>;
    /**
     * Milliseconds the activation key must be held before entering targeting mode.
     * Passed through to the dev runtime bootstrap.
     * @default 0
     */
    holdDuration?: number;
    /**
     * Maximum width of the hover location tooltip, in pixels.
     * Passed through to the dev runtime bootstrap.
     * @default 480
     */
    maxPopupWidth?: number;
}

declare const DEFAULT_ASTRO_GRAB_THEME: AstroGrabTheme;

/**
 * astro-grab/integration
 *
 * Astro integration that wires up the Vite plugin and runtime injection.
 *
 * Usage in astro.config.mjs:
 *
 *   import { defineConfig } from "astro/config";
 *   import astroGrab from "@omniaura/astro-grab";
 *
 *   export default defineConfig({
 *     integrations: [astroGrab()],
 *   });
 */

declare function astroGrab(options?: AstroGrabIntegrationOptions): AstroIntegration;

export { type AstroGrabTheme, DEFAULT_ASTRO_GRAB_THEME, astroGrab as default };

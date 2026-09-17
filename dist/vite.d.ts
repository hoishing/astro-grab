import { Plugin } from 'vite';

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
interface AstroGrabViteOptions {
    /**
     * Inject `data-astro-source` attributes into JSX/template elements.
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

type AstroTransformOptions = {
    jsxLocation: boolean;
    componentLocation: boolean;
};
declare function transformAstroFile(code: string, fileId: string, opts: AstroTransformOptions): Promise<string>;

/**
 * astro-grab/vite
 *
 * A Vite plugin that injects source-location data attributes into Astro
 * templates and framework component JSX so the runtime overlay can map
 * DOM elements back to source code.
 *
 * Handles both:
 *   - .astro files (template section after frontmatter ---)
 *   - .jsx/.tsx files (framework island components)
 *
 * When used as an Astro integration, this is injected automatically.
 * For standalone Vite use:
 *
 *   import astroGrab from "@omniaura/astro-grab/vite";
 *   export default defineConfig({
 *     plugins: [astroGrab(), ...],
 *   });
 */

/**
 * Transform JSX/HTML code by injecting data attributes on opening tags.
 */
declare function transformCode(code: string, fileId: string, opts: {
    jsxLocation: boolean;
    componentLocation: boolean;
}): string;
/**
 * Extract the template section from an .astro file (after the frontmatter).
 * Returns { templateStart, template } or null if no frontmatter found.
 */
declare function extractAstroTemplate(code: string): {
    templateStart: number;
    template: string;
} | null;
declare function astroGrabVite(options?: AstroGrabViteOptions): Plugin;

export { astroGrabVite as default, extractAstroTemplate, transformAstroFile, transformCode };

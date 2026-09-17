interface SourceLocation {
    file: string;
    line: number;
    column: number;
}
interface ComponentInfo {
    name: string;
    location: SourceLocation | null;
}
interface SnippetResponse {
    /** Relative file path */
    file: string;
    /** Extracted source code lines */
    snippet: string;
    /** First line number in the snippet (1-based) */
    startLine: number;
    /** Last line number in the snippet (1-based) */
    endLine: number;
    /** The target line number that was requested (1-based) */
    targetLine: number;
    /** Language identifier derived from file extension */
    language: string;
}
interface GrabbedContext {
    /** The DOM element that was clicked */
    element: HTMLElement;
    /** Tag name of the element */
    tagName: string;
    /** Source location of the clicked element's JSX/template */
    elementSource: SourceLocation | null;
    /** Component ancestry chain, innermost first */
    components: ComponentInfo[];
    /** Formatted string ready for an AI agent prompt */
    formatted: string;
    /** Timestamp */
    timestamp: number;
    /** Server-side source code snippet, if available */
    snippet?: SnippetResponse;
}
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
interface AstroGrabOptions {
    /**
     * Key to hold while hovering to activate the overlay.
     * @default "Alt"
     */
    key?: "Alt" | "Control" | "Meta" | "Shift";
    /**
     * Callback fired when an element is grabbed.
     * Return `false` to prevent the default clipboard copy.
     */
    onGrab?: (context: GrabbedContext) => void | false;
    /**
     * WebSocket URL for agent bridge.
     * If provided, grabbed context is also sent over WS.
     * @default undefined
     */
    agentUrl?: string;
    /**
     * Whether to show a toast notification on copy.
     * @default true
     */
    showToast?: boolean;
    /**
     * Override the overlay look and feel.
     * Omitted values fall back to the built-in OmniAura theme.
     */
    theme?: Partial<AstroGrabTheme>;
    /**
     * Milliseconds the activation key must be held before entering targeting mode.
     * `0` activates instantly on key-down (the default, snappy behavior).
     * Values greater than `0` arm a timer on key-down; releasing the key before
     * the timer fires cancels activation. Useful for protecting against
     * accidental activation when the modifier is pressed for unrelated shortcuts.
     * @default 0
     */
    holdDuration?: number;
    /**
     * Maximum width of the hover location tooltip, in pixels.
     * Sets `max-width` on `.astro-grab-tooltip`.
     * @default 480
     */
    maxPopupWidth?: number;
}

/**
 * inspector.ts
 *
 * Core logic for mapping a DOM element back to:
 *   1. Its source location (via data-astro-source)
 *   2. Its component ancestry chain (via data-astro-component)
 *   3. A formatted context string suitable for AI agent prompts
 */

/**
 * Fetch a source code snippet from the dev server's snippet endpoint.
 *
 * @param sourceAttr - The data-astro-source attribute value (e.g. "src/Page.astro:5:3")
 * @param contextLines - Number of lines above/below the target line to include
 * @returns The snippet response, or null if the fetch fails
 */
declare function fetchSnippet(sourceAttr: string, contextLines?: number): Promise<SnippetResponse | null>;
/**
 * Inspect a DOM element and produce the full GrabbedContext.
 */
declare function inspect(el: HTMLElement): GrabbedContext;

/**
 * state-machine.ts
 *
 * Minimal state machine for the astro-grab client lifecycle.
 * Drives overlay visibility and inspector activation via
 * subscribe-based state transitions.
 */
type ClientState = "idle" | "targeting";
interface StateListener {
    (state: ClientState): void;
}
declare class StateMachine {
    private state;
    private listeners;
    getState(): ClientState;
    /**
     * Transition to a new state. No-ops if the state is unchanged.
     * Notifies all subscribers when a transition occurs.
     */
    transition(newState: ClientState): void;
    /**
     * Subscribe to all state transitions.
     * Returns an unsubscribe function.
     */
    subscribe(listener: StateListener): () => void;
    /** Reset the machine back to idle. */
    reset(): void;
}

declare const DEFAULT_ASTRO_GRAB_THEME: AstroGrabTheme;

/**
 * astro-grab
 *
 * Runtime entry point. Auto-imported by the Astro integration in dev mode,
 * or import manually:
 *
 *   import { initAstroGrab } from "@omniaura/astro-grab/client";
 *   initAstroGrab({ key: "Alt", agentUrl: "ws://localhost:4567" });
 */

/**
 * Initialize astro-grab with options.
 * Safe to call multiple times — subsequent calls are no-ops.
 */
declare function initAstroGrab(options?: AstroGrabOptions): void;
/**
 * Tear down astro-grab (for HMR / cleanup).
 */
declare function destroyAstroGrab(): void;
declare global {
    interface Window {
        __ASTRO_GRAB__: {
            init: typeof initAstroGrab;
            destroy: typeof destroyAstroGrab;
            inspect: typeof inspect;
            theme: AstroGrabTheme;
        };
    }
}

export { type AstroGrabOptions, type AstroGrabTheme, type ClientState, type ComponentInfo, DEFAULT_ASTRO_GRAB_THEME, type GrabbedContext, type SnippetResponse, type SourceLocation, type StateListener, StateMachine, destroyAstroGrab, fetchSnippet, initAstroGrab, inspect };

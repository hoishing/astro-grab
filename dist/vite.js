// src/vite.ts
import { readFile as readFile2 } from "fs/promises";

// src/astro-transform.ts
import { parse } from "@astrojs/compiler";

// src/types.ts
var ATTR_SOURCE = "data-astro-source";

// src/astro-transform.ts
var COMPONENT_NAME_RE = /^[A-Z]|[.]/;
var NON_INSTRUMENTABLE_TAGS = /* @__PURE__ */ new Set(["script", "style", "body"]);
function computeLineStarts(code) {
  const lineStarts = [0];
  for (let i = 0; i < code.length; i++) {
    if (code[i] === "\n") lineStarts.push(i + 1);
  }
  return lineStarts;
}
function getLineCol(lineStarts, offset) {
  let lo = 0;
  let hi = lineStarts.length - 1;
  while (lo < hi) {
    const mid = lo + hi + 1 >> 1;
    if (lineStarts[mid] <= offset) lo = mid;
    else hi = mid - 1;
  }
  return [lo + 1, offset - lineStarts[lo] + 1];
}
function normalizeFilePath(fileId) {
  return fileId.replace(/\\/g, "/").replace(/^\//, "");
}
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function findTagInsertOffset(code, tagName, startOffset) {
  const tagPrefix = `<${tagName}`;
  let tagStart = startOffset;
  while (tagStart > 0 && code.slice(tagStart, tagStart + tagPrefix.length) !== tagPrefix) {
    tagStart--;
  }
  if (tagStart === 0 && code.slice(0, tagPrefix.length) !== tagPrefix) {
    return null;
  }
  let tagEnd = tagStart;
  let depth = 0;
  for (let i = tagStart; i < code.length; i++) {
    if (code[i] === "<") depth++;
    if (code[i] === ">") {
      depth--;
      if (depth === 0) {
        tagEnd = i;
        break;
      }
    }
  }
  const openingTag = code.slice(tagStart, tagEnd + 1);
  const tagPattern = new RegExp(`^<${escapeRegExp(tagName)}([\\s>/])`);
  const match = openingTag.match(tagPattern);
  if (!match) return null;
  if (openingTag.includes(`${ATTR_SOURCE}=`)) {
    return null;
  }
  return tagStart + match[0].length - 1;
}
function findBodyNode(node) {
  if (node.type === "element" && node.name === "body") {
    return node;
  }
  if (!Array.isArray(node.children)) return null;
  for (const child of node.children) {
    const found = findBodyNode(child);
    if (found) return found;
  }
  return null;
}
function walkAst(node, visit) {
  if (!node || typeof node !== "object") return;
  visit(node);
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      walkAst(child, visit);
    }
  }
  if (Array.isArray(node.attributes)) {
    for (const attr of node.attributes) {
      walkAst(attr, visit);
    }
  }
}
async function transformAstroFile(code, fileId, opts) {
  if (!opts.jsxLocation) {
    return code;
  }
  let parsed;
  try {
    parsed = await parse(code, { position: true });
  } catch {
    return code;
  }
  const root = findBodyNode(parsed.ast) ?? parsed.ast;
  const shortFile = normalizeFilePath(fileId);
  const lineStarts = computeLineStarts(code);
  const injections = [];
  walkAst(root, (node) => {
    if (node.type !== "element" || !node.name) return;
    const normalizedTagName = node.name.toLowerCase();
    if (NON_INSTRUMENTABLE_TAGS.has(normalizedTagName)) return;
    if (COMPONENT_NAME_RE.test(node.name)) {
      return;
    }
    const startOffset = node.position?.start?.offset;
    if (typeof startOffset !== "number") return;
    const insertOffset = findTagInsertOffset(code, node.name, startOffset);
    if (insertOffset === null) return;
    const [line, col] = getLineCol(lineStarts, startOffset);
    injections.push({
      offset: insertOffset,
      attribute: ` ${ATTR_SOURCE}="${shortFile}:${line}:${col}"`
    });
  });
  if (injections.length === 0) {
    return code;
  }
  injections.sort((a, b) => b.offset - a.offset);
  let transformed = code;
  for (const injection of injections) {
    transformed = transformed.slice(0, injection.offset) + injection.attribute + transformed.slice(injection.offset);
  }
  return transformed;
}

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

// src/snippet-server.ts
import { readFile } from "fs/promises";
import { resolve, extname } from "path";
var EXTENSION_LANGUAGE_MAP = {
  ".astro": "astro",
  ".tsx": "tsx",
  ".jsx": "jsx",
  ".ts": "typescript",
  ".js": "javascript",
  ".svelte": "svelte",
  ".vue": "vue"
};
function detectLanguage(filePath) {
  const ext = extname(filePath).toLowerCase();
  return EXTENSION_LANGUAGE_MAP[ext] ?? "plaintext";
}
function parseSourceLocation(src) {
  const parts = src.split(":");
  if (parts.length < 3) {
    throw new Error(`Invalid source location format: expected "file:line:col", got "${src}"`);
  }
  const colStr = parts.pop();
  const lineStr = parts.pop();
  const file = parts.join(":");
  const line = parseInt(lineStr, 10);
  const column = parseInt(colStr, 10);
  if (!file || isNaN(line) || isNaN(column) || line < 1 || column < 1) {
    throw new Error(`Invalid source location values: file="${file}", line=${lineStr}, col=${colStr}`);
  }
  return { file, line, column };
}
function extractSnippet(content, targetLine, contextLines) {
  const lines = content.split("\n");
  const totalLines = lines.length;
  const clampedTarget = Math.max(1, Math.min(targetLine, totalLines));
  const startLine = Math.max(1, clampedTarget - contextLines);
  const endLine = Math.min(totalLines, clampedTarget + contextLines);
  const snippet = lines.slice(startLine - 1, endLine).join("\n");
  return { snippet, startLine, endLine };
}
function createSnippetMiddleware(projectRoot) {
  return async (req, res, next) => {
    if (!req.url?.startsWith("/__astro-grab/snippet")) {
      return next();
    }
    try {
      const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);
      const srcParam = url.searchParams.get("src");
      if (!srcParam) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Missing required query parameter: src" }));
        return;
      }
      const contextLinesParam = url.searchParams.get("contextLines");
      let contextLines = 5;
      if (contextLinesParam !== null) {
        const parsed = parseInt(contextLinesParam, 10);
        if (isNaN(parsed) || parsed < 0) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Invalid contextLines parameter: must be a non-negative integer" }));
          return;
        }
        contextLines = parsed;
      }
      let loc;
      try {
        loc = parseSourceLocation(decodeURIComponent(srcParam));
      } catch (err) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({
          error: err instanceof Error ? err.message : String(err)
        }));
        return;
      }
      const filePath = resolve(projectRoot, loc.file);
      const resolvedRoot = resolve(projectRoot);
      if (!filePath.startsWith(resolvedRoot)) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Path traversal is not allowed" }));
        return;
      }
      let content;
      try {
        content = await readFile(filePath, "utf-8");
      } catch (err) {
        const code = err.code;
        if (code === "ENOENT") {
          res.statusCode = 404;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: `File not found: ${loc.file}` }));
          return;
        }
        throw err;
      }
      const { snippet, startLine, endLine } = extractSnippet(content, loc.line, contextLines);
      const language = detectLanguage(loc.file);
      const response = {
        file: loc.file,
        snippet,
        startLine,
        endLine,
        targetLine: loc.line,
        language
      };
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(response));
    } catch (err) {
      console.error("[astro-grab] Snippet handler error:", err);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({
        error: err instanceof Error ? err.message : "Internal server error"
      }));
    }
  };
}

// src/vite.ts
var VIRTUAL_INIT = "virtual:astro-grab-init";
var RESOLVED_VIRTUAL_INIT = "\0" + VIRTUAL_INIT;
var JSX_OPEN_TAG_RE = /(?<!\w)(<\s*)([A-Z_a-z][\w.:-]*)(\s|\/?>)/g;
var COMPONENT_NAME_RE2 = /^[A-Z]|[.]/;
var JSX_PRECEDING_KEYWORDS = /* @__PURE__ */ new Set([
  "return",
  "yield",
  "case",
  "default",
  "else"
]);
function isLikelyJsx(code, ltIndex) {
  let i = ltIndex - 1;
  while (i >= 0 && (code[i] === " " || code[i] === "	" || code[i] === "\n" || code[i] === "\r")) {
    i--;
  }
  if (i < 0) return true;
  const ch = code[i];
  if (ch === ")" || ch === "]" || ch === '"' || ch === "'" || ch === "`") {
    return false;
  }
  if ("({[,;:?=!>&|+-*/%^~".includes(ch)) {
    return true;
  }
  if (/\w/.test(ch)) {
    const end = i + 1;
    while (i >= 0 && /\w/.test(code[i])) i--;
    const word = code.slice(i + 1, end);
    return JSX_PRECEDING_KEYWORDS.has(word);
  }
  return true;
}
function computeLineStarts2(code) {
  const lineStarts = [0];
  for (let i = 0; i < code.length; i++) {
    if (code[i] === "\n") lineStarts.push(i + 1);
  }
  return lineStarts;
}
function getLineCol2(lineStarts, offset) {
  let lo = 0;
  let hi = lineStarts.length - 1;
  while (lo < hi) {
    const mid = lo + hi + 1 >> 1;
    if (lineStarts[mid] <= offset) lo = mid;
    else hi = mid - 1;
  }
  return [lo + 1, offset - lineStarts[lo] + 1];
}
function transformCode(code, fileId, opts) {
  const lineStarts = computeLineStarts2(code);
  const shortFile = fileId.replace(/^\//, "");
  let result = "";
  let lastIndex = 0;
  JSX_OPEN_TAG_RE.lastIndex = 0;
  let match;
  while ((match = JSX_OPEN_TAG_RE.exec(code)) !== null) {
    const fullMatch = match[0];
    const prefix = match[1];
    const tagName = match[2];
    const suffix = match[3];
    const offset = match.index;
    if (!isLikelyJsx(code, offset)) {
      continue;
    }
    const [line, col] = getLineCol2(lineStarts, offset);
    const isComponent = COMPONENT_NAME_RE2.test(tagName);
    const attrs = [];
    if (opts.jsxLocation) {
      attrs.push(`data-astro-source="${shortFile}:${line}:${col}"`);
    }
    if (opts.componentLocation && isComponent) {
      attrs.push(`data-astro-component="${tagName}"`);
    }
    if (attrs.length === 0) {
      result += code.slice(lastIndex, match.index + fullMatch.length);
      lastIndex = match.index + fullMatch.length;
      continue;
    }
    const attrStr = " " + attrs.join(" ");
    result += code.slice(lastIndex, match.index);
    result += prefix + tagName + attrStr + suffix;
    lastIndex = match.index + fullMatch.length;
  }
  result += code.slice(lastIndex);
  return result;
}
function extractAstroTemplate(code) {
  const firstFence = code.indexOf("---");
  if (firstFence === -1) {
    return { templateStart: 0, template: code };
  }
  const secondFence = code.indexOf("---", firstFence + 3);
  if (secondFence === -1) {
    return { templateStart: firstFence + 3, template: code.slice(firstFence + 3) };
  }
  const templateStart = secondFence + 3;
  return { templateStart, template: code.slice(templateStart) };
}
function astroGrabVite(options = {}) {
  const {
    jsxLocation = true,
    componentLocation = true,
    autoImport = true,
    key = "Alt",
    theme,
    holdDuration = 0,
    maxPopupWidth
  } = options;
  const resolvedTheme = resolveTheme(theme);
  const resolvedHoldDuration = typeof holdDuration === "number" && Number.isFinite(holdDuration) && holdDuration >= 0 ? holdDuration : 0;
  const resolvedMaxPopupWidth = typeof maxPopupWidth === "number" && Number.isFinite(maxPopupWidth) && maxPopupWidth > 0 ? maxPopupWidth : 480;
  let projectRoot = "";
  return {
    name: "astro-grab",
    enforce: "pre",
    apply: "serve",
    // Dev mode only
    configResolved(config) {
      projectRoot = config.root;
    },
    resolveId(id) {
      if (id === VIRTUAL_INIT) return RESOLVED_VIRTUAL_INIT;
    },
    async load(id) {
      if (id === RESOLVED_VIRTUAL_INIT) {
        return `import { initAstroGrab } from "@omniaura/astro-grab/client";
initAstroGrab({ key: ${JSON.stringify(key)}, theme: ${JSON.stringify(resolvedTheme)}, holdDuration: ${JSON.stringify(resolvedHoldDuration)}, maxPopupWidth: ${JSON.stringify(resolvedMaxPopupWidth)} });`;
      }
      if (!id.endsWith(".astro") || id.includes("node_modules")) {
        return null;
      }
      const relativePath = id.startsWith(projectRoot) ? id.slice(projectRoot.length + 1) : id;
      const source = await readFile2(id, "utf8");
      const transformed = await transformAstroFile(source, relativePath, {
        jsxLocation,
        componentLocation
      });
      if (transformed === source) {
        return null;
      }
      return {
        code: transformed,
        map: null
      };
    },
    async transform(code, id) {
      if (id.includes("node_modules")) return null;
      if (/\.[jt]sx$/.test(id)) {
        const relativePath = id.startsWith(projectRoot) ? id.slice(projectRoot.length + 1) : id;
        const transformed = transformCode(code, relativePath, {
          jsxLocation,
          componentLocation
        });
        if (transformed === code) return null;
        return { code: transformed, map: null };
      }
      return null;
    },
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url === "/@astro-grab/init") {
          req.url = `/@id/${VIRTUAL_INIT}`;
        }
        next();
      });
      server.middlewares.use(createSnippetMiddleware(projectRoot));
    },
    handleHotUpdate({ file, modules, server }) {
      if (!file.endsWith(".astro")) return;
      for (const moduleNode of modules) {
        server.moduleGraph.invalidateModule(moduleNode);
      }
      server.ws.send({ type: "full-reload", path: "*" });
      return [];
    },
    transformIndexHtml() {
      if (!autoImport) return;
      return [
        {
          tag: "script",
          attrs: { type: "module", src: "/@astro-grab/init" },
          injectTo: "head"
        }
      ];
    }
  };
}
export {
  astroGrabVite as default,
  extractAstroTemplate,
  transformAstroFile,
  transformCode
};
//# sourceMappingURL=vite.js.map
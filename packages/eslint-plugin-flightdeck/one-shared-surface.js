const HOMES = [
  { id: "repo-search", dir: "features/repos/", name: "RepoPicker" },
  { id: "repo-picker", dir: "features/repos/", name: "RepoPicker" },
  { id: "chat-input", dir: "features/chat/", name: "Chat" },
  { id: "run-reply", dir: "features/chat/", name: "Chat" },
  { id: "chat-pane", dir: "features/chat/", name: "Chat" },
  { id: "transcript", dir: "features/chat/", name: "Chat" },
];

const DECLS = [
  { names: new Set(["RepoPicker", "DropdownPaper", "OptionRow"]), dir: "features/repos/", name: "RepoPicker" },
  { names: new Set(["Chat", "Composer", "Thread", "ChatPane", "TranscriptPane"]), dir: "features/chat/", name: "Chat" },
  { names: new Set(["Markdown"]), dir: "features/markdown/", name: "Markdown" },
];

function testId(node) {
  if (node.type !== "JSXAttribute" || node.name.name !== "data-testid") return "";
  const v = node.value;
  if (!v) return "";
  if (v.type === "Literal" && typeof v.value === "string") return v.value;
  if (v.type === "JSXExpressionContainer" && v.expression.type === "Literal" && typeof v.expression.value === "string") {
    return v.expression.value;
  }
  return "";
}

function jsxName(node) {
  return node.name?.type === "JSXIdentifier" ? node.name.name : "";
}

function declHit(name) {
  return DECLS.find((d) => d.names.has(name));
}

function objectHasPreWrap(expr) {
  if (!expr) return false;
  if (expr.type === "ObjectExpression") {
    return expr.properties.some((p) => {
      if (p.type !== "Property") return false;
      const key = p.key.type === "Identifier" ? p.key.name : p.key.type === "Literal" ? p.key.value : "";
      return key === "whiteSpace" && p.value.type === "Literal" && p.value.value === "pre-wrap";
    });
  }
  if (expr.type === "ArrayExpression") return expr.elements.some(objectHasPreWrap);
  return false;
}

function isPreWrapAttr(node) {
  if (node.type !== "JSXAttribute") return false;
  if (node.name.name !== "sx" && node.name.name !== "style") return false;
  const v = node.value;
  if (!v || v.type !== "JSXExpressionContainer") return false;
  return objectHasPreWrap(v.expression);
}

/** Keep repo picker, chat, and markdown preview in their feature folders. */
export const oneSharedSurface = {
  meta: {
    type: "problem",
    docs: { description: "Repo picker, chat, and markdown UI live in one feature folder each." },
    schema: [],
    messages: {
      home: "Use the shared {{name}} from features (data-testid={{id}} belongs in {{dir}}).",
      decl: "Declare {{name}} in {{dir}}, not a fork.",
      autocomplete: "Repo Autocomplete belongs in features/repos (use RepoPicker).",
      markdownImport: "Render markdown via features/markdown, not {{source}}.",
      prewrap: "Pre-wrap markdown bodies belong in features/markdown (use Markdown).",
    },
  },
  create(context) {
    const file = context.filename.replaceAll("\\", "/");
    if (!file.includes("apps/web/src/")) return {};
    const inRepos = file.includes("features/repos/");
    const allowPreWrap =
      file.includes("features/markdown/") ||
      file.endsWith("theme.ts") ||
      file.endsWith("ClaudeForm.tsx") ||
      file.endsWith("CheckRow.tsx");
    const inUi = /apps\/web\/src\/(pages|features|preflight|layout)\//.test(file);
    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (typeof source !== "string") return;
        if (file.includes("features/markdown/")) return;
        if (/react-markdown|remark-gfm/.test(source)) {
          context.report({ node, messageId: "markdownImport", data: { source } });
        }
      },
      FunctionDeclaration(node) {
        const hit = declHit(node.id?.name);
        if (hit && !file.includes(hit.dir)) context.report({ node, messageId: "decl", data: hit });
      },
      VariableDeclarator(node) {
        if (node.id.type !== "Identifier") return;
        const hit = declHit(node.id.name);
        if (hit && !file.includes(hit.dir)) context.report({ node, messageId: "decl", data: hit });
      },
      JSXOpeningElement(node) {
        if (!inRepos && jsxName(node) === "Autocomplete") {
          context.report({ node, messageId: "autocomplete" });
        }
      },
      JSXAttribute(node) {
        const id = testId(node);
        const hit = HOMES.find((h) => h.id === id);
        if (hit && !file.includes(hit.dir)) context.report({ node, messageId: "home", data: hit });
        if (inUi && !allowPreWrap && isPreWrapAttr(node)) {
          context.report({ node, messageId: "prewrap" });
        }
      },
    };
  },
};

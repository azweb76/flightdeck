const HOMES = [
  { id: "repo-search", dir: "features/repos/", name: "RepoPicker" },
  { id: "repo-picker", dir: "features/repos/", name: "RepoPicker" },
  { id: "chat-input", dir: "features/chat/", name: "Chat" },
  { id: "run-reply", dir: "features/chat/", name: "Chat" },
  { id: "chat-pane", dir: "features/chat/", name: "Chat" },
  { id: "transcript", dir: "features/chat/", name: "Chat" },
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

/** Keep repo picker, chat, and markdown preview in their feature folders. */
export const oneSharedSurface = {
  meta: {
    type: "problem",
    docs: { description: "Repo picker, chat, and markdown UI live in one feature folder each." },
    schema: [],
    messages: {
      home: "Use the shared {{name}} from features (data-testid={{id}} belongs in {{dir}}).",
    },
  },
  create(context) {
    const file = context.filename.replaceAll("\\", "/");
    if (!file.includes("apps/web/src/")) return {};
    return {
      JSXAttribute(node) {
        const id = testId(node);
        const hit = HOMES.find((h) => h.id === id);
        if (!hit) return;
        if (file.includes(hit.dir)) return;
        context.report({ node, messageId: "home", data: hit });
      },
    };
  },
};

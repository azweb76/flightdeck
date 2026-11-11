export type AdfNode = {
  type: string;
  text?: string;
  content?: AdfNode[];
  attrs?: Record<string, unknown>;
};

export function markdownToAdf(markdown: string): AdfNode {
  const blocks = markdown.replace(/\r\n/g, "\n").split(/\n\n+/);
  const content = blocks.flatMap((block) => blockToAdf(block.trim())).filter(Boolean) as AdfNode[];
  return { type: "doc", content: content.length ? content : [{ type: "paragraph", content: [] }] };
}

export function adfToMarkdown(node: unknown): string {
  return adfBlock(node).trim();
}

function blockToAdf(block: string): AdfNode[] {
  if (!block) return [];
  const heading = block.match(/^(#{1,6})\s+(.*)$/);
  if (heading) {
    return [
      {
        type: "heading",
        attrs: { level: heading[1]!.length },
        content: [{ type: "text", text: heading[2] ?? "" }],
      },
    ];
  }
  const lines = block.split("\n");
  if (lines.every((l) => /^[-*]\s+/.test(l))) {
    return [
      {
        type: "bulletList",
        content: lines.map((l) => ({
          type: "listItem",
          content: [{ type: "paragraph", content: [{ type: "text", text: l.replace(/^[-*]\s+/, "") }] }],
        })),
      },
    ];
  }
  return [{ type: "paragraph", content: [{ type: "text", text: block.replace(/\n/g, " ") }] }];
}

function adfBlock(node: unknown): string {
  if (node == null) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(adfBlock).join("");
  if (typeof node !== "object") return "";
  const n = node as AdfNode;
  if (n.type === "text") return n.text ?? "";
  const inner = (n.content ?? []).map(adfBlock).join("");
  if (n.type === "heading") {
    const level = Number(n.attrs?.level ?? 1);
    return `${"#".repeat(Math.min(6, Math.max(1, level)))} ${inner}\n\n`;
  }
  if (n.type === "paragraph") return `${inner}\n\n`;
  if (n.type === "listItem") return `- ${inner.trim()}\n`;
  if (n.type === "bulletList") return `${inner}\n`;
  if (n.type === "doc") return inner;
  return inner;
}

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";

const schema = {
  ...defaultSchema,
  tagNames: (defaultSchema.tagNames ?? []).filter((t) => t !== "img"),
};

export function MarkdownView({
  markdown,
  onClick,
}: {
  markdown: string;
  onClick?: (e: React.MouseEvent<HTMLElement>) => void;
}) {
  return (
    <div onClick={onClick} style={{ fontSize: 13, lineHeight: 1.5, cursor: onClick ? "text" : "default" }}>
      <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[[rehypeSanitize, schema]]}>
        {markdown || "_Empty_"}
      </Markdown>
    </div>
  );
}

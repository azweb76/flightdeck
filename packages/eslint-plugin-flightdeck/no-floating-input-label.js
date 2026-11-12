const FLOATING = new Set(["TextField", "Select", "Autocomplete"]);

/** Ban MUI `label` on inputs so labels stay static via FormField, not notched. */
export const noFloatingInputLabel = {
  meta: {
    type: "problem",
    docs: { description: "Do not pass label= to MUI TextField/Select/Autocomplete (use FormField)." },
    schema: [],
    messages: {
      floating:
        "Do not pass label={{name}} — that notches a floating InputLabel. Use FormField (or FieldLabel above a label-less TextField).",
    },
  },
  create(context) {
    const names = new Set(FLOATING);
    return {
      ImportDeclaration(node) {
        if (node.source.value !== "@mui/material") return;
        for (const spec of node.specifiers) {
          if (spec.type === "ImportSpecifier" && FLOATING.has(spec.imported.name)) {
            names.add(spec.local.name);
          }
        }
      },
      JSXOpeningElement(node) {
        const tag = node.name.type === "JSXIdentifier" ? node.name.name : "";
        if (!names.has(tag)) return;
        const attr = node.attributes.find((a) => a.type === "JSXAttribute" && a.name.name === "label");
        if (attr) context.report({ node: attr, messageId: "floating", data: { name: tag } });
      },
    };
  },
};

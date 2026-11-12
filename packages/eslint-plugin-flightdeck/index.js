import { noFloatingInputLabel } from "./no-floating-input-label.js";

const APPS = ["server", "web"];

function pkgFromFile(filename) {
  const n = filename.replaceAll("\\", "/");
  const app = APPS.find((a) => n.includes(`/apps/${a}/`));
  if (app) return `apps/${app}`;
  if (n.includes("/packages/shared/")) return "packages/shared";
  if (n.includes("/packages/eslint-plugin-flightdeck/")) return "packages/eslint-plugin-flightdeck";
  return null;
}

function targetFromImport(value) {
  if (value === "@flightdeck/shared" || value.startsWith("@flightdeck/shared/")) return "packages/shared";
  if (value.startsWith("@flightdeck/server")) return "apps/server";
  if (value.startsWith("@flightdeck/web")) return "apps/web";
  const m = value.match(/apps\/(server|web)\b/);
  return m ? `apps/${m[1]}` : null;
}

function allowed(from, to) {
  if (!from || !to || from === to) return true;
  if (to === "packages/shared") return true;
  return false;
}

const noCrossPackageImports = {
  meta: {
    type: "problem",
    docs: {
      description: "Only @flightdeck/shared may be imported across packages; apps must not import each other.",
    },
    schema: [],
    messages: {
      cross: "{{from}} must not import {{to}} ({{source}}). Share types via @flightdeck/shared.",
    },
  },
  create(context) {
    const from = pkgFromFile(context.filename);
    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (typeof source !== "string") return;
        const to = targetFromImport(source);
        if (!allowed(from, to)) {
          context.report({ node, messageId: "cross", data: { from, to, source } });
        }
      },
    };
  },
};

export default {
  rules: {
    "no-cross-package-imports": noCrossPackageImports,
    "no-floating-input-label": noFloatingInputLabel,
  },
};

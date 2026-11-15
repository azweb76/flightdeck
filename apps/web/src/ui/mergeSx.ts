import type { SxProps, Theme } from "@mui/material/styles";

export function mergeSx(...parts: Array<SxProps<Theme> | undefined>): SxProps<Theme> {
  const out: Array<Exclude<SxProps<Theme>, undefined>> = [];
  for (const part of parts) {
    if (!part) continue;
    if (Array.isArray(part)) {
      for (const item of part) {
        if (item) out.push(item as Exclude<SxProps<Theme>, undefined>);
      }
    } else {
      out.push(part);
    }
  }
  return out as SxProps<Theme>;
}

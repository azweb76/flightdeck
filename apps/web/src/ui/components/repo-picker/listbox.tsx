import { Box } from "@mui/material";
import { Children, cloneElement, forwardRef, isValidElement, useRef, useState, type HTMLAttributes, type ReactElement } from "react";

const ROW = 36;

/** Windowed Autocomplete listbox so hundreds of repos stay scrollable. */
export const VirtualListbox = forwardRef<HTMLDivElement, HTMLAttributes<HTMLElement>>(function VirtualListbox(
  { children, ...other },
  ref,
) {
  const items = Children.toArray(children);
  const [top, setTop] = useState(0);
  const inner = useRef<HTMLDivElement>(null);
  const start = Math.max(0, Math.floor(top / ROW) - 4);
  const visible = 16;
  const slice = items.slice(start, start + visible);
  return (
    <Box
      ref={ref}
      {...other}
      onScroll={(e) => setTop(e.currentTarget.scrollTop)}
      sx={{ maxHeight: ROW * 8, overflow: "auto", py: 0 }}
    >
      <div ref={inner} style={{ height: items.length * ROW, position: "relative" }}>
        <ul style={{ margin: 0, padding: 0, listStyle: "none", position: "absolute", top: start * ROW, left: 0, right: 0 }}>
          {slice.map((child, i) =>
            isValidElement(child)
              ? cloneElement(child as ReactElement<{ key?: string }>, { key: child.key ?? String(start + i) })
              : child,
          )}
        </ul>
      </div>
    </Box>
  );
});

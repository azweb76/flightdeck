import { Box } from "@mui/material";
import { Children, cloneElement, forwardRef, isValidElement, useState, type HTMLAttributes } from "react";

const ROW = 44;

/** Windowed listbox. Options must be a flat header+row list (no Autocomplete groupBy). */
export const VirtualListbox = forwardRef<HTMLUListElement, HTMLAttributes<HTMLElement>>(function VirtualListbox(
  { children, onScroll, ...other },
  ref,
) {
  const items = Children.toArray(children);
  const [top, setTop] = useState(0);
  const start = Math.max(0, Math.floor(top / ROW) - 6);
  const visible = 18;
  const slice = items.slice(start, start + visible);
  return (
    <Box
      component="ul"
      ref={ref}
      {...other}
      onScroll={(e) => {
        setTop(e.currentTarget.scrollTop);
        onScroll?.(e);
      }}
      sx={{ maxHeight: ROW * 8, overflow: "auto", margin: 0, padding: 0, listStyle: "none" }}
    >
      <li aria-hidden style={{ height: start * ROW, padding: 0, border: 0 }} />
      {slice.map((child) => (isValidElement(child) ? cloneElement(child) : child))}
      <li aria-hidden style={{ height: Math.max(0, items.length - start - slice.length) * ROW, padding: 0, border: 0 }} />
    </Box>
  );
});

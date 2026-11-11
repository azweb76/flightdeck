import type { SVGProps } from "react";

function Svg({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden {...props}>
      {children}
    </svg>
  );
}

export function BellIcon() {
  return (
    <Svg>
      <path
        d="M8 1.75a3.5 3.5 0 0 0-3.5 3.5v1.4c0 .5-.16.98-.46 1.38L3.1 9.3A1 1 0 0 0 3.9 11h8.2a1 1 0 0 0 .8-1.7L12 8.03c-.3-.4-.46-.88-.46-1.38V5.25A3.5 3.5 0 0 0 8 1.75Z"
        stroke="currentColor"
        strokeWidth="1.25"
      />
      <path d="M6.4 12.5a1.7 1.7 0 0 0 3.2 0" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </Svg>
  );
}

export function SearchIcon() {
  return (
    <Svg>
      <circle cx="7" cy="7" r="4.25" stroke="currentColor" strokeWidth="1.25" />
      <path d="M10.2 10.2 13.5 13.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </Svg>
  );
}

export function RefreshIcon() {
  return (
    <Svg>
      <path
        d="M13 8a5 5 0 1 1-1.2-3.3"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      <path d="M13 3.5v3H10" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function PlusIcon() {
  return (
    <Svg>
      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </Svg>
  );
}

export function StarIcon({ filled }: { filled?: boolean }) {
  return (
    <Svg>
      <path
        d="M8 1.8 9.9 5.6l4.2.6-3 3 0.7 4.2L8 11.7l-3.8 1.7 0.7-4.2-3-3 4.2-.6L8 1.8Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

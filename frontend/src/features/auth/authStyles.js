// Shared neo-brutalist styling for the auth pages (login / register / forgot).
// Reuses the .neo-* utilities from index.css so auth matches the landing page
// and the shadcn primitives. Deterministic border color: always one border-2 +
// a single border-color class (never .neo-border alongside border-destructive).

const FIELD_BASE =
  'w-full h-11 bg-background border-2 neo-shadow-sm rounded-md font-sans text-sm text-foreground placeholder:text-muted-foreground/70 outline-none transition-[box-shadow,border-color] duration-150 focus:ring-2';

export const neoField = (hasError, extra = '') =>
  `${FIELD_BASE} ${
    hasError
      ? 'border-destructive focus:border-destructive focus:ring-destructive/20'
      : 'border-foreground focus:border-primary focus:ring-ring/40'
  } ${extra}`;

const BTN_BASE =
  'w-full h-11 border-2 border-foreground rounded-md neo-shadow-sm neo-interactive font-sans text-sm font-semibold flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-70 disabled:pointer-events-none disabled:cursor-not-allowed';

export const NEO_PRIMARY_BTN = `${BTN_BASE} bg-primary text-primary-foreground`;
export const NEO_SECONDARY_BTN = `${BTN_BASE} bg-background text-foreground`;

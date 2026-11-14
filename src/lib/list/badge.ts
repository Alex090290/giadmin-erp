import type { BadgeColor, ListColumn, ListValue } from "./types";

// Static classes keep Tailwind discovery and theme contrast intact.
const classes: Record<BadgeColor, string> = {
  primary: "badge-primary", secondary: "badge-secondary", accent: "badge-accent",
  info: "badge-info", success: "badge-success", warning: "badge-warning",
  error: "badge-error", neutral: "badge-neutral",
};
const textClasses: Record<BadgeColor, string> = {
  primary: "text-primary", secondary: "text-secondary", accent: "text-accent",
  info: "text-info", success: "text-success", warning: "text-warning",
  error: "text-error", neutral: "text-neutral",
};

/** Presentation only: model consumers also check the underlying field is Selection. */
export function validBadgeColumnOptions(column: ListColumn): boolean {
  if (column.widget !== "badge" && column.colors === undefined) return true;
  if (column.widget !== undefined && column.widget !== "badge") return false;
  if (!column.options?.length || (column.type && column.type !== "text") ||
    (column.format && column.format !== "text") || column.displayName === true) return false;
  if (column.colors === undefined) return true;
  return !!column.colors && typeof column.colors === "object" && !Array.isArray(column.colors) &&
    Object.entries(column.colors).every(([value, color]) =>
      column.options!.some(option => option.value === value) && Object.hasOwn(classes, color));
}

export function badgeColorClass(value: ListValue, colors?: ListColumn["colors"]): string {
  const color = typeof value === "string" && colors && Object.hasOwn(colors, value) ? colors[value] : "neutral";
  return Object.hasOwn(classes, color) ? classes[color] : classes.neutral;
}

/** Missing mappings preserve the inherited text color, including empty/unknown values. */
export function selectionTextColorClass(value: ListValue, colors?: ListColumn["colors"]): string {
  const color = typeof value === "string" && colors && Object.hasOwn(colors, value) ? colors[value] : undefined;
  return color && Object.hasOwn(textClasses, color) ? textClasses[color] : "";
}

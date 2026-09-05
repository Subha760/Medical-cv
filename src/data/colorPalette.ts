// AVAILABLE_COLORS in templateCatalog.ts has always just been a list of ids
// ("navy", "teal", ...) — neither this web app nor the Android app ever
// mapped those ids to actual color values until now. Values chosen to stay
// readable as PDF body/heading text (avoid anything too light) and distinct
// from each other.
export const COLOR_HEX: Record<string, string> = {
  navy: "#123B5E",
  blue: "#1D4ED8",
  teal: "#0F6B66",
  green: "#1B7A43",
  black: "#16241F",
  grey: "#4B5563",
  burgundy: "#7A1F2B",
  purple: "#5B2A86",
};

export function colorRgb(colorId: string): [number, number, number] {
  const hex = COLOR_HEX[colorId] ?? COLOR_HEX.navy;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

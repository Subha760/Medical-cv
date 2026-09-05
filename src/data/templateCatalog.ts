export type TemplateCategory =
  | "ATS_PROFESSIONAL"
  | "MODERN_MEDICAL"
  | "CLINICAL"
  | "ACADEMIC"
  | "EXECUTIVE"
  | "MINIMAL"
  | "INTERNATIONAL";

export type TemplateLayout = "classic" | "compact" | "sidebar" | "timeline" | "banded" | "editorial";
export type TemplateHeader = "left" | "center" | "split";
export type TemplateDensity = "airy" | "balanced" | "dense";

export interface CvTemplate {
  id: string;
  displayName: string;
  category: TemplateCategory;
  isAtsFriendly: boolean;
  supportsPhoto: boolean;
  defaultColorId: string;
  layout: TemplateLayout;
  header: TemplateHeader;
  density: TemplateDensity;
  fontStyle: "sans" | "serif" | "condensed";
}

export const DEFAULT_TEMPLATE_ID = "ats_professional_clarity_01";

const FAMILIES: Array<{ category: TemplateCategory; label: string; color: string; ats: boolean; photo: boolean }> = [
  { category: "ATS_PROFESSIONAL", label: "ATS Professional", color: "navy", ats: true, photo: false },
  { category: "MODERN_MEDICAL", label: "Modern Medical", color: "teal", ats: true, photo: true },
  { category: "CLINICAL", label: "Clinical Nursing", color: "green", ats: true, photo: true },
  { category: "ACADEMIC", label: "Academic & Research", color: "navy", ats: true, photo: false },
  { category: "EXECUTIVE", label: "Executive Health", color: "burgundy", ats: false, photo: true },
  { category: "MINIMAL", label: "Minimal", color: "grey", ats: true, photo: false },
  { category: "INTERNATIONAL", label: "International", color: "blue", ats: true, photo: true },
];

const VARIANTS = [
  "Clarity", "Pulse", "Ward", "Vital", "Florence", "Careline", "Sterling", "Beacon", "Rounds",
  "Triage", "Aster", "Meridian", "Horizon", "Sage", "Atlas", "Cura", "Nova", "Unity",
];
const LAYOUTS: TemplateLayout[] = ["classic", "compact", "sidebar", "timeline", "banded", "editorial"];
const HEADERS: TemplateHeader[] = ["left", "center", "split"];
const DENSITIES: TemplateDensity[] = ["balanced", "dense", "airy"];
const FONT_STYLES: CvTemplate["fontStyle"][] = ["sans", "serif", "condensed"];

/** Seven clinical families × eighteen variants = 126 selectable templates. */
export const TEMPLATE_CATALOG: CvTemplate[] = FAMILIES.flatMap((family, familyIndex) =>
  VARIANTS.map((variant, variantIndex) => {
    const layout = LAYOUTS[(variantIndex + familyIndex) % LAYOUTS.length];
    const atsSafeLayout = layout === "classic" || layout === "compact" || layout === "banded";
    return {
      id: family.category.toLowerCase() + "_" + variant.toLowerCase() + "_" + String(variantIndex + 1).padStart(2, "0"),
      displayName: family.label + " " + variant,
      category: family.category,
      isAtsFriendly: family.ats && atsSafeLayout,
      supportsPhoto: family.photo && variantIndex % 3 !== 1,
      defaultColorId: family.color,
      layout,
      header: HEADERS[(variantIndex + familyIndex) % HEADERS.length],
      density: DENSITIES[(variantIndex * 2 + familyIndex) % DENSITIES.length],
      fontStyle: FONT_STYLES[(variantIndex + familyIndex * 2) % FONT_STYLES.length],
    };
  })
);

export const AVAILABLE_COLORS = ["navy", "blue", "teal", "green", "black", "grey", "burgundy", "purple"];

export function templateById(id: string): CvTemplate {
  return TEMPLATE_CATALOG.find((template) => template.id === id) ?? TEMPLATE_CATALOG[0];
}

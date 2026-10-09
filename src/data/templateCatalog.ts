import { unlockedPremiumById } from "./templateRegistry";
export type TemplateCategory =
  | "ATS_PROFESSIONAL"
  | "MODERN_MEDICAL"
  | "CLINICAL"
  | "ACADEMIC"
  | "EXECUTIVE"
  | "MINIMAL"
  | "INTERNATIONAL"
  | "STUDENT";
export type TemplateLayout =
  | "classic"
  | "compact"
  | "sidebar"
  | "timeline"
  | "banded"
  | "editorial"
  | "right-sidebar"
  | "ledger"
  | "cards"
  | "split";
export type TemplateHeader =
  "left" | "center" | "split" | "banner" | "monogram" | "masthead" | "boxed";
export type TemplateDensity = "airy" | "balanced" | "dense";
export type HeadingStyle =
  "rule" | "bar" | "plain" | "numbered" | "outline" | "caps" | "tab" | "double";
export interface CvTemplate {
  id: string;
  displayName: string;
  category: TemplateCategory;
  description: string;
  isAtsFriendly: boolean;
  supportsPhoto: boolean;
  defaultColorId: string;
  layout: TemplateLayout;
  header: TemplateHeader;
  density: TemplateDensity;
  fontStyle: "sans" | "serif" | "condensed" | "mono";
  headingStyle: HeadingStyle;
  recommendedOrder: string[];
  sideSections: string[];
}
export const CATEGORY_INFO: Record<
  TemplateCategory,
  { label: string; description: string; icon: string }
> = {
  ATS_PROFESSIONAL: {
    label: "ATS & Professional",
    description: "Clear single-column layouts for online applications.",
    icon: "◫",
  },
  CLINICAL: {
    label: "Nursing & Clinical",
    description: "Registration, skills and clinical experience in focus.",
    icon: "✚",
  },
  MODERN_MEDICAL: {
    label: "Modern Healthcare",
    description: "Confident layouts with structured visual hierarchy.",
    icon: "◇",
  },
  ACADEMIC: {
    label: "Academic & Research",
    description: "Education, publications and scholarly achievements.",
    icon: "▤",
  },
  EXECUTIVE: {
    label: "Leadership & Executive",
    description: "Distinctive presentation for senior healthcare roles.",
    icon: "↗",
  },
  MINIMAL: {
    label: "Minimal & Editorial",
    description: "Restrained typography and considered white space.",
    icon: "—",
  },
  INTERNATIONAL: {
    label: "International & Photo",
    description: "Profile-led layouts with space for languages.",
    icon: "◎",
  },
  STUDENT: {
    label: "Student & Graduate",
    description: "Education, placement and transferable skills first.",
    icon: "⌁",
  },
};
const normal = [
  "summary",
  "registration",
  "skills",
  "experience",
  "education",
  "certifications",
  "internship",
  "achievements",
  "languages",
  "publications",
  "conferences",
  "memberships",
  "custom",
  "references",
  "hobbies",
  "declaration",
];
const academic = [
  "summary",
  "education",
  "publications",
  "experience",
  "conferences",
  "achievements",
  "memberships",
  "certifications",
  "skills",
  "registration",
  "internship",
  "languages",
  "custom",
  "references",
  "hobbies",
  "declaration",
];
const student = [
  "summary",
  "education",
  "internship",
  "skills",
  "experience",
  "certifications",
  "achievements",
  "languages",
  "registration",
  "publications",
  "conferences",
  "memberships",
  "custom",
  "references",
  "hobbies",
  "declaration",
];
type Preset = [
  string,
  string,
  TemplateLayout,
  TemplateHeader,
  HeadingStyle,
  CvTemplate["fontStyle"],
  TemplateDensity,
  boolean,
  string,
];
const presets: Record<TemplateCategory, Preset[]> = {
  ATS_PROFESSIONAL: [
    [
      "clarity",
      "Professional Clarity",
      "classic",
      "left",
      "rule",
      "sans",
      "balanced",
      false,
      "Traditional hierarchy and a clean section rule.",
    ],
    [
      "precision",
      "Precision Ledger",
      "ledger",
      "left",
      "caps",
      "sans",
      "dense",
      false,
      "Section labels sit in a dedicated left gutter.",
    ],
    [
      "essential",
      "Essential Compact",
      "compact",
      "left",
      "plain",
      "sans",
      "dense",
      false,
      "Concise spacing and simple bullet-led content.",
    ],
    [
      "balance",
      "Balanced Letter",
      "classic",
      "center",
      "double",
      "serif",
      "balanced",
      false,
      "Centred name with formal double-line headings.",
    ],
    [
      "registry",
      "Registry Mono",
      "classic",
      "boxed",
      "caps",
      "mono",
      "balanced",
      false,
      "A framed identity block and clear data-like type.",
    ],
    [
      "focus",
      "Focus Brief",
      "compact",
      "masthead",
      "tab",
      "sans",
      "balanced",
      false,
      "Strong masthead with compact tab-style headings.",
    ],
  ],
  CLINICAL: [
    [
      "ward",
      "Ward Profile",
      "sidebar",
      "left",
      "caps",
      "sans",
      "balanced",
      true,
      "Real left profile column for credentials and skills.",
    ],
    [
      "handover",
      "Handover Record",
      "ledger",
      "boxed",
      "rule",
      "sans",
      "balanced",
      false,
      "Chart-inspired labels and a framed clinical identity.",
    ],
    [
      "rounds",
      "Clinical Rounds",
      "timeline",
      "split",
      "tab",
      "sans",
      "balanced",
      true,
      "Connected experience markers and clinical section tabs.",
    ],
    [
      "florence",
      "Florence Portfolio",
      "right-sidebar",
      "left",
      "rule",
      "serif",
      "airy",
      true,
      "Experience paired with a right credential column.",
    ],
    [
      "careline",
      "Careline Cards",
      "cards",
      "banner",
      "outline",
      "sans",
      "balanced",
      true,
      "A clinical banner and separated experience cards.",
    ],
    [
      "vital",
      "Vital Skills",
      "split",
      "monogram",
      "bar",
      "sans",
      "dense",
      false,
      "A compact skills column beside the clinical record.",
    ],
  ],
  MODERN_MEDICAL: [
    [
      "pulse",
      "Pulse Banner",
      "banded",
      "banner",
      "bar",
      "sans",
      "balanced",
      true,
      "Full-width identity band and strong section ribbons.",
    ],
    [
      "atlas",
      "Atlas Profile",
      "sidebar",
      "monogram",
      "outline",
      "sans",
      "balanced",
      true,
      "A monogram identity and outlined sidebar sections.",
    ],
    [
      "signal",
      "Signal Timeline",
      "timeline",
      "masthead",
      "caps",
      "mono",
      "balanced",
      false,
      "Technical type with linked career milestones.",
    ],
    [
      "prism",
      "Prism Split",
      "split",
      "split",
      "tab",
      "sans",
      "airy",
      true,
      "Two content zones with an offset identity.",
    ],
    [
      "horizon",
      "Horizon Record",
      "cards",
      "boxed",
      "bar",
      "sans",
      "balanced",
      false,
      "Framed header and soft structured entry panels.",
    ],
    [
      "orbit",
      "Orbit Editorial",
      "editorial",
      "center",
      "numbered",
      "serif",
      "airy",
      true,
      "Editorial rules and numbered section introductions.",
    ],
  ],
  ACADEMIC: [
    [
      "scholar",
      "Scholar Folio",
      "classic",
      "center",
      "double",
      "serif",
      "airy",
      false,
      "Traditional scholarly layout with education first.",
    ],
    [
      "index",
      "Research Index",
      "ledger",
      "masthead",
      "numbered",
      "serif",
      "balanced",
      false,
      "A numbered index gutter for long academic records.",
    ],
    [
      "journal",
      "Journal Editorial",
      "editorial",
      "left",
      "caps",
      "serif",
      "balanced",
      false,
      "Journal-like masthead and fine editorial rules.",
    ],
    [
      "thesis",
      "Thesis Portfolio",
      "right-sidebar",
      "boxed",
      "plain",
      "serif",
      "balanced",
      false,
      "Research record alongside skills and memberships.",
    ],
    [
      "faculty",
      "Faculty Dossier",
      "classic",
      "monogram",
      "numbered",
      "sans",
      "airy",
      false,
      "Formal monogram and numbered academic sections.",
    ],
    [
      "evidence",
      "Evidence Brief",
      "compact",
      "split",
      "rule",
      "mono",
      "dense",
      false,
      "Compact data-oriented publication and training record.",
    ],
  ],
  EXECUTIVE: [
    [
      "sterling",
      "Sterling Leadership",
      "sidebar",
      "monogram",
      "caps",
      "serif",
      "airy",
      true,
      "Executive profile column and serif authority.",
    ],
    [
      "beacon",
      "Beacon Statement",
      "banded",
      "banner",
      "double",
      "serif",
      "airy",
      false,
      "A commanding banner and spacious leadership narrative.",
    ],
    [
      "meridian",
      "Meridian Executive",
      "right-sidebar",
      "masthead",
      "bar",
      "sans",
      "balanced",
      true,
      "Large masthead and right professional profile.",
    ],
    [
      "boardroom",
      "Boardroom Ledger",
      "ledger",
      "monogram",
      "caps",
      "serif",
      "balanced",
      false,
      "Structured leadership dossier with a label gutter.",
    ],
    [
      "summit",
      "Summit Portfolio",
      "cards",
      "split",
      "outline",
      "sans",
      "airy",
      true,
      "Leadership entries presented as bordered project cards.",
    ],
    [
      "direction",
      "Direction Editorial",
      "editorial",
      "boxed",
      "numbered",
      "serif",
      "airy",
      false,
      "Framed identity and numbered leadership sections.",
    ],
  ],
  MINIMAL: [
    [
      "pure",
      "Pure Type",
      "classic",
      "left",
      "plain",
      "sans",
      "airy",
      false,
      "Typography alone creates a calm visual hierarchy.",
    ],
    [
      "quiet",
      "Quiet Serif",
      "classic",
      "center",
      "plain",
      "serif",
      "airy",
      false,
      "Centred serif identity with generous spacing.",
    ],
    [
      "folio",
      "Folio Line",
      "editorial",
      "masthead",
      "double",
      "serif",
      "balanced",
      false,
      "Editorial masthead and delicate horizontal rules.",
    ],
    [
      "grid",
      "Grid Notes",
      "ledger",
      "left",
      "plain",
      "mono",
      "dense",
      false,
      "Precise labels and an understated monospaced rhythm.",
    ],
    [
      "space",
      "Open Space",
      "split",
      "left",
      "caps",
      "sans",
      "airy",
      false,
      "An open secondary column with restrained small caps.",
    ],
    [
      "ink",
      "Ink Compact",
      "compact",
      "boxed",
      "rule",
      "sans",
      "dense",
      false,
      "A small framed header and efficient monochrome structure.",
    ],
  ],
  INTERNATIONAL: [
    [
      "passport",
      "Passport Profile",
      "sidebar",
      "boxed",
      "bar",
      "sans",
      "balanced",
      true,
      "Photo-led profile with registration and languages.",
    ],
    [
      "global",
      "Global Credentials",
      "right-sidebar",
      "split",
      "tab",
      "sans",
      "balanced",
      true,
      "A language and credential column on the right.",
    ],
    [
      "mobility",
      "Mobility Brief",
      "classic",
      "banner",
      "outline",
      "sans",
      "balanced",
      true,
      "Wide photo identity strip and outlined sections.",
    ],
    [
      "diplomat",
      "Diplomat Folio",
      "editorial",
      "center",
      "double",
      "serif",
      "airy",
      true,
      "A formal centred identity with elegant section rules.",
    ],
    [
      "metro",
      "Metro Portfolio",
      "cards",
      "monogram",
      "bar",
      "sans",
      "dense",
      true,
      "Photo, monogram and compact structured entry cards.",
    ],
    [
      "crossroads",
      "Crossroads Timeline",
      "timeline",
      "boxed",
      "numbered",
      "sans",
      "balanced",
      true,
      "Framed identity and numbered career milestones.",
    ],
  ],
  STUDENT: [
    [
      "launch",
      "Graduate Launch",
      "classic",
      "banner",
      "tab",
      "sans",
      "balanced",
      false,
      "Education and supervised placement take priority.",
    ],
    [
      "placement",
      "Placement Path",
      "timeline",
      "left",
      "rule",
      "sans",
      "balanced",
      false,
      "An accessible visual path through training and learning.",
    ],
    [
      "foundation",
      "Foundation Skills",
      "split",
      "boxed",
      "outline",
      "sans",
      "balanced",
      false,
      "Training paired with a dedicated skills column.",
    ],
    [
      "campus",
      "Campus Portfolio",
      "sidebar",
      "monogram",
      "caps",
      "sans",
      "airy",
      true,
      "A personal profile beside education and placement evidence.",
    ],
    [
      "discovery",
      "Discovery Scholar",
      "editorial",
      "center",
      "numbered",
      "serif",
      "airy",
      false,
      "An academic-inspired graduate research layout.",
    ],
    [
      "firststep",
      "First Step Brief",
      "compact",
      "split",
      "plain",
      "mono",
      "dense",
      false,
      "A concise first-job CV focused on demonstrable learning.",
    ],
  ],
};
// Additional original layouts: structure changes rather than colour-only copies.
for (const [category, rows] of Object.entries(presets)) {
  rows.push([
    "folio-plus",
    CATEGORY_INFO[category as TemplateCategory].label.split(" & ")[0] +
      " Folio",
    "cards",
    "masthead",
    "caps",
    "mono",
    "airy",
    category === "INTERNATIONAL",
    "Editorial masthead, modular records and precise monospaced typography.",
  ]);
  rows.push([
    "registry-plus",
    CATEGORY_INFO[category as TemplateCategory].label.split(" & ")[0] +
      " Registry",
    "right-sidebar",
    "boxed",
    "numbered",
    "sans",
    "balanced",
    category === "INTERNATIONAL",
    "A framed identity with a numbered main column and separate credential rail.",
  ]);
}
const defaultColors: Record<TemplateCategory, string> = {
  ATS_PROFESSIONAL: "navy",
  CLINICAL: "teal",
  MODERN_MEDICAL: "blue",
  ACADEMIC: "navy",
  EXECUTIVE: "burgundy",
  MINIMAL: "black",
  INTERNATIONAL: "blue",
  STUDENT: "purple",
};
export const TEMPLATE_CATALOG: CvTemplate[] = Object.entries(presets).flatMap(
  ([cat, rows]) =>
    rows.map(
      (
        [
          slug,
          name,
          layout,
          header,
          headingStyle,
          fontStyle,
          density,
          supportsPhoto,
          description,
        ],
        i,
      ) => ({
        id:
          cat === "ATS_PROFESSIONAL" && i === 0
            ? "ats_professional_clarity_01"
            : `${cat.toLowerCase()}_${slug}_v3`,
        displayName: name,
        category: cat as TemplateCategory,
        description,
        layout,
        header,
        headingStyle,
        fontStyle,
        density,
        supportsPhoto,
        defaultColorId: defaultColors[cat as TemplateCategory],
        isAtsFriendly:
          ["classic", "compact", "banded", "editorial"].includes(layout) &&
          !supportsPhoto,
        recommendedOrder:
          cat === "ACADEMIC" ? academic : cat === "STUDENT" ? student : normal,
        sideSections:
          cat === "ACADEMIC"
            ? ["skills", "memberships", "languages", "registration"]
            : ["registration", "skills", "certifications", "languages"],
      }),
    ),
);
export const DEFAULT_TEMPLATE_ID = "ats_professional_clarity_01";
export const AVAILABLE_COLORS = [
  "navy",
  "blue",
  "teal",
  "green",
  "black",
  "grey",
  "burgundy",
  "purple",
];
export function templateById(id: string): CvTemplate {
  const current =
    unlockedPremiumById(id) || TEMPLATE_CATALOG.find((t) => t.id === id);
  if (id.startsWith("premium_") && !current)
    throw new Error("Sign in to load your unlocked premium template.");
  if (current) return current;
  // Existing 2.0 CVs keep a suitable category-specific design after the catalogue migration.
  const category = Object.keys(CATEGORY_INFO).find((k) =>
    id.startsWith(k.toLowerCase()),
  );
  return (
    TEMPLATE_CATALOG.find((t) => t.category === category) ?? TEMPLATE_CATALOG[0]
  );
}

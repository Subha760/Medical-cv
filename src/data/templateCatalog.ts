export type TemplateCategory =
  | "ATS_PROFESSIONAL"
  | "MODERN_MEDICAL"
  | "CLINICAL"
  | "ACADEMIC"
  | "EXECUTIVE"
  | "MINIMAL"
  | "INTERNATIONAL";

export interface CvTemplate {
  id: string;
  displayName: string;
  category: TemplateCategory;
  isAtsFriendly: boolean;
  supportsPhoto: boolean;
  defaultColorId: string;
}

export const DEFAULT_TEMPLATE_ID = "ats_classic_01";

export const TEMPLATE_CATALOG: CvTemplate[] = [
  { id: "ats_classic_01", displayName: "ATS Classic", category: "ATS_PROFESSIONAL", isAtsFriendly: true, supportsPhoto: false, defaultColorId: "navy" },
  { id: "ats_clean_02", displayName: "ATS Clean", category: "ATS_PROFESSIONAL", isAtsFriendly: true, supportsPhoto: false, defaultColorId: "navy" },
  { id: "modern_med_01", displayName: "Modern Medical", category: "MODERN_MEDICAL", isAtsFriendly: true, supportsPhoto: true, defaultColorId: "navy" },
  { id: "modern_med_02", displayName: "Modern Medical Teal", category: "MODERN_MEDICAL", isAtsFriendly: true, supportsPhoto: true, defaultColorId: "teal" },
  { id: "clinical_01", displayName: "Clinical Focus", category: "CLINICAL", isAtsFriendly: true, supportsPhoto: true, defaultColorId: "navy" },
  { id: "clinical_02", displayName: "Clinical Compact", category: "CLINICAL", isAtsFriendly: true, supportsPhoto: false, defaultColorId: "navy" },
  { id: "academic_01", displayName: "Academic Research", category: "ACADEMIC", isAtsFriendly: true, supportsPhoto: false, defaultColorId: "navy" },
  { id: "academic_02", displayName: "Academic Publications", category: "ACADEMIC", isAtsFriendly: true, supportsPhoto: false, defaultColorId: "navy" },
  { id: "executive_01", displayName: "Executive Physician", category: "EXECUTIVE", isAtsFriendly: false, supportsPhoto: true, defaultColorId: "burgundy" },
  { id: "executive_02", displayName: "Executive Administrator", category: "EXECUTIVE", isAtsFriendly: false, supportsPhoto: true, defaultColorId: "navy" },
  { id: "minimal_01", displayName: "Minimal One Page", category: "MINIMAL", isAtsFriendly: true, supportsPhoto: false, defaultColorId: "navy" },
  { id: "minimal_02", displayName: "Minimal Grey", category: "MINIMAL", isAtsFriendly: true, supportsPhoto: false, defaultColorId: "grey" },
  { id: "international_01", displayName: "International Standard", category: "INTERNATIONAL", isAtsFriendly: true, supportsPhoto: true, defaultColorId: "navy" },
  { id: "international_02", displayName: "International Compact", category: "INTERNATIONAL", isAtsFriendly: true, supportsPhoto: false, defaultColorId: "navy" },
  { id: "nursing_focus_01", displayName: "Nursing Focus", category: "CLINICAL", isAtsFriendly: true, supportsPhoto: true, defaultColorId: "green" },
];

export const AVAILABLE_COLORS = ["navy", "blue", "teal", "green", "black", "grey", "burgundy", "purple"];

export function templateById(id: string): CvTemplate {
  return TEMPLATE_CATALOG.find((t) => t.id === id) ?? TEMPLATE_CATALOG[0];
}

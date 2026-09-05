// Mirrors app/src/main/java/com/medcvmaker/domain/model/CoverLetter.kt from
// the Android app. Same privacy model: stored only in this browser's
// localStorage, generated to PDF entirely client-side.

export interface CoverLetter {
  id: string;
  label: string;
  templateId: string;
  applicantName: string;
  position: string;
  hospitalOrCompany: string;
  hiringManager: string;
  opening: string;
  experienceHighlights: string;
  skillsHighlights: string;
  closing: string;
  createdAt: number;
  updatedAt: number;
  isDraft: boolean;
}

export interface CoverLetterTemplate {
  id: string;
  displayName: string;
}

export const COVER_LETTER_TEMPLATES: CoverLetterTemplate[] = [
  { id: "cl_nurse_application", displayName: "Nurse Application" },
  { id: "cl_doctor_application", displayName: "Doctor Application" },
  { id: "cl_hospital_application", displayName: "Hospital Application" },
  { id: "cl_internship", displayName: "Internship" },
  { id: "cl_fresh_graduate", displayName: "Fresh Graduate" },
  { id: "cl_international", displayName: "International Job Application" },
];

export const DEFAULT_COVER_LETTER_TEMPLATE_ID = "cl_nurse_application";

export function newCoverLetter(id: string): CoverLetter {
  const now = Date.now();
  return {
    id,
    label: "",
    templateId: DEFAULT_COVER_LETTER_TEMPLATE_ID,
    applicantName: "",
    position: "",
    hospitalOrCompany: "",
    hiringManager: "",
    opening: "",
    experienceHighlights: "",
    skillsHighlights: "",
    closing: "",
    createdAt: now,
    updatedAt: now,
    isDraft: true,
  };
}

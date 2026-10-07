import { CvDocument, ExperienceEntry } from "../types/cv";
import { PROFESSION_LABELS, defaultSectionOrder } from "../types/cv";
import { TEMPLATE_CATALOG } from "../data/templateCatalog";

function compact(items: string[]) {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

export function generateProfessionalSummary(doc: CvDocument): string {
  const title = doc.personalInfo.professionalTitle.trim() || PROFESSION_LABELS[doc.profession];
  const areas = compact(doc.experience.map(e => e.department || e.specialty));
  const skills = compact([...doc.skills.split(/\n|,/), ...doc.experience.flatMap(e => e.clinicalSkills)]).slice(0, 5);
  return `${title}${areas.length ? " with experience in " + areas.slice(0, 3).join(", ") : ""}.${skills.length ? " Skills include " + skills.join(", ") + "." : ""}`;
}

const WEAK_STARTS: Array<[RegExp, string]> = [
  [/^responsible for\s+/i, "Delivered "],
  [/^helped (with )?/i, "Supported "],
  [/^worked (on|with)\s+/i, "Coordinated "],
  [/^did\s+/i, "Performed "],
  [/^handled\s+/i, "Managed "],
  [/^was involved in\s+/i, "Contributed to "],
];

export function improveResponsibilities(text: string, entry?: ExperienceEntry): string {
  const source = text.trim();
  if (!source) {
    return ""; // Never invent treatment or medication experience.
  }
  return source
    .split(/\n|(?<=[.!?])\s+/)
    .map((sentence) => {
      let improved = sentence.trim();
      for (const [pattern, replacement] of WEAK_STARTS) improved = improved.replace(pattern, replacement);
      if (improved && !/[.!?]$/.test(improved)) improved += ".";
      return improved.charAt(0).toUpperCase() + improved.slice(1);
    })
    .filter(Boolean)
    .join(" ");
}

export function writingTips(doc: CvDocument): string[] {
  const tips: string[] = [];
  if (doc.personalInfo.professionalSummary.trim().length < 80) tips.push("Build a 2–3 sentence summary with role, specialty, strengths, and outcomes.");
  if (!doc.experience.some((entry) => /\d/.test(entry.responsibilities))) tips.push("Add truthful numbers where possible, such as patients per shift, team size, or audit results.");
  if (!doc.experience.some((entry) => entry.clinicalSkills.length)) tips.push("Add role-specific clinical skills so ATS systems can match relevant keywords.");
  if (!doc.certifications.length) tips.push("List current certifications such as BLS, ACLS, infection control, or specialty training.");
  return tips.length ? tips : ["Your content has the core information recruiters and ATS systems usually need."];
}

export function generateAchievements(doc: CvDocument): string {
  return doc.experience.map(e => e.achievements.trim()).filter(Boolean).join("\n");
}

const ROLE_SKILLS: Partial<Record<CvDocument["profession"], string[]>> = {
  NURSE: ["Patient assessment", "Medication administration", "Care planning", "Clinical documentation", "Infection prevention"],
  NURSING_STUDENT: ["Vital signs", "Patient hygiene", "Clinical documentation", "Team communication", "Infection prevention"],
  DOCTOR: ["Clinical assessment", "Diagnosis", "Treatment planning", "Patient counselling", "Clinical documentation"],
  MEDICAL_STUDENT: ["History taking", "Physical examination", "Case presentation", "Clinical documentation", "Team communication"],
  PHARMACIST: ["Medication review", "Dispensing", "Patient counselling", "Drug safety", "Inventory control"],
  PHYSIOTHERAPIST: ["Functional assessment", "Exercise therapy", "Rehabilitation planning", "Patient education", "Progress documentation"],
  MEDICAL_LAB_TECHNICIAN: ["Sample processing", "Quality control", "Laboratory safety", "Result documentation", "Equipment maintenance"],
  RADIOLOGY_TECHNICIAN: ["Patient positioning", "Radiation safety", "Image acquisition", "Equipment operation", "Clinical documentation"],
  HEALTHCARE_ASSISTANT: ["Personal care", "Vital signs", "Patient mobility", "Infection prevention", "Team communication"],
};

export function suggestedSkillsFor(doc: CvDocument): string[] {
  return ROLE_SKILLS[doc.profession] ?? ["Team communication", "Professional documentation"];
}

export interface CvAutopilotResult {
  doc: CvDocument;
  completed: string[];
  needsInput: string[];
}

export function recommendTemplateId(doc: CvDocument): string {
  const preferredCategory = doc.profession === "NURSE" || doc.profession === "NURSING_STUDENT"
    ? "CLINICAL"
    : doc.profession === "DOCTOR" || doc.profession === "MEDICAL_STUDENT"
      ? "MODERN_MEDICAL"
      : "ATS_PROFESSIONAL";
  return TEMPLATE_CATALOG.find((template) =>
    template.category === preferredCategory && template.isAtsFriendly && (doc.personalInfo.profilePhotoDataUrl ? template.supportsPhoto : true)
  )?.id ?? TEMPLATE_CATALOG.find((template) => template.isAtsFriendly)?.id ?? TEMPLATE_CATALOG[0].id;
}

export function runCvAutopilot(source: CvDocument): CvAutopilotResult {
  const doc: CvDocument = JSON.parse(JSON.stringify(source)) as CvDocument;
  const completed: string[] = [];
  const needsInput: string[] = [];

  if (!doc.personalInfo.professionalTitle.trim() && doc.profession !== "OTHER") {
    doc.personalInfo.professionalTitle = PROFESSION_LABELS[doc.profession];
    completed.push("Added a professional title");
  }
  if (!doc.personalInfo.professionalSummary.trim()) {
    doc.personalInfo.professionalSummary = generateProfessionalSummary(doc);
    completed.push("Drafted the professional summary");
  }

  if (!doc.skills.trim()) needsInput.push("Confirm your own core skills");
  if (doc.experience.some(e => !e.responsibilities.trim())) needsInput.push("Add your actual responsibilities");
  doc.templateId = recommendTemplateId(doc);
  if (!doc.sectionOrder.length) doc.sectionOrder = defaultSectionOrder();
  completed.push("Selected an ATS-friendly template", "Optimised the section order");

  if (!doc.personalInfo.fullName.trim()) needsInput.push("Full name");
  if (!doc.personalInfo.phone.trim() && !doc.personalInfo.email.trim()) needsInput.push("Phone number or email");
  if (!doc.registrationInfo.registrationNumber.trim() && !["NURSING_STUDENT", "MEDICAL_STUDENT", "HEALTHCARE_ASSISTANT"].includes(doc.profession)) needsInput.push("Registration or licence number");
  if (!doc.education.length) needsInput.push("Education");
  if (!doc.experience.length && !["NURSING_STUDENT", "MEDICAL_STUDENT"].includes(doc.profession)) needsInput.push("Clinical experience");
  if (!doc.languages.length) needsInput.push("Languages");
  if (!doc.internship?.trim() && ["NURSING_STUDENT", "MEDICAL_STUDENT"].includes(doc.profession)) needsInput.push("Internship or clinical training");
  needsInput.push("Review every generated sentence for accuracy");

  return { doc, completed: [...new Set(completed)], needsInput };
}

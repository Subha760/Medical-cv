import { CvDocument } from "../types/cv";
import { CvTemplate } from "../data/templateCatalog";

/**
 * Mirrors app/src/main/java/com/medcvmaker/domain/usecase/CvUseCases.kt's
 * ValidateCvUseCase — same rule set, same "never block export" philosophy
 * (spec section 17: "Do not prevent export unless absolutely necessary").
 */
export interface ValidationIssue {
  message: string;
  isBlocking: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateCv(doc: CvDocument): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!doc.personalInfo.fullName.trim()) {
    issues.push({ message: "Add your full name.", isBlocking: true });
  }
  if (!doc.personalInfo.professionalTitle.trim()) {
    issues.push({ message: "Add a professional title (e.g. Staff Nurse, MBBS).", isBlocking: false });
  }
  if (doc.personalInfo.email && !EMAIL_RE.test(doc.personalInfo.email)) {
    issues.push({ message: "Check your email address — it looks incomplete.", isBlocking: false });
  }
  if (!["NURSING_STUDENT", "MEDICAL_STUDENT", "HEALTHCARE_ASSISTANT", "OTHER"].includes(doc.profession) && !doc.registrationInfo.registrationNumber.trim()) {
    issues.push({ message: "Add your registration/license number.", isBlocking: false });
  }
  if (doc.education.length === 0) {
    issues.push({ message: "Add at least one education entry.", isBlocking: false });
  }
  if (doc.personalInfo.professionalSummary.length > 900) {
    issues.push({ message: "Your professional summary is quite long — consider trimming it.", isBlocking: false });
  }

  const expired = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) && date < new Date().toLocaleDateString("en-CA");
  if (expired(doc.registrationInfo.licenseExpiry)) issues.push({message:"Your registration expiry date is in the past. Confirm your current registration status.",isBlocking:false});
  doc.certifications.forEach(cert => { if (expired(cert.expiryDate)) issues.push({message:`${cert.name || "A certification"} has an expiry date in the past. Confirm whether it is current.`,isBlocking:false}); });
  doc.experience.forEach(entry => { if (entry.startDate && entry.endDate && /^\d{4}-\d{2}/.test(entry.endDate) && entry.startDate > entry.endDate) issues.push({message:`Check the dates for ${entry.position || "a clinical role"}: the end precedes the start.`,isBlocking:false}); });
  return issues;
}

/**
 * Local, rules-based estimate only — this is not a reproduction of any real
 * ATS vendor's scoring (spec section 48: "Do not claim to reproduce any
 * company's proprietary ATS"). Checks structural things a parser generally
 * struggles with: missing contact info, no section content, and templates
 * that aren't flagged ATS-friendly (two-column/graphic-heavy layouts are
 * exactly what Indeed's own guidance warns can parse poorly).
 */
export interface AtsCheckResult {
  score: number; // 0-100, informational only
  notes: string[];
}

export function checkAtsCompatibility(doc: CvDocument, template: CvTemplate): AtsCheckResult {
  const notes: string[] = [];
  const checklist: boolean[] = [];

  const hasContactInfo = Boolean(doc.personalInfo.phone || doc.personalInfo.email);
  checklist.push(hasContactInfo);
  if (!hasContactInfo) notes.push("Add a phone number or email so recruiters and ATS parsers can find your contact details.");

  checklist.push(Boolean(doc.personalInfo.professionalSummary.trim()));
  if (!doc.personalInfo.professionalSummary.trim()) notes.push("A short professional summary helps both keyword matching and human reviewers.");

  checklist.push(doc.education.length > 0);
  if (doc.education.length === 0) notes.push("No education section detected.");

  const hasExperience = doc.experience.length > 0 || (["NURSING_STUDENT", "MEDICAL_STUDENT"].includes(doc.profession) && Boolean(doc.internship.trim()));
  checklist.push(hasExperience);
  if (!hasExperience) notes.push("No clinical experience detected — add at least one role if you have prior experience.");

  const hasSkillsKeywords = Boolean(doc.skills.trim()) || doc.experience.some((e) => e.clinicalSkills.length > 0) || doc.certifications.length > 0;
  checklist.push(hasSkillsKeywords);
  if (!hasSkillsKeywords) notes.push("Add clinical skills or certifications — these are common ATS keyword targets.");

  checklist.push(template.isAtsFriendly);
  if (!template.isAtsFriendly) {
    notes.push(
      `"${template.displayName}" isn't flagged ATS-friendly — its layout may not parse cleanly in some applicant tracking systems. Consider an ATS Professional template if you're applying through an online portal.`
    );
  }

  const score = Math.round((checklist.filter(Boolean).length / checklist.length) * 100);
  return { score, notes };
}

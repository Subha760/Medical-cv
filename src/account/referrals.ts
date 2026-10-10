import type { CvDocument } from "../types/cv";
export const verificationConsentKey = (userId: string) =>
  "medico:auto-verify:" + userId;
export function autoVerificationEnabled(userId: string) {
  try {
    return localStorage.getItem(verificationConsentKey(userId)) === "yes";
  } catch {
    return false;
  }
}
export function setAutoVerification(userId: string, enabled: boolean) {
  localStorage.setItem(verificationConsentKey(userId), enabled ? "yes" : "no");
}
export function qualifyingCv(doc: CvDocument) {
  return (
    doc.personalInfo.fullName.trim().length >= 3 &&
    !!doc.personalInfo.professionalTitle.trim() &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(doc.personalInfo.email) &&
    (doc.education.some((e) => e.degree.trim() && e.institution.trim()) ||
      doc.experience.some((e) => e.position.trim() && e.hospital.trim()))
  );
}
// Send only the fields needed for the server's completion check. No images,
// signature, birth date, address, registration number or full CV text.
export function completionPayload(doc: CvDocument) {
  return {
    personalInfo: {
      fullName: doc.personalInfo.fullName,
      professionalTitle: doc.personalInfo.professionalTitle,
      email: doc.personalInfo.email,
    },
    education: doc.education.map((e) => ({
      degree: e.degree,
      institution: e.institution,
    })),
    experience: doc.experience.map((e) => ({
      position: e.position,
      hospital: e.hospital,
    })),
  };
}

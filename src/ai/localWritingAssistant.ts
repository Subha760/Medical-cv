import { CvDocument, ExperienceEntry } from "../types/cv";

const CLINICAL_PHRASES: Record<string, string[]> = {
  nurse: ["patient-centred care", "clinical documentation", "medication safety", "multidisciplinary coordination"],
  psychiatric: ["mental-status assessment", "therapeutic communication", "risk assessment", "de-escalation"],
  emergency: ["rapid triage", "emergency response", "patient stabilisation", "time-critical care"],
  icu: ["critical-care monitoring", "ventilator support", "infection prevention", "family communication"],
  paediatric: ["age-appropriate care", "family education", "medication calculation", "growth monitoring"],
  surgical: ["perioperative care", "aseptic technique", "post-operative monitoring", "discharge education"],
};

function roleKey(text: string) {
  const normalized = text.toLowerCase();
  return Object.keys(CLINICAL_PHRASES).find((key) => normalized.includes(key)) ?? "nurse";
}

function compact(items: string[]) {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

export function generateProfessionalSummary(doc: CvDocument): string {
  const title = doc.personalInfo.professionalTitle.trim() || "Nursing professional";
  const departments = compact(doc.experience.map((entry) => entry.department || entry.specialty));
  const key = roleKey(title + " " + departments.join(" "));
  const skills = compact([
    ...CLINICAL_PHRASES[key],
    ...doc.experience.flatMap((entry) => entry.clinicalSkills),
    ...doc.certifications.map((entry) => entry.name),
  ]).slice(0, 5);
  const experience = doc.experience.length
    ? "with experience across " + (departments.slice(0, 2).join(" and ") || "clinical settings")
    : "focused on safe, compassionate clinical practice";
  return title + " " + experience + ". Skilled in " + skills.join(", ") +
    ". Known for accurate documentation, calm communication, and dependable collaboration with patients, families, and multidisciplinary teams.";
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
    const area = entry?.department || entry?.specialty || "the assigned clinical area";
    return "Delivered safe, patient-centred care in " + area +
      "; completed timely assessments and documentation; administered treatment according to protocol; coordinated with the multidisciplinary team; and educated patients and families on ongoing care.";
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

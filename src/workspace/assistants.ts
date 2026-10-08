import { CvDocument } from "../types/cv";
const KEYWORDS = [
  "patient assessment",
  "medication administration",
  "care planning",
  "infection prevention",
  "clinical documentation",
  "patient education",
  "triage",
  "critical care",
  "wound care",
  "communication",
  "leadership",
  "bls",
  "acls",
  "handover",
  "safeguarding",
  "quality improvement",
];
export function matchJob(doc: CvDocument, job: string) {
  const content = [
    doc.skills,
    doc.personalInfo.professionalSummary,
    doc.internship,
    ...doc.experience.flatMap((e) => [
      e.responsibilities,
      e.achievements,
      ...e.clinicalSkills,
    ]),
    ...doc.certifications.map((c) => c.name),
  ]
    .join(" ")
    .toLowerCase();
  const requested = KEYWORDS.filter((k) => job.toLowerCase().includes(k));
  return {
    matched: requested.filter((k) => content.includes(k)),
    missing: requested.filter((k) => !content.includes(k)),
  };
}
export function studyCards(
  notes: string,
): Array<{ question: string; answer: string }> {
  return notes
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 20)
    .map((line) => {
      const divider = line.indexOf(":");
      return divider > 0
        ? {
            question: `Explain ${line.slice(0, divider).trim()}.`,
            answer: line.slice(divider + 1).trim(),
          }
        : {
            question: "Recall the key point from your learning note.",
            answer: line,
          };
    })
    .filter((c) => c.answer.length > 0);
}
export function interviewFeedback(answer: string): string[] {
  const tips: string[] = [];
  if (answer.trim().split(/\s+/).length < 40)
    tips.push("Add a concrete example and enough context for the interviewer.");
  if (!/situation|during|when|placement|shift/i.test(answer))
    tips.push("Situation: describe the context without patient identifiers.");
  if (!/task|goal|responsib|needed/i.test(answer))
    tips.push("Task: explain your responsibility and goal.");
  if (
    !/\bi\b.*(assess|communicat|escalat|review|support|document|organis|check)/i.test(
      answer,
    )
  )
    tips.push(
      "Action: describe what you personally did, including escalation or supervision where relevant.",
    );
  if (!/result|outcome|learn|improv|feedback/i.test(answer))
    tips.push("Result: explain the outcome and what you learned.");
  return tips.length
    ? tips
    : [
        "Your answer includes the STAR structure. Check that every statement is accurate and practice saying it aloud.",
      ];
}
export const INTERVIEW_QUESTIONS = [
  "Tell me about a time you escalated a concern safely.",
  "How do you prioritise competing responsibilities on a busy shift?",
  "Describe a time you communicated effectively with a multidisciplinary team.",
  "What did you learn from feedback during a clinical placement?",
  "How do you maintain confidentiality and professional boundaries?",
  "Describe a quality improvement activity you contributed to.",
];

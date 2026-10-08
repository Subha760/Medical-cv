import { improveResponsibilities } from "./localWritingAssistant";
import { studyCards, interviewFeedback } from "../workspace/assistants";
export const OFFLINE_ASSISTANTS = [
  {
    id: "rewrite",
    name: "CV bullet editor",
    hint: "Polish your own responsibilities without adding facts.",
  },
  {
    id: "summary",
    name: "Summary composer",
    hint: "Combine your title, experience and skills into a summary.",
  },
  {
    id: "keywords",
    name: "Job keyword finder",
    hint: "Find repeated words and phrases in a job description.",
  },
  {
    id: "star",
    name: "Interview coach",
    hint: "Check a practice answer for STAR structure.",
  },
  {
    id: "cards",
    name: "Flashcard maker",
    hint: "Turn Topic: explanation notes into study cards.",
  },
  {
    id: "quiz",
    name: "Recall quiz",
    hint: "Create questions from your own study notes.",
  },
  {
    id: "reflection",
    name: "Reflection guide",
    hint: "Organise learning notes for a professional reflection.",
  },
  {
    id: "sbar",
    name: "SBAR practice",
    hint: "Structure fictional communication practice.",
  },
  {
    id: "email",
    name: "Professional email",
    hint: "Draft an email from the message you provide.",
  },
  {
    id: "cover",
    name: "Cover letter starter",
    hint: "Build an editable letter from your own evidence.",
  },
  {
    id: "plan",
    name: "Study planner",
    hint: "Split topics into manageable study sessions.",
  },
  {
    id: "priorities",
    name: "Task organiser",
    hint: "Sort your own non-clinical tasks by deadline markers.",
  },
  {
    id: "portfolio",
    name: "Portfolio coach",
    hint: "Turn a learning activity into evidence prompts.",
  },
  {
    id: "readability",
    name: "Writing checker",
    hint: "Find long sentences, repeated words and vague claims.",
  },
  {
    id: "wellbeing",
    name: "Shift preparation",
    hint: "Create a personal preparation checklist.",
  },
] as const;
export type AssistantId = (typeof OFFLINE_ASSISTANTS)[number]["id"];
export function runOfflineAssistant(id: AssistantId, input: string): string {
  const text = input.trim();
  if (!text) return "Add your own notes first.";
  const lines = text
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  switch (id) {
    case "rewrite":
      return improveResponsibilities(text);
    case "summary":
      return (
        lines.map((s) => s.replace(/[.!?]+$/, "")).join(". ") +
        ".\n\nCheck that this summary accurately describes you."
      );
    case "keywords": {
      const words = text.toLowerCase().match(/[a-z][a-z-]{3,}/g) || [];
      const stop = new Set([
        "with",
        "that",
        "this",
        "have",
        "will",
        "your",
        "from",
        "their",
        "must",
        "about",
        "role",
        "work",
      ]);
      const counts = new Map<string, number>();
      for (const w of words)
        if (!stop.has(w)) counts.set(w, (counts.get(w) || 0) + 1);
      return (
        [...counts]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 18)
          .map(([w, n]) => `${w} · ${n} occurrence${n === 1 ? "" : "s"}`)
          .join("\n") +
        "\n\nUse only keywords supported by your actual experience."
      );
    }
    case "star":
      return interviewFeedback(text).join("\n\n");
    case "cards":
      return studyCards(text)
        .map((c) => `Q: ${c.question}\nA: ${c.answer}`)
        .join("\n\n");
    case "quiz":
      return studyCards(text)
        .map(
          (c, i) =>
            `${i + 1}. ${c.question}\nCheck against your notes: ${c.answer}`,
        )
        .join("\n\n");
    case "reflection":
      return `Activity / situation\n${text}\n\nWhat did I learn?\n[Describe one new insight.]\n\nWhat went well and what could improve?\n[Use specific evidence.]\n\nNext action\n[Choose one action and a review date.]\n\nRemove identifying information before saving your reflection.`;
    case "sbar":
      return [
        "Fictional practice only. Follow your workplace process for real care.",
        "Situation: [What is happening now?]",
        "Background: [Relevant context only.]",
        `Practice notes:\n${text}`,
        "Assessment: [Your observations, within your scope.]",
        "Recommendation: [What review or support are you requesting?]",
      ].join("\n\n");
    case "email":
      return `Subject: [Add a clear subject]\n\nDear [recipient],\n\n${improveResponsibilities(text)}\n\nPlease let me know the next steps.\n\nKind regards,\n[Your name]`;
    case "cover":
      return `Dear [Hiring Manager],\n\nI am applying for [role] at [organisation].\n\n${improveResponsibilities(text)}\n\n[Explain how this evidence relates to the advertised role.]\n\nThank you for considering my application.\n\nYours sincerely,\n[Your name]`;
    case "plan":
      return lines
        .map(
          (s, i) =>
            `Session ${i + 1}: ${s}\n20 min review · 5 min break · 10 min recall\nAfter 1 day and 1 week: revisit your notes.`,
        )
        .join("\n\n");
    case "priorities":
      return (
        [...lines]
          .sort(
            (a, b) =>
              Number(/today|urgent|overdue/i.test(b)) -
              Number(/today|urgent|overdue/i.test(a)),
          )
          .map((s, i) => `${i + 1}. ${s}\nNext step: [one concrete action]`)
          .join("\n\n") +
        "\n\nThis organises personal tasks, not clinical acuity."
      );
    case "portfolio":
      return `Activity\n${text}\n\nEvidence: [certificate, feedback, reflection or anonymised work.]\nCompetency: [map to your programme or regulator standard.]\nYour contribution: [what you personally did.]\nLearning: [what changed in your practice.]\nSupervisor review: [name / date where appropriate.]\nNext development goal: [specific action and date.]`;
    case "readability": {
      const sentences = text.split(/[.!?]+/).filter((s) => s.trim());
      const long = sentences.filter((s) => s.trim().split(/\s+/).length > 25);
      return `Words: ${text.split(/\s+/).length}\nSentences: ${sentences.length}\nSentences over 25 words: ${long.length}\n${long.map((s) => "Consider splitting: " + s.trim()).join("\n")}\n${/excellent|best|expert|world.class/i.test(text) ? "Support strong claims with concrete evidence." : "Add examples where they help support your claims."}`;
    }
    case "wellbeing":
      return `Your upcoming shift / placement\n${text}\n\n□ Check your rota and travel plan\n□ Prepare ID, uniform and essential equipment\n□ Plan meals, water and breaks\n□ Confirm learning goals and supervision\n□ Make time for sleep and recovery\n□ Review your personal commitments\n\nAdjust this checklist to your workplace and your needs.`;
  }
}

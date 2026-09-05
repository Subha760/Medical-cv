import { jsPDF } from "jspdf";
import { CoverLetter } from "../types/coverLetter";

export function generateCoverLetterPdf(letter: CoverLetter): Blob {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const marginX = 56;
  const pageHeight = pdf.internal.pageSize.getHeight();
  const pageWidth = pdf.internal.pageSize.getWidth();
  let y = 64;

  function ensureSpace(gap: number) {
    if (y + gap > pageHeight - marginX) {
      pdf.addPage();
      y = 64;
    }
  }

  function line(text: string, size: number, bold: boolean, gap: number) {
    ensureSpace(gap);
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.setFontSize(size);
    pdf.text(text, marginX, y);
    y += gap;
  }

  function paragraph(text: string, gap = 15) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    const wrapped = pdf.splitTextToSize(text, pageWidth - marginX * 2) as string[];
    wrapped.forEach((wrappedLine) => {
      ensureSpace(gap);
      pdf.text(wrappedLine, marginX, y);
      y += gap;
    });
    y += 6;
  }

  line(letter.applicantName || "Applicant Name", 14, true, 24);
  line(letter.hiringManager ? `Dear ${letter.hiringManager},` : "Dear Hiring Manager,", 11, false, 20);

  const subject = [
    letter.position ? `Application for ${letter.position}` : "",
    letter.hospitalOrCompany ? `at ${letter.hospitalOrCompany}` : "",
  ]
    .filter(Boolean)
    .join(" ");
  if (subject) line(subject, 11, false, 20);

  if (letter.opening) paragraph(letter.opening);
  if (letter.experienceHighlights) paragraph(letter.experienceHighlights);
  if (letter.skillsHighlights) paragraph(letter.skillsHighlights);
  if (letter.closing) paragraph(letter.closing);

  line("Sincerely,", 11, false, 32);
  line(letter.applicantName, 11, false, 14);

  return pdf.output("blob");
}

export function suggestedCoverLetterFileName(letter: CoverLetter): string {
  const base = (letter.applicantName || "Cover_Letter").replace(/[^A-Za-z0-9_-]+/g, "_");
  return `${base}_cover_letter.pdf`;
}

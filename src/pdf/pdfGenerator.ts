import { jsPDF } from "jspdf";
import { CvDocument } from "../types/cv";
import { templateById } from "../data/templateCatalog";
import { colorRgb } from "../data/colorPalette";

/**
 * Generates the CV PDF entirely client-side with jsPDF — no server call, no
 * upload, matching the Android app's on-device PdfGenerator.kt. Returns a
 * Blob the caller can hand to a download link, window.open, or Web Share.
 *
 * Per-template differentiation, for now: each template's chosen color tints
 * the section headings (via colorPalette.ts), and sections render in the
 * order the user set on the Reorder Sections step (doc.sectionOrder) rather
 * than a fixed sequence. Distinct per-template *layouts* (multi-column,
 * different type treatments per category) are a bigger lift than color +
 * order and are left for a future pass — same honest scope as the Android
 * app's single starter renderer.
 */
export function generateCvPdf(doc: CvDocument): Blob {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const marginX = 48;
  const pageHeight = pdf.internal.pageSize.getHeight();
  const pageWidth = pdf.internal.pageSize.getWidth();
  let y = 56;

  const template = templateById(doc.templateId);
  const [accentR, accentG, accentB] = colorRgb(doc.colorId);
  const INK: [number, number, number] = [22, 36, 31];

  if (template.supportsPhoto && doc.personalInfo.profilePhotoDataUrl) {
    // Top-right headshot — starter placement, same single-column simplicity
    // as the rest of this generator (and a step ahead of the Android app's
    // PdfGenerator.kt, which doesn't embed a photo yet either).
    const photoSize = 72;
    try {
      pdf.addImage(
        doc.personalInfo.profilePhotoDataUrl,
        "JPEG",
        pageWidth - marginX - photoSize,
        40,
        photoSize,
        photoSize
      );
    } catch {
      // A malformed data URL shouldn't break the whole export.
    }
  }

  function ensureSpace(nextLineHeight: number) {
    if (y + nextLineHeight > pageHeight - marginX) {
      pdf.addPage();
      y = 56;
    }
  }

  function line(text: string, size: number, bold: boolean, gap: number, color: [number, number, number] = INK) {
    ensureSpace(gap);
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.setFontSize(size);
    pdf.setTextColor(color[0], color[1], color[2]);
    pdf.text(text, marginX, y);
    y += gap;
  }

  function heading(text: string) {
    line(text, 12, true, 18, [accentR, accentG, accentB]);
  }

  function paragraph(text: string, size = 11, gap = 15) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(size);
    pdf.setTextColor(INK[0], INK[1], INK[2]);
    const maxWidth = pageWidth - marginX * 2;
    const wrapped = pdf.splitTextToSize(text, maxWidth) as string[];
    wrapped.forEach((wrappedLine) => {
      ensureSpace(gap);
      pdf.text(wrappedLine, marginX, y);
      y += gap;
    });
    y += 6;
  }

  // Header block always comes first, regardless of section order.
  line(doc.personalInfo.fullName || "Untitled CV", 20, true, 26, [accentR, accentG, accentB]);
  if (doc.personalInfo.professionalTitle) {
    line(doc.personalInfo.professionalTitle, 12, false, 18);
  }
  const contactLine = [doc.personalInfo.phone, doc.personalInfo.email, doc.personalInfo.cityCountry]
    .filter(Boolean)
    .join("   •   ");
  if (contactLine) line(contactLine, 10, false, 20);

  const sectionRenderers: Record<string, () => void> = {
    summary: () => {
      if (!doc.personalInfo.professionalSummary) return;
      heading("Professional Summary");
      paragraph(doc.personalInfo.professionalSummary);
    },
    registration: () => {
      if (!doc.registrationInfo.registrationNumber) return;
      heading("Registration & License");
      paragraph(`${doc.registrationInfo.councilOrBoard}   •   Reg. No: ${doc.registrationInfo.registrationNumber}`);
    },
    experience: () => {
      if (doc.experience.length === 0) return;
      heading("Clinical Experience");
      doc.experience.forEach((exp) => {
        line(`${exp.position} — ${exp.hospital}`, 11, false, 14);
        const meta = [`${exp.startDate} - ${exp.endDate}`, exp.department].filter(Boolean).join("   •   ");
        line(meta, 10, false, 14);
        if (exp.responsibilities) paragraph(exp.responsibilities, 11, 13);
        y += 4;
      });
    },
    education: () => {
      if (doc.education.length === 0) return;
      heading("Education");
      doc.education.forEach((edu) => {
        line(`${edu.degree} — ${edu.institution}`, 11, false, 14);
        const meta = [`${edu.startYear} - ${edu.graduationYear}`, edu.grade].filter(Boolean).join("   •   ");
        line(meta, 10, false, 16);
      });
    },
    certifications: () => {
      if (doc.certifications.length === 0) return;
      heading("Certifications");
      doc.certifications.forEach((cert) => {
        line(`${cert.name}${cert.issuingBody ? " — " + cert.issuingBody : ""}`, 11, false, 15);
      });
    },
    achievements: () => {
      if (!doc.achievements) return;
      heading("Achievements");
      paragraph(doc.achievements);
    },
    languages: () => {
      if (doc.languages.length === 0) return;
      heading("Languages");
      line(doc.languages.map((l) => `${l.language} (${l.proficiency})`).join("   •   "), 11, false, 18);
    },
    publications: () => {
      if (!doc.publications) return;
      heading("Publications");
      paragraph(doc.publications);
    },
    conferences: () => {
      if (!doc.conferences) return;
      heading("Conferences / Workshops");
      paragraph(doc.conferences);
    },
    memberships: () => {
      if (!doc.memberships) return;
      heading("Professional Memberships");
      paragraph(doc.memberships);
    },
    custom: () => {
      doc.customSections
        .filter((section) => section.entries.length > 0 || section.title)
        .forEach((section) => {
          heading(section.title || "Additional Section");
          section.entries.forEach((entry) => {
            const entryHeading = [entry.heading, entry.date].filter(Boolean).join("   •   ");
            if (entryHeading) line(entryHeading, 11, false, 14);
            if (entry.description) paragraph(entry.description, 11, 13);
          });
        });
    },
    references: () => {
      if (!doc.references) return;
      heading("References");
      paragraph(doc.references);
    },
  };

  const order = doc.sectionOrder.length > 0 ? doc.sectionOrder : Object.keys(sectionRenderers);
  order.forEach((key) => sectionRenderers[key]?.());

  return pdf.output("blob");
}

export function suggestedFileName(doc: CvDocument): string {
  const base = (doc.label || doc.personalInfo.fullName || "CV").replace(/[^A-Za-z0-9_-]+/g, "_");
  return `${base}_${doc.id.slice(0, 8)}.pdf`;
}

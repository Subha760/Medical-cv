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
  const pdf = new jsPDF({ unit: "pt", format: "a4", compress: true });
  const template = templateById(doc.templateId);
  const marginX = template.layout === "compact" ? 38 : template.layout === "sidebar" ? 88 : 48;
  const pageHeight = pdf.internal.pageSize.getHeight();
  const pageWidth = pdf.internal.pageSize.getWidth();
  let y = template.density === "dense" ? 44 : template.density === "airy" ? 68 : 56;

  const [accentR, accentG, accentB] = colorRgb(doc.colorId);
  const INK: [number, number, number] = [22, 36, 31];
  const fontName = template.fontStyle === "serif" ? "times" : "helvetica";
  const densityScale = template.density === "dense" ? 0.88 : template.density === "airy" ? 1.12 : 1;

  function decoratePage() {
  if (template.layout === "sidebar") {
    pdf.setFillColor(accentR, accentG, accentB);
    pdf.rect(0, 0, 54, pageHeight, "F");
  }
  if (template.layout === "banded") {
    pdf.setFillColor(accentR, accentG, accentB);
    pdf.rect(0, 0, pageWidth, 24, "F");
  }
  if (template.layout === "timeline") { pdf.setDrawColor(accentR, accentG, accentB); pdf.setLineWidth(1); pdf.line(marginX-12, 35, marginX-12, pageHeight-40); }
  if (template.layout === "editorial") { pdf.setDrawColor(accentR, accentG, accentB); pdf.setLineWidth(3); pdf.line(marginX, 24, pageWidth-marginX, 24); }
  }
  decoratePage();

  if (doc.personalInfo.profilePhotoDataUrl) {
    // Top-right headshot — starter placement, same single-column simplicity
    // as the rest of this generator (and a step ahead of the Android app's
    // PdfGenerator.kt, which doesn't embed a photo yet either).
    const photoSize = 72;
    try {
      pdf.saveGraphicsState();
      if (doc.personalInfo.photoShape === "round") { pdf.circle(pageWidth-marginX-photoSize/2, 40+photoSize/2, photoSize/2, null); pdf.clip(); pdf.discardPath(); }
      const props = pdf.getImageProperties(doc.personalInfo.profilePhotoDataUrl);
      const scale = Math.max(photoSize / props.width, photoSize / props.height);
      if (doc.personalInfo.photoShape !== "round") { pdf.rect(pageWidth-marginX-photoSize,40,photoSize,photoSize,null); pdf.clip(); pdf.discardPath(); }
      pdf.addImage(
        doc.personalInfo.profilePhotoDataUrl,
        props.fileType,
        pageWidth - marginX - photoSize + (photoSize-props.width*scale)/2,
        40 + (photoSize-props.height*scale)/2,
        props.width*scale,
        props.height*scale
      );
    } catch {
      // A malformed data URL shouldn't break the whole export.
    } finally { pdf.restoreGraphicsState(); }
  }

  function ensureSpace(nextLineHeight: number) {
    if (y + nextLineHeight > pageHeight - marginX) {
      pdf.addPage();
      decoratePage();
      y = 56;
    }
  }

  function line(text: string, size: number, bold: boolean, gap: number, color: [number, number, number] = INK) {
    const scaledGap = gap * densityScale;
    ensureSpace(scaledGap);
    pdf.setFont(fontName, bold ? "bold" : "normal");
    pdf.setFontSize(size);
    pdf.setTextColor(color[0], color[1], color[2]);
    const wrapped = pdf.splitTextToSize(text, pageWidth - marginX * 2) as string[];
    wrapped.forEach(row => { ensureSpace(scaledGap); pdf.text(row, marginX, y); y += scaledGap; });
  }

  function heading(text: string) {
    ensureSpace(48);
    y += 8;
    if (template.layout === "timeline") {
      pdf.setFillColor(accentR, accentG, accentB);
      pdf.circle(marginX - 10, y - 4, 3, "F");
    }
    line(text, 12, true, 18, [accentR, accentG, accentB]);
    pdf.setDrawColor(accentR, accentG, accentB);
    pdf.setLineWidth(template.layout === "editorial" ? 1.4 : 0.5);
    pdf.line(marginX, y-12, pageWidth-marginX, y-12);
    y += 3;
  }

  function bullets(text: string) {
    text.split(/\n|;\s*/).map(t => t.trim().replace(/^[•*\-]\s*/, '')).filter(Boolean).forEach(t => paragraph('• ' + t));
  }
  function table(rows: string[][], widths: number[]) {
    rows.forEach((row, index) => {
      pdf.setFont(fontName,index === 0 ? 'bold' : 'normal'); pdf.setFontSize(10);
      const cells = row.map((cell,i) => pdf.splitTextToSize(cell || '-', widths[i]-14) as string[]);
      const count = Math.max(...cells.map(c => c.length));
      for (let offset=0; offset<count; offset+=35) {
        const n = Math.min(35, count-offset); const height = n*13+14; ensureSpace(height+10);
        let x=marginX;
        cells.forEach((cell,i) => { pdf.setFillColor(index===0 ? 230 : 248,index===0 ? 240 : 250,index===0 ? 244 : 252); pdf.setDrawColor(212,223,230); pdf.rect(x,y-10,widths[i],height,'FD'); pdf.setTextColor(...INK); pdf.text(cell.slice(offset,offset+n),x+7,y+3); x+=widths[i]; });
        y+=height;
      }
    }); y+=8;
  }

  function paragraph(text: string, size = 11, gap = 15) {
    pdf.setFont(fontName, "normal");
    pdf.setFontSize(size);
    pdf.setTextColor(INK[0], INK[1], INK[2]);
    const maxWidth = pageWidth - marginX * 2;
    const wrapped = pdf.splitTextToSize(text, maxWidth) as string[];
    wrapped.forEach((wrappedLine) => {
      const scaledGap = gap * densityScale;
      ensureSpace(scaledGap);
      pdf.text(wrappedLine, marginX, y);
      y += scaledGap;
    });
    y += 6;
  }

  // Header block always comes first, regardless of section order.
  const headerName = doc.personalInfo.fullName || "Untitled CV";
  const headerWidth = pageWidth-marginX*2-(doc.personalInfo.profilePhotoDataUrl ? 92 : 0);
  pdf.setFont(fontName,'bold'); pdf.setFontSize(20);
  const nameLines = pdf.splitTextToSize(headerName,headerWidth) as string[];
  if (template.header === "center" && !doc.personalInfo.profilePhotoDataUrl) {
    pdf.setFont(fontName, "bold");
    pdf.setFontSize(20);
    pdf.setTextColor(accentR, accentG, accentB);
    nameLines.forEach(name => { pdf.text(name, pageWidth / 2, y, { align: "center" }); y += 26; });
  } else {
    nameLines.forEach(name => line(name, 20, true, 26, [accentR, accentG, accentB]));
  }
  if (doc.personalInfo.profilePhotoDataUrl) y = Math.max(y, 126);
  if (doc.personalInfo.professionalTitle) {
    line(doc.personalInfo.professionalTitle, 12, false, 18);
  }
  const contactLine = [doc.personalInfo.phone, doc.personalInfo.email, doc.personalInfo.cityCountry, doc.personalInfo.linkedInUrl, doc.personalInfo.professionalWebsite]
    .filter(Boolean)
    .join("   •   ");
  if (contactLine) line(contactLine, 10, false, 20);
  const personalLine = [doc.personalInfo.fullAddress, doc.personalInfo.dateOfBirth ? `DOB: ${doc.personalInfo.dateOfBirth}` : "", doc.personalInfo.nationality, doc.personalInfo.maritalStatus]
    .filter(Boolean).join("   •   ");
  if (personalLine) line(personalLine, 9, false, 18);
  const optionalPersonalLine = [doc.personalInfo.caste, doc.personalInfo.religion].filter(Boolean).join("   •   ");
  if (optionalPersonalLine) line(optionalPersonalLine, 9, false, 18);

  const sectionRenderers: Record<string, () => void> = {
    summary: () => {
      if (!doc.personalInfo.professionalSummary) return;
      heading("Professional Summary");
      paragraph(doc.personalInfo.professionalSummary);
    },
    skills: () => {
      if (!doc.skills) return;
      heading("Core Skills");
      bullets(doc.skills);
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
        if (exp.responsibilities) bullets(exp.responsibilities);
        if (exp.achievements) bullets(exp.achievements);
        if (exp.clinicalSkills?.length) bullets(exp.clinicalSkills.join('\n'));
        y += 4;
      });
    },
    education: () => {
      if (doc.education.length === 0) return;
      heading("Education");
      if (["editorial", "banded"].includes(template.layout)) {
        const w = pageWidth-marginX*2;
        table([["Qualification / Institution", "Period / Grade"], ...doc.education.map(e => [[e.degree,e.institution,e.location].filter(Boolean).join('\n'), [e.startYear+' - '+e.graduationYear,e.grade].filter(Boolean).join('\n')])], [w*.68,w*.32]);
        return;
      }
      doc.education.forEach((edu) => {
        line(`${edu.degree} — ${edu.institution}`, 11, false, 14);
        const meta = [`${edu.startYear} - ${edu.graduationYear}`, edu.grade].filter(Boolean).join("   •   ");
        line(meta, 10, false, 16);
      });
    },
    internship: () => {
      if (!doc.internship) return;
      heading("Internship / Clinical Training");
      paragraph(doc.internship);
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
      bullets(doc.achievements);
    },
    languages: () => {
      if (doc.languages.length === 0) return;
      heading("Languages");
      const w = pageWidth-marginX*2;
      table([["Language", "Proficiency"], ...doc.languages.map(l => [l.language,l.proficiency])], [w*.5,w*.5]);
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
            if (entry.location) line(entry.location,10,false,14);
            if (entry.description) bullets(entry.description);
          });
        });
    },
    references: () => {
      if (!doc.references) return;
      heading("References");
      paragraph(doc.references);
    },
    hobbies: () => {
      if (!doc.hobbies) return;
      heading("Interests");
      paragraph(doc.hobbies);
    },
    declaration: () => {
      if (!doc.declaration) return;
      heading("Declaration");
      paragraph(doc.declaration);
      const meta = [doc.declarationDate ? `Date: ${doc.declarationDate}` : "", doc.declarationPlace ? `Place: ${doc.declarationPlace}` : ""].filter(Boolean).join("   •   ");
      if (meta) line(meta, 10, false, 18);
      if (doc.signatureDataUrl) {
        try { ensureSpace(56); const format = doc.signatureDataUrl.includes("image/png") ? "PNG" : "JPEG"; pdf.addImage(doc.signatureDataUrl, format, pageWidth-marginX-130, y, 110, 44); y += 48; } catch { /* keep text signature fallback */ }
      }
      if (doc.signatureName) {
        ensureSpace(40);
        pdf.setFont(fontName, "bold"); pdf.setFontSize(10); pdf.text(doc.signatureName, pageWidth-marginX, y, {align:"right"}); y += 16;
        pdf.setFont(fontName, "normal"); pdf.text("Signature", pageWidth-marginX, y, {align:"right"}); y += 18;
      }
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

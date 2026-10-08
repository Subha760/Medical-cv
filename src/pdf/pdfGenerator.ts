import { jsPDF } from "jspdf";
import { CvDocument, SECTION_LABELS } from "../types/cv";
import { templateById } from "../data/templateCatalog";
import { colorRgb } from "../data/colorPalette";
type RGB = [number, number, number];
interface Block {
  key: string;
  title: string;
  entries: Array<{
    heading?: string;
    meta?: string;
    body?: string;
    bullets?: boolean;
  }>;
}
function blocksFor(d: CvDocument): Block[] {
  const blocks: Block[] = [];
  const add = (key: string, text: string) => {
    if (text.trim())
      blocks.push({
        key,
        title: SECTION_LABELS[key],
        entries: [
          { body: text, bullets: ["skills", "achievements"].includes(key) },
        ],
      });
  };
  add("summary", d.personalInfo.professionalSummary);
  const r = d.registrationInfo;
  add(
    "registration",
    [
      r.councilOrBoard,
      r.registrationNumber ? `Registration: ${r.registrationNumber}` : "",
      r.registrationRegion,
      r.licenseExpiry ? `Expiry: ${r.licenseExpiry}` : "",
      r.currentPosition,
      r.specialization,
      r.yearsOfExperience ? `${r.yearsOfExperience} years of experience` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );
  add("skills", d.skills);
  if (d.experience.length)
    blocks.push({
      key: "experience",
      title: SECTION_LABELS.experience,
      entries: d.experience.map((e) => ({
        heading: [e.position, e.hospital].filter(Boolean).join(" | "),
        meta: [
          e.department,
          e.specialty,
          [e.startDate, e.endDate].filter(Boolean).join(" - "),
        ]
          .filter(Boolean)
          .join(" | "),
        body: [e.responsibilities, e.achievements, e.clinicalSkills.join("\n")]
          .filter(Boolean)
          .join("\n"),
        bullets: true,
      })),
    });
  if (d.education.length)
    blocks.push({
      key: "education",
      title: SECTION_LABELS.education,
      entries: d.education.map((e) => ({
        heading: [e.degree, e.institution].filter(Boolean).join(" | "),
        meta: [
          e.location,
          [e.startYear, e.graduationYear].filter(Boolean).join(" - "),
          e.grade,
        ]
          .filter(Boolean)
          .join(" | "),
      })),
    });
  if (d.certifications.length)
    blocks.push({
      key: "certifications",
      title: SECTION_LABELS.certifications,
      entries: d.certifications.map((c) => ({
        heading: c.name,
        meta: [
          c.issuingBody,
          c.issueDate ? `Issued: ${c.issueDate}` : "",
          c.expiryDate ? `Expires: ${c.expiryDate}` : "",
        ]
          .filter(Boolean)
          .join(" | "),
      })),
    });
  if (d.languages.length)
    blocks.push({
      key: "languages",
      title: SECTION_LABELS.languages,
      entries: d.languages.map((l) => ({
        heading: l.language,
        meta: l.proficiency,
      })),
    });
  for (const key of [
    "internship",
    "achievements",
    "publications",
    "conferences",
    "memberships",
    "references",
    "hobbies",
  ] as const)
    add(key, d[key]);
  d.customSections.forEach((s, i) => {
    if (s.title || s.entries.length)
      blocks.push({
        key: `custom-${i}`,
        title: s.title || "Additional Section",
        entries: s.entries.map((e) => ({
          heading: e.heading,
          meta: [e.date, e.location].filter(Boolean).join(" | "),
          body: e.description,
        })),
      });
  });
  add(
    "declaration",
    [
      d.declaration,
      d.declarationDate ? `Date: ${d.declarationDate}` : "",
      d.declarationPlace ? `Place: ${d.declarationPlace}` : "",
      d.signatureName,
    ]
      .filter(Boolean)
      .join("\n"),
  );
  const order = d.sectionOrder.length
    ? d.sectionOrder
    : templateById(d.templateId).recommendedOrder;
  return blocks.sort((a, b) => {
    const index = (k: string) => {
      const i = order.indexOf(k.startsWith("custom-") ? "custom" : k);
      return i < 0 ? 999 : i;
    };
    return index(a.key) - index(b.key);
  });
}
/** Column-aware renderer. Every preset changes structure, header or heading treatment. */
export function generateCvPdf(doc: CvDocument): Blob {
  const t = templateById(doc.templateId),
    pdf = new jsPDF({ unit: "pt", format: "a4", compress: true });
  const W = pdf.internal.pageSize.getWidth(),
    H = pdf.internal.pageSize.getHeight();
  const accent: RGB = colorRgb(doc.colorId),
    ink: RGB = [28, 39, 54],
    muted: RGB = [84, 97, 114],
    paper: RGB = [243, 246, 249],
    white: RGB = [255, 255, 255];
  const font =
    t.fontStyle === "serif"
      ? "times"
      : t.fontStyle === "mono"
        ? "courier"
        : "helvetica";
  const dense = t.density === "dense",
    gap = dense ? 13 : t.density === "airy" ? 16 : 14.5,
    bodySize = dense ? 9.5 : 10.2;
  const leftSidebar = t.layout === "sidebar",
    rightSidebar = t.layout === "right-sidebar",
    split = t.layout === "split";
  const hasSide = leftSidebar || rightSidebar || split,
    ledger = t.layout === "ledger";
  const margin = t.layout === "compact" ? 36 : 44,
    sideWidth = hasSide ? 154 : 0,
    gutter = 24;
  const mainX = leftSidebar ? margin + sideWidth + gutter : margin;
  const mainWidth =
    W - margin - mainX - (rightSidebar || split ? sideWidth + gutter : 0);
  const sideX = leftSidebar ? margin : W - margin - sideWidth;
  let page = 1,
    x = margin,
    width = W - margin * 2,
    y = 54,
    side = false,
    sectionNumber = 0;
  const decorated = new Set<number>();
  function decorate(p: number) {
    if (decorated.has(p)) return;
    decorated.add(p);
    pdf.setPage(p);
    if (leftSidebar || rightSidebar) {
      pdf.setFillColor(...paper);
      pdf.rect(sideX - 14, 24, sideWidth + 28, H - 58, "F");
    }
    if (t.layout === "editorial") {
      pdf.setDrawColor(...accent);
      pdf.setLineWidth(2);
      pdf.line(margin, 26, W - margin, 26);
    }
    if (t.layout === "banded") {
      pdf.setFillColor(...accent);
      pdf.rect(0, 0, W, 14, "F");
    }
    if (t.layout === "timeline") {
      pdf.setDrawColor(...accent);
      pdf.setLineWidth(0.6);
      pdf.line(mainX - 12, 42, mainX - 12, H - 48);
    }
  }
  function setPage(p: number) {
    while (pdf.getNumberOfPages() < p) pdf.addPage();
    pdf.setPage(p);
    decorate(p);
  }
  function space(h: number) {
    if (y + h > H - 48) {
      page++;
      setPage(page);
      y = 54;
    }
  }
  function text(
    value: string,
    size = bodySize,
    bold = false,
    color: RGB = ink,
    step = gap,
    align: "left" | "center" = "left",
  ) {
    if (!value) return;
    pdf.setFont(font, bold ? "bold" : "normal");
    pdf.setFontSize(size);
    const rows = pdf.splitTextToSize(value, width) as string[];
    for (const row of rows) {
      space(step);
      pdf.setFont(font, bold ? "bold" : "normal");
      pdf.setFontSize(size);
      pdf.setTextColor(...color);
      pdf.text(row, align === "center" ? x + width / 2 : x, y, { align });
      y += step;
    }
  }
  function photo(px: number, py: number, size: number) {
    if (!t.supportsPhoto || !doc.personalInfo.profilePhotoDataUrl) return;
    let saved = false;
    try {
      const data = doc.personalInfo.profilePhotoDataUrl,
        props = pdf.getImageProperties(data),
        scale = Math.max(size / props.width, size / props.height);
      pdf.saveGraphicsState();
      saved = true;
      if (doc.personalInfo.photoShape === "round") {
        pdf.circle(px + size / 2, py + size / 2, size / 2, null);
      } else pdf.rect(px, py, size, size, null);
      pdf.clip();
      pdf.discardPath();
      pdf.addImage(
        data,
        props.fileType,
        px + (size - props.width * scale) / 2,
        py + (size - props.height * scale) / 2,
        props.width * scale,
        props.height * scale,
      );
    } catch {
      /* malformed photos do not prevent export */
    } finally {
      if (saved) pdf.restoreGraphicsState();
    }
  }
  setPage(1);
  const p = doc.personalInfo,
    actualPhoto = Boolean(
      t.supportsPhoto &&
      p.profilePhotoDataUrl &&
      !(leftSidebar || rightSidebar),
    );
  if (hasSide) {
    x = mainX;
    width = mainWidth;
  }
  const headerX = x,
    headerWidth = width,
    headerY = y;
  if (t.header === "banner") {
    pdf.setFillColor(...accent);
    pdf.roundedRect(x - 12, 36, width + 24, 90, 5, 5, "F");
    y = 66;
    if (actualPhoto) {
      photo(x + width - 65, 44, 64);
      width -= 82;
    }
    text(p.fullName || "Your name", 25, true, white, 29);
    text(p.professionalTitle, 11, false, white, 18);
    width = headerWidth;
    y = Math.max(y, 146);
  } else if (t.header === "boxed") {
    pdf.setDrawColor(...accent);
    pdf.setLineWidth(0.8);
    pdf.rect(x - 12, 36, width + 24, actualPhoto ? 110 : 90);
    y = 64;
    if (actualPhoto) {
      photo(x + width - 64, 48, 64);
      width -= 82;
    }
    text(p.fullName || "Your name", 22, true, accent, 26);
    text(p.professionalTitle, 11, false, muted, 18);
    width = headerWidth;
    y = Math.max(y, actualPhoto ? 164 : 144);
  } else if (t.header === "monogram") {
    pdf.setFillColor(...accent);
    pdf.roundedRect(x, 40, 48, 48, 6, 6, "F");
    pdf.setTextColor(...white);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.text(
      (p.fullName || "CV")
        .split(/\s+/)
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase(),
      x + 24,
      70,
      { align: "center" },
    );
    x += 62;
    width -= 62;
    y = 60;
    if (actualPhoto) {
      photo(headerX + headerWidth - 58, 42, 58);
      width -= 76;
    }
    text(p.fullName || "Your name", 21, true, ink, 25);
    text(p.professionalTitle, 10, false, muted, 16);
    x = headerX;
    width = headerWidth;
    y = Math.max(y, 112);
  } else {
    if (actualPhoto) {
      photo(x + width - 64, 40, 64);
      width -= 82;
    }
    const center = t.header === "center" && !actualPhoto;
    text(
      p.fullName || "Your name",
      t.header === "masthead" ? 30 : 24,
      true,
      accent,
      t.header === "masthead" ? 34 : 28,
      center ? "center" : "left",
    );
    text(
      p.professionalTitle,
      t.header === "split" ? 13 : 11,
      false,
      muted,
      19,
      center ? "center" : "left",
    );
    width = headerWidth;
    if (t.header === "split") {
      pdf.setDrawColor(...accent);
      pdf.line(x, y + 4, x + width, y + 4);
      y += 16;
    }
    if (actualPhoto) y = Math.max(y, 120);
  }
  if (!hasSide) {
    text(
      [p.phone, p.email, p.cityCountry].filter(Boolean).join(" | "),
      9,
      false,
      muted,
      13,
    );
    text(
      [p.linkedInUrl, p.professionalWebsite].filter(Boolean).join(" | "),
      9,
      false,
      muted,
      13,
    );
  }
  const extra = [
    p.fullAddress,
    p.dateOfBirth ? `DOB: ${p.dateOfBirth}` : "",
    p.nationality,
    p.maritalStatus,
    p.caste,
    p.religion,
  ]
    .filter(Boolean)
    .join(" | ");
  if (extra) text(extra, 8.5, false, muted, 12);
  y += 14;
  const bodyY = y;
  function heading(title: string) {
    space(50);
    y += 9;
    sectionNumber++;
    const style = t.headingStyle;
    if (t.layout === "timeline" && !side) {
      pdf.setFillColor(...accent);
      pdf.circle(x - 12, y - 3, 3, "F");
    }
    if (style === "bar") {
      pdf.setFillColor(...paper);
      pdf.rect(x - 6, y - 13, width + 12, 24, "F");
    }
    if (style === "outline") {
      pdf.setDrawColor(...accent);
      pdf.setLineWidth(0.5);
      pdf.roundedRect(x - 6, y - 13, width + 12, 24, 3, 3);
    }
    if (style === "tab") {
      pdf.setFillColor(...accent);
      pdf.rect(x - 6, y - 13, 4, 24, "F");
    }
    text(
      (style === "numbered"
        ? String(sectionNumber).padStart(2, "0") + "  "
        : "") + (style === "caps" ? title.toUpperCase() : title),
      side ? 9 : 11,
      true,
      accent,
      17,
    );
    if (style === "rule" || style === "double") {
      pdf.setDrawColor(...accent);
      pdf.setLineWidth(0.5);
      pdf.line(x, y - 8, x + width, y - 8);
      if (style === "double") pdf.line(x, y - 5, x + width, y - 5);
      y += 5;
    }
    y += 7;
  }
  function render(block: Block) {
    if (ledger && !side) {
      const savedX = x,
        savedWidth = width;
      pdf.setFont(font, "bold");
      pdf.setFontSize(8.5);
      const title = pdf.splitTextToSize(
        block.title.toUpperCase(),
        88,
      ) as string[];
      space(Math.max(58, title.length * 12 + 20));
      const sectionY = y + 9;
      const sectionPage = page;
      pdf.setTextColor(...accent);
      title.forEach((row, i) => pdf.text(row, savedX, sectionY + i * 12));
      x += 112;
      width -= 112;
      y += 9;
      renderEntries(block);
      x = savedX;
      width = savedWidth;
      if (page === sectionPage) y = Math.max(y, sectionY + title.length * 12);
      y += 14;
      return;
    }
    heading(block.title);
    renderEntries(block);
    y += 5;
  }
  function renderEntries(block: Block) {
    for (const entry of block.entries) {
      space(entry.heading ? 45 : gap);
      if (t.layout === "cards" && !side) {
        pdf.setFillColor(...paper);
        pdf.roundedRect(
          x - 8,
          y - 13,
          width + 16,
          entry.meta ? 47 : 28,
          3,
          3,
          "F",
        );
      }
      if (entry.heading)
        text(entry.heading, side ? 9.5 : 11, true, ink, gap + 1);
      if (entry.meta) text(entry.meta, side ? 8.5 : 9, false, muted, gap - 1);
      if (entry.body) {
        if (entry.bullets) {
          for (const line of entry.body
            .split(/\n|;\s*/)
            .map((v) => v.trim().replace(/^[•*\-]\s*/, ""))
            .filter(Boolean))
            text("• " + line, bodySize, false, ink, gap);
        } else text(entry.body, bodySize, false, ink, gap);
      }
      y += 8;
    }
  }
  const blocks = blocksFor(doc);
  if (hasSide) {
    const sideBlocks = blocks.filter((b) => t.sideSections.includes(b.key));
    const mainBlocks = blocks.filter((b) => !t.sideSections.includes(b.key));
    // Independent column page cursors prevent overlap and permit long sidebar content.
    page = 1;
    setPage(page);
    x = sideX;
    width = sideWidth;
    y = leftSidebar || rightSidebar ? 52 : bodyY;
    side = true;
    if (
      t.supportsPhoto &&
      p.profilePhotoDataUrl &&
      (leftSidebar || rightSidebar)
    ) {
      photo(x + 25, y - 8, 94);
      y += 108;
    }
    heading("Contact");
    for (const value of [
      p.phone,
      p.email,
      p.cityCountry,
      p.linkedInUrl,
      p.professionalWebsite,
    ].filter(Boolean))
      text(value, 9, false, muted, 13);
    y += 10;
    for (const block of sideBlocks) render(block);
    page = 1;
    setPage(page);
    x = mainX;
    width = mainWidth;
    y = bodyY;
    side = false;
    sectionNumber = 0;
    for (const block of mainBlocks) render(block);
  } else {
    for (const block of blocks) render(block);
  }
  if (doc.signatureDataUrl) {
    space(60);
    try {
      pdf.addImage(
        doc.signatureDataUrl,
        pdf.getImageProperties(doc.signatureDataUrl).fileType,
        x,
        y,
        100,
        40,
      );
      y += 46;
    } catch {
      /* text signature remains */
    }
  }
  for (let i = 1; i <= pdf.getNumberOfPages(); i++) {
    pdf.setPage(i);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(...muted);
    pdf.text(`${i} / ${pdf.getNumberOfPages()}`, W - margin, H - 27, {
      align: "right",
    });
  }
  return pdf.output("blob");
}
export function suggestedFileName(doc: CvDocument): string {
  return `${(doc.label || doc.personalInfo.fullName || "CV").replace(/[^A-Za-z0-9_-]+/g, "_")}_${doc.id.slice(0, 8)}.pdf`;
}

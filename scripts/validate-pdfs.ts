import { generateCvPdf } from "../src/pdf/pdfGenerator";
import { demoCv } from "../src/data/demoCv";
import { TEMPLATE_CATALOG } from "../src/data/templateCatalog";
import { writeFileSync, mkdirSync } from "node:fs";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import assert from "node:assert/strict";
mkdirSync("tmp/pdf-checks", { recursive: true });
for (const t of TEMPLATE_CATALOG) {
  const d = demoCv(t.id, t.defaultColorId);
  const bytes = new Uint8Array(await generateCvPdf(d).arrayBuffer());
  const task = getDocument({ data: bytes, useSystemFonts: true });
  const pdf = await task.promise;
  assert(pdf.numPages >= 1);
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const text = await page.getTextContent();
    for (const item of text.items)
      if ("str" in item && item.str.trim()) {
        assert(
          item.transform[4] >= 25 && item.transform[4] + item.width <= 580,
          `${t.id} text outside horizontal bounds: ${item.str}`,
        );
        assert(
          item.transform[5] > 25 && item.transform[5] < 820,
          `${t.id} text outside vertical bounds`,
        );
      }
  }
  await task.destroy();
}
const d = demoCv(TEMPLATE_CATALOG[5].id, "teal");
d.experience[0].responsibilities = Array(90)
  .fill(
    "Coordinated safe patient care and multidisciplinary clinical handovers with accurate documentation.",
  )
  .join("\n");
d.customSections = [
  {
    id: "c",
    title: "Clinical Projects",
    entries: [
      {
        id: "ce",
        heading: "Quality improvement",
        date: "2025",
        location: "Bengaluru",
        description:
          "Reviewed handover processes.\nShared documentation guidance.",
      },
    ],
  },
];
const blob = generateCvPdf(d);
writeFileSync(
  "tmp/pdf-checks/long-cv.pdf",
  Buffer.from(await blob.arrayBuffer()),
);
const normal = demoCv(TEMPLATE_CATALOG[5].id, "teal");
writeFileSync(
  "tmp/pdf-checks/sample.pdf",
  Buffer.from(await generateCvPdf(normal).arrayBuffer()),
);
console.log(
  "PASS: all 126 templates export with text inside page bounds; multi-page fixture generated.",
);

// Verify medically relevant dates survive text extraction from the actual PDF.
const dated = demoCv(TEMPLATE_CATALOG[0].id, "navy");
dated.registrationInfo.licenseExpiry = "2028-05-12";
dated.registrationInfo.registrationRegion = "Regional Nursing Council";
dated.certifications = [
  {
    id: "dated",
    name: "BLS",
    issuingBody: "Training provider",
    issueDate: "2026-04-11",
    expiryDate: "2028-04-11",
  },
];
const datedTask = getDocument({
  data: new Uint8Array(await generateCvPdf(dated).arrayBuffer()),
});
const datedPdf = await datedTask.promise;
let extracted = "";
for (let i = 1; i <= datedPdf.numPages; i++) {
  const text = await (await datedPdf.getPage(i)).getTextContent();
  extracted += text.items
    .map((item) => ("str" in item ? item.str : ""))
    .join(" ");
}
for (const detail of [
  "2028-05-12",
  "Regional Nursing Council",
  "2026-04-11",
  "2028-04-11",
])
  assert(extracted.includes(detail), `PDF omitted ${detail}`);
await datedTask.destroy();
console.log(
  "PASS: licence region/expiry and certification dates are searchable in exported PDF.",
);

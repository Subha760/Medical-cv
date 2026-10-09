import assert from "node:assert/strict";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { Document, Packer, Paragraph } from "docx";
import mammoth from "mammoth";
import {
  editedPdf,
  validateDocx,
  sha256,
  toBase64,
  fromBase64,
} from "../src/imports/documents";
import { validCustom, resolveCvTemplate } from "../src/data/customTemplates";
import { TEMPLATE_CATALOG } from "../src/data/templateCatalog";
import { newCvDocument } from "../src/types/cv";
const p = await PDFDocument.create();
const f = await p.embedFont(StandardFonts.Helvetica);
p.addPage().drawText("Original reference", { x: 40, y: 790, font: f });
p.addPage();
const input = await p.save();
const replacement = {
  page: 1,
  x: 40,
  y: 40,
  width: 400,
  height: 50,
  fontSize: 12,
  text: "Updated professional name",
  cover: true,
  color: "#142b41",
};
assert.equal(
  (
    await PDFDocument.load(await editedPdf(input, [replacement]))
  ).getPageCount(),
  2,
);
await assert.rejects(
  editedPdf(input, [{ ...replacement, x: 9999 }]),
  /outside/,
);
await assert.rejects(
  editedPdf(input, [
    { ...replacement, height: 10, text: "Line one\nLine two" },
  ]),
  /height/,
);
await assert.rejects(
  editedPdf(input, [{ ...replacement, page: 3 }]),
  /Invalid page/,
);
const word = new Uint8Array(
  await Packer.toBuffer(
    new Document({
      sections: [
        { children: [new Paragraph("A real nursing reference document")] },
      ],
    }),
  ),
);
validateDocx(word);
assert(
  (await mammoth.extractRawText({ buffer: Buffer.from(word) })).value.includes(
    "nursing reference",
  ),
);
assert.throws(() => validateDocx(new Uint8Array(200)), /archive/);
const bomb = word.slice();
const view = new DataView(bomb.buffer);
for (let i = 0; i < bomb.length - 46; i++)
  if (view.getUint32(i, true) === 0x02014b50) {
    view.setUint32(i + 24, 100000000, true);
    break;
  }
assert.throws(() => validateDocx(bomb), /16 MB/);
assert.deepEqual(fromBase64(toBase64(word)), word);
assert.equal((await sha256(input)).length, 64);
const custom = {
  ...TEMPLATE_CATALOG[0],
  id: "custom_12345678",
  displayName: "My design",
};
assert(validCustom(custom));
assert(!validCustom({ ...custom, id: "premium_fake_1" }));
const d = newCvDocument("x");
d.templateId = custom.id;
d.customTemplate = custom;
assert.equal(resolveCvTemplate(d).id, custom.id);
console.log(
  "PASS: PDF page preservation, coordinate bounds, fit checks, DOCX text roundtrip, archive bomb rejection, base64/hash and custom-layout validation.",
);

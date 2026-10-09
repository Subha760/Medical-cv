import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
export type Replacement = {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  text: string;
  cover: boolean;
  color: string;
};
export const MAX_BYTES = 8 * 1024 * 1024;
export async function sha256(bytes: Uint8Array) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", bytes as unknown as BufferSource),
    ),
  )
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
export function toBase64(bytes: Uint8Array) {
  let text = "";
  for (let i = 0; i < bytes.length; i += 16384)
    text += String.fromCharCode(...bytes.subarray(i, i + 16384));
  return btoa(text);
}
export function fromBase64(text: string) {
  const s = atob(text);
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}
// Central-directory limits are checked before any DOCX decompression, including on the server.
export function validateDocx(bytes: Uint8Array) {
  if (bytes.length > MAX_BYTES || bytes.length < 22)
    throw new Error("Choose a DOCX file smaller than 8 MB.");
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--)
    if (v.getUint32(i, true) === 0x06054b50) {
      end = i;
      break;
    }
  if (end < 0 || v.getUint16(end + 4, true) || v.getUint16(end + 6, true))
    throw new Error("Unsupported Word archive.");
  const count = v.getUint16(end + 10, true);
  let pos = v.getUint32(end + 16, true),
    total = 0,
    hasDoc = false;
  if (count > 1000 || pos >= end)
    throw new Error("Word archive is too complex.");
  for (let i = 0; i < count; i++) {
    if (pos + 46 > end || v.getUint32(pos, true) !== 0x02014b50)
      throw new Error("Invalid Word archive.");
    if (v.getUint16(pos + 8, true) & 1)
      throw new Error("Encrypted Word files are not supported.");
    total += v.getUint32(pos + 24, true);
    if (total > 16 * 1024 * 1024)
      throw new Error("Expanded Word file exceeds 16 MB.");
    const len = v.getUint16(pos + 28, true);
    const name = new TextDecoder().decode(
      bytes.subarray(pos + 46, pos + 46 + len),
    );
    if (name === "word/document.xml") hasDoc = true;
    pos += 46 + len + v.getUint16(pos + 30, true) + v.getUint16(pos + 32, true);
  }
  if (!hasDoc) throw new Error("This file is not a Word DOCX document.");
}
export async function editedPdf(
  bytes: Uint8Array,
  replacements: Replacement[],
) {
  const pdf = await PDFDocument.load(bytes);
  if (pdf.getPageCount() > 20)
    throw new Error("PDFs can contain at most 20 pages.");
  if (replacements.length > 80) throw new Error("Use at most 80 replacements.");
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (const r of replacements) {
    if (!Number.isInteger(r.page) || r.page < 1 || r.page > pdf.getPageCount())
      throw new Error("Invalid page.");
    const page = pdf.getPage(r.page - 1);
    if (!page) throw new Error("Invalid page.");
    const { width, height } = page.getSize();
    if (
      ![r.x, r.y, r.width, r.height, r.fontSize].every(Number.isFinite) ||
      r.x < 0 ||
      r.y < 0 ||
      r.width < 10 ||
      r.height < 10 ||
      r.x + r.width > width ||
      r.y + r.height > height ||
      r.fontSize < 8 ||
      r.fontSize > 36 ||
      r.text.length > 1500 ||
      !/^#[0-9a-f]{6}$/i.test(r.color)
    )
      throw new Error("Replacement is outside the page or too large.");
    const color = rgb(
      parseInt(r.color.slice(1, 3), 16) / 255,
      parseInt(r.color.slice(3, 5), 16) / 255,
      parseInt(r.color.slice(5, 7), 16) / 255,
    );
    if (r.cover)
      page.drawRectangle({
        x: r.x,
        y: height - r.y - r.height,
        width: r.width,
        height: r.height,
        color: rgb(1, 1, 1),
      });
    // Validate exact fit; silently clipping a name or credential is unsafe.
    const lines: string[] = [];
    for (const paragraph of r.text.split("\n")) {
      let line = "";
      for (const word of paragraph.split(/\s+/)) {
        if (font.widthOfTextAtSize(word, r.fontSize) > r.width)
          throw new Error("A word is wider than the replacement box.");
        if (
          line &&
          font.widthOfTextAtSize(line + " " + word, r.fontSize) > r.width
        ) {
          lines.push(line);
          line = word;
        } else line = line ? line + " " + word : word;
      }
      lines.push(line);
    }
    if (lines.length * r.fontSize * 1.25 > r.height)
      throw new Error("Text exceeds the replacement height. Enlarge its box.");
    lines.forEach((line, i) =>
      page.drawText(line, {
        x: r.x,
        y: height - r.y - r.fontSize - i * r.fontSize * 1.25,
        size: r.fontSize,
        font,
        color,
      }),
    );
  }
  return pdf.save();
}

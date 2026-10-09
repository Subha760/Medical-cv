import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { demoCv } from "../src/data/demoCv";
import { generateCvPdf } from "../src/pdf/pdfGenerator";
import { registerPremiumTemplate } from "../src/data/templateRegistry";
import type { CvTemplate } from "../src/data/templateCatalog";
mkdirSync("public/premium", { recursive: true });
mkdirSync("tmp/premium-pdfs", { recursive: true });
for (const t of JSON.parse(
  readFileSync("release/premium-configs.json", "utf8"),
) as CvTemplate[]) {
  registerPremiumTemplate(t);
  const file = "tmp/premium-pdfs/" + t.id + ".pdf";
  writeFileSync(
    file,
    Buffer.from(
      await generateCvPdf(demoCv(t.id, t.defaultColorId)).arrayBuffer(),
    ),
  );
  execFileSync("pdftoppm", [
    "-f",
    "1",
    "-singlefile",
    "-scale-to",
    "500",
    "-png",
    file,
    "public/premium/" + t.id.replace(/^premium_/, ""),
  ]);
}
console.log("Rendered 32 original premium preview images.");

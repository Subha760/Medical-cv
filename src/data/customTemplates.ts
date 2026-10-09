import type { CvDocument } from "../types/cv";
import { templateById, CvTemplate, TEMPLATE_CATALOG } from "./templateCatalog";
export function validCustom(t: unknown): t is CvTemplate {
  if (!t || typeof t !== "object") return false;
  const v = t as CvTemplate;
  return (
    /^custom_[a-zA-Z0-9_-]{8,70}$/.test(v.id) &&
    typeof v.displayName === "string" &&
    v.displayName.length <= 80 &&
    typeof v.description === "string" &&
    v.description.length <= 300 &&
    TEMPLATE_CATALOG.some((t) => t.category === v.category) &&
    [
      "classic",
      "compact",
      "sidebar",
      "timeline",
      "banded",
      "editorial",
      "right-sidebar",
      "ledger",
      "cards",
      "split",
    ].includes(v.layout) &&
    [
      "left",
      "center",
      "split",
      "banner",
      "monogram",
      "masthead",
      "boxed",
    ].includes(v.header) &&
    [
      "rule",
      "bar",
      "plain",
      "numbered",
      "outline",
      "caps",
      "tab",
      "double",
    ].includes(v.headingStyle) &&
    ["sans", "serif", "condensed", "mono"].includes(v.fontStyle) &&
    ["airy", "balanced", "dense"].includes(v.density) &&
    typeof v.supportsPhoto === "boolean" &&
    typeof v.isAtsFriendly === "boolean" &&
    typeof v.defaultColorId === "string" &&
    Array.isArray(v.recommendedOrder) &&
    v.recommendedOrder.every((x) => typeof x === "string") &&
    Array.isArray(v.sideSections) &&
    v.sideSections.every((x) => typeof x === "string")
  );
}
export function resolveCvTemplate(doc: CvDocument) {
  if (
    doc.customTemplate?.id === doc.templateId &&
    validCustom(doc.customTemplate)
  )
    return doc.customTemplate;
  return templateById(doc.templateId);
}

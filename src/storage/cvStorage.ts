import { readCollection, writeCollection, isRecord } from "./safeStorage";
import { newCvDocument, CvDocument } from "../types/cv";
import { createId } from "../utils/id";

/**
 * Everything here reads/writes ONLY window.localStorage. There is no fetch(),
 * no XMLHttpRequest, nothing that leaves the browser — this file is the web
 * equivalent of the Android app's CvRepositoryImpl (Room-backed), and carries
 * the exact same guarantee: CV content never reaches a server. See the
 * Android project's spec section 3/20/65 for the source of that requirement.
 */

const STORAGE_KEY = "medcv:documents";

export function isCv(v: unknown): v is CvDocument {
  if (!isRecord(v) || typeof v.id !== "string" || !isRecord(v.personalInfo) || !isRecord(v.registrationInfo)) return false;
  const base = newCvDocument(v.id);
  return Object.entries(base.personalInfo).every(([key, value]) => value === null ? v.personalInfo[key] == null || typeof v.personalInfo[key] === "string" : typeof v.personalInfo[key] === "string") &&
    Object.keys(base.registrationInfo).every(key => typeof v.registrationInfo[key] === "string") &&
    ["education", "experience", "certifications", "languages", "customSections", "sectionOrder"].every(key => Array.isArray(v[key])) &&
    v.education.every((e: any) => isRecord(e) && ["id","degree","institution","location","startYear","graduationYear","grade"].every(k => typeof e[k] === "string")) &&
    v.experience.every((e: any) => isRecord(e) && ["id","hospital","department","position","specialty","startDate","endDate","responsibilities","achievements"].every(k => typeof e[k] === "string") && Array.isArray(e.clinicalSkills) && e.clinicalSkills.every((s: any) => typeof s === "string")) &&
    v.certifications.every((e: any) => isRecord(e) && ["id","name","issuingBody","issueDate","expiryDate"].every(k => typeof e[k] === "string")) &&
    v.languages.every((e: any) => isRecord(e) && typeof e.language === "string" && typeof e.proficiency === "string") &&
    v.customSections.every((e: any) => isRecord(e) && typeof e.title === "string" && Array.isArray(e.entries) && e.entries.every((x: any) => isRecord(x) && ["id","heading","description","date","location"].every(k => typeof x[k] === "string"))) &&
    ["label", "profession", "templateId", "colorId", "skills", "internship", "achievements", "publications", "conferences", "memberships", "references", "hobbies", "declaration", "declarationDate", "declarationPlace", "signatureName"].every(k => typeof v[k] === "string") &&
    v.sectionOrder.every((x: any) => typeof x === "string") && typeof v.isDraft === "boolean" && typeof v.updatedAt === "number";
}
function readAll(): CvDocument[] { return readCollection(STORAGE_KEY, isCv); }
function writeAll(docs: CvDocument[]): void { writeCollection(STORAGE_KEY, docs); }

export const cvStorage = {
  listSaved(): CvDocument[] {
    return readAll()
      .filter((d) => !d.isDraft)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },

  getLatestDraft(): CvDocument | null {
    const drafts = readAll()
      .filter((d) => d.isDraft)
      .sort((a, b) => b.updatedAt - a.updatedAt);
    return drafts[0] ?? null;
  },

  getById(id: string): CvDocument | null {
    return readAll().find((d) => d.id === id) ?? null;
  },

  save(doc: CvDocument, asDraft: boolean): CvDocument {
    const updated: CvDocument = { ...doc, isDraft: asDraft, updatedAt: Date.now() };
    const all = readAll();
    const idx = all.findIndex((d) => d.id === updated.id);
    if (idx >= 0) {
      all[idx] = updated;
    } else {
      all.push(updated);
    }
    writeAll(all);
    return updated;
  },

  remove(id: string): void {
    writeAll(readAll().filter((d) => d.id !== id));
  },

  removeAll(): void {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(`${STORAGE_KEY}:previous`);
  },

  duplicate(id: string, newLabel: string): CvDocument | null {
    const original = this.getById(id);
    if (!original) return null;
    const copy: CvDocument = {
      ...original,
      id: createId(),
      label: newLabel,
      isDraft: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    return this.save(copy, false);
  },
};

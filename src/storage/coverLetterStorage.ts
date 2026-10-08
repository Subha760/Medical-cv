import { readCollection, writeCollection, isRecord } from "./safeStorage";
import { CoverLetter } from "../types/coverLetter";

const STORAGE_KEY = "medcv:coverLetters";

export function isLetter(v: unknown): v is CoverLetter {
  return (
    isRecord(v) &&
    [
      "id",
      "label",
      "templateId",
      "applicantName",
      "position",
      "hospitalOrCompany",
      "hiringManager",
      "opening",
      "experienceHighlights",
      "skillsHighlights",
      "closing",
    ].every((k) => typeof v[k] === "string") &&
    typeof v.updatedAt === "number" &&
    typeof v.isDraft === "boolean"
  );
}
function readAll(): CoverLetter[] {
  return readCollection(STORAGE_KEY, isLetter);
}
function writeAll(letters: CoverLetter[]): void {
  writeCollection(STORAGE_KEY, letters);
}

export const coverLetterStorage = {
  latestDraft(): CoverLetter | null {
    return (
      readAll()
        .filter((l) => l.isDraft)
        .sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null
    );
  },
  listSaved(): CoverLetter[] {
    return readAll()
      .filter((l) => !l.isDraft)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },

  getById(id: string): CoverLetter | null {
    return readAll().find((l) => l.id === id) ?? null;
  },

  save(letter: CoverLetter, asDraft: boolean): CoverLetter {
    const updated: CoverLetter = {
      ...letter,
      isDraft: asDraft,
      updatedAt: Date.now(),
    };
    const all = readAll();
    const idx = all.findIndex((l) => l.id === updated.id);
    if (idx >= 0) all[idx] = updated;
    else all.push(updated);
    writeAll(all);
    return updated;
  },

  remove(id: string): void {
    writeAll(readAll().filter((l) => l.id !== id));
  },

  removeAll(): void {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(`${STORAGE_KEY}:previous`);
  },
};

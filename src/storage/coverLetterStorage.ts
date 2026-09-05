import { CoverLetter } from "../types/coverLetter";

const STORAGE_KEY = "medcv:coverLetters";

function readAll(): CoverLetter[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CoverLetter[];
  } catch {
    return [];
  }
}

function writeAll(letters: CoverLetter[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(letters));
}

export const coverLetterStorage = {
  listSaved(): CoverLetter[] {
    return readAll()
      .filter((l) => !l.isDraft)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },

  getById(id: string): CoverLetter | null {
    return readAll().find((l) => l.id === id) ?? null;
  },

  save(letter: CoverLetter, asDraft: boolean): CoverLetter {
    const updated: CoverLetter = { ...letter, isDraft: asDraft, updatedAt: Date.now() };
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
  },
};

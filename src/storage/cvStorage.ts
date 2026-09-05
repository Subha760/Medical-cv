import { CvDocument } from "../types/cv";

/**
 * Everything here reads/writes ONLY window.localStorage. There is no fetch(),
 * no XMLHttpRequest, nothing that leaves the browser — this file is the web
 * equivalent of the Android app's CvRepositoryImpl (Room-backed), and carries
 * the exact same guarantee: CV content never reaches a server. See the
 * Android project's spec section 3/20/65 for the source of that requirement.
 */

const STORAGE_KEY = "medcv:documents";

function readAll(): CvDocument[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CvDocument[];
  } catch {
    // Corrupted local storage shouldn't crash the app — treat as empty,
    // matching the Android app's "Corrupted saved CV" error-handling case.
    return [];
  }
}

function writeAll(docs: CvDocument[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
}

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
  },

  duplicate(id: string, newLabel: string): CvDocument | null {
    const original = this.getById(id);
    if (!original) return null;
    const copy: CvDocument = {
      ...original,
      id: crypto.randomUUID(),
      label: newLabel,
      isDraft: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    return this.save(copy, false);
  },
};

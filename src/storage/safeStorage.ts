export function readCollection<T>(key: string, validate: (value: unknown) => value is T): T[] {
  const raw = localStorage.getItem(key);
  if (!raw) return [];
  let data: unknown;
  try { data = JSON.parse(raw); } catch { throw new Error(`Saved data could not be read. Export a backup in Settings before restoring data. (${key})`); }
  if (!Array.isArray(data) || !data.every(validate)) throw new Error('Saved data has an unsupported format. Export a backup before restoring.');
  return data;
}
export function writeCollection(key: string, data: unknown): void {
  const value = JSON.stringify(data);
  const old = localStorage.getItem(key);
  // Preserve one previous revision; fail visibly rather than discarding corrupt records.
  if (old) localStorage.setItem(`${key}:previous`, old);
  localStorage.setItem(key, value);
}
export const isRecord = (v: unknown): v is Record<string, any> => Boolean(v && typeof v === 'object' && !Array.isArray(v));

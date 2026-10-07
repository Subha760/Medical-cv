import { isCv } from './cvStorage';
import { isLetter } from './coverLetterStorage';
import { isWorkspace } from '../workspace/model';
import { isRecord } from './safeStorage';
export const DATA_KEYS = ['medcv:documents','medcv:coverLetters','medcv:workspace'] as const;
export function exportBackup(): string {
  const data: Record<string,string|null> = {};
  for (const key of DATA_KEYS) { data[key]=localStorage.getItem(key);data[`${key}:previous`]=localStorage.getItem(`${key}:previous`); }
  return JSON.stringify({version:1,createdAt:new Date().toISOString(),data},null,2);
}
export function validData(key:string,raw:string): boolean {
  const v:unknown=JSON.parse(raw);
  if(key==='medcv:workspace')return isWorkspace(v);
  return Array.isArray(v) && v.every(key==='medcv:documents'?isCv:isLetter);
}
export function restoreBackup(raw: string): void {
  const backup:unknown=JSON.parse(raw);
  if(!isRecord(backup)||backup.version!==1||!isRecord(backup.data))throw new Error('Unsupported backup format.');
  const incoming=backup.data;const old:Record<string,string|null>={};
  for(const key of DATA_KEYS) {
    if(!(key in incoming)||incoming[key]!==null && (typeof incoming[key]!=='string'||!validData(key,incoming[key])))throw new Error('Backup contains invalid records. Current data was preserved.');
    old[key]=localStorage.getItem(key);
  }
  try {
    for(const key of DATA_KEYS) {if(incoming[key]===null)localStorage.removeItem(key);else localStorage.setItem(key,incoming[key]);}
  } catch {
    for(const key of DATA_KEYS) {if(old[key]===null)localStorage.removeItem(key);else localStorage.setItem(key,old[key]!);}
    throw new Error('Restore failed. Free storage and try again. Original records were restored.');
  }
}
export function recoverPrevious(key: string): void {
  if(!DATA_KEYS.some(k=>k===key))throw new Error('Unsupported data key.');
  const raw=localStorage.getItem(`${key}:previous`);
  if(!raw||!validData(key,raw))throw new Error('No valid previous revision is available. Restore a downloaded backup.');
  localStorage.setItem(key,raw);
}

import { isRecord } from '../storage/safeStorage';
export interface Shift { id: string; date: string; start: string; end: string; label: string; }
export interface Task { id: string; title: string; due: string; priority: 'Normal' | 'High'; done: boolean; }
export interface Credential { id: string; name: string; expiry: string; }
export interface Learning { id: string; date: string; topic: string; hours: number; reflection: string; }
export interface StudyCard { id: string; question: string; answer: string; due: string; }
export interface Application { id: string; role: string; employer: string; status: string; next: string; }
export interface Workspace { version: 1; shifts: Shift[]; tasks: Task[]; credentials: Credential[]; learning: Learning[]; cards: StudyCard[]; applications: Application[]; }
export const WORKSPACE_KEY = 'medcv:workspace';
export const emptyWorkspace = (): Workspace => ({version:1,shifts:[],tasks:[],credentials:[],learning:[],cards:[],applications:[]});
export const today = () => localDate(new Date());
export function localDate(d: Date): string { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
export function daysUntil(date: string): number { return Math.round((Date.parse(date+'T00:00:00Z')-Date.parse(today()+'T00:00:00Z'))/86400000); }
export function shiftHours(shift: Shift): number { const [a,b] = shift.start.split(':').map(Number); const [c,d] = shift.end.split(':').map(Number); return ((c*60+d-a*60-b+1440)%1440)/60; }
function validDate(v:string): boolean { return /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v+'T00:00:00Z')) && new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v; }
function validTime(v:string): boolean { return /^([01]\d|2[0-3]):[0-5]\d$/.test(v); }
export function isWorkspace(v: unknown): v is Workspace {
  if (!isRecord(v) || v.version !== 1) return false;
  const shape: Record<string,string[]> = { shifts:['id','date','start','end','label'], tasks:['id','title','due','priority'], credentials:['id','name','expiry'], learning:['id','date','topic','reflection'], cards:['id','question','answer','due'], applications:['id','role','employer','status','next'] };
  return Object.entries(shape).every(([key,fields]) => Array.isArray(v[key]) && v[key].every((e:unknown) => isRecord(e) && fields.every(f=>typeof e[f]==='string') && (key!=='learning' || (typeof e.hours==='number' && Number.isFinite(e.hours) && e.hours>=0)) && (key!=='tasks' || typeof e.done==='boolean' && ['Normal','High'].includes(e.priority)) && (key!=='shifts'||validDate(e.date)&&validTime(e.start)&&validTime(e.end)&&e.start!==e.end) && (key!=='credentials'||validDate(e.expiry)) && (key!=='learning'||validDate(e.date)) && (key!=='cards'||validDate(e.due)) && (key!=='tasks'||!e.due||validDate(e.due)) && (key!=='applications'||!e.next||validDate(e.next))));
}
export function readWorkspace(): Workspace {
  const raw = localStorage.getItem(WORKSPACE_KEY); if (!raw) return emptyWorkspace();
  const v: unknown = JSON.parse(raw); if (!isWorkspace(v)) throw new Error('Workspace data could not be read. Export a backup in Settings.'); return v;
}
export function calendarFor(shifts: Shift[]): string {
  const escape = (v:string) => v.replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
  const events = shifts.map(s => {
    const end = new Date(`${s.date}T${s.end}:00`); if (s.end <= s.start) end.setDate(end.getDate()+1);
    const stamp = (d:string,t:string) => d.replace(/-/g,'')+'T'+t.replace(':','')+'00';
    return ['BEGIN:VEVENT',`UID:${s.id}@medcv.local`,`DTSTAMP:${new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'')}`,`DTSTART:${stamp(s.date,s.start)}`,`DTEND:${stamp(localDate(end),s.end)}`,`SUMMARY:${escape(s.label)}`,'END:VEVENT'].join('\r\n');
  });
  return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//MedCV//Nursing Workspace//EN','CALSCALE:GREGORIAN',...events,'END:VCALENDAR'].join('\r\n');
}

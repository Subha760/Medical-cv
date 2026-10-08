import { Shift, localDate, shiftHours } from "./model";
import { createId } from "../utils/id";
export const ROTA_CODES: Record<
  string,
  { label: string; segments: [string, string][]; kind?: "off" | "leave" }
> = {
  M: { label: "Morning", segments: [["07:00", "15:00"]] },
  E: { label: "Evening", segments: [["13:00", "21:00"]] },
  N: { label: "Night", segments: [["20:30", "08:00"]] },
  D: { label: "Day", segments: [["08:30", "17:00"]] },
  L: { label: "Long day", segments: [["07:30", "20:30"]] },
  SPL: {
    label: "Split shift",
    segments: [
      ["08:00", "12:00"],
      ["16:00", "20:00"],
    ],
  },
  OC: { label: "On call", segments: [["08:00", "20:00"]] },
  "M+E": {
    label: "Morning + evening",
    segments: [
      ["07:00", "15:00"],
      ["15:00", "21:00"],
    ],
  },
  "E+N": {
    label: "Evening + night",
    segments: [
      ["13:00", "21:00"],
      ["21:00", "08:00"],
    ],
  },
  "M+N": {
    label: "Morning + night",
    segments: [
      ["07:00", "15:00"],
      ["20:30", "08:00"],
    ],
  },
  OFF: { label: "Day off", segments: [], kind: "off" },
  CL: { label: "Casual leave", segments: [], kind: "leave" },
  SL: { label: "Sick leave", segments: [], kind: "leave" },
  EL: { label: "Earned leave", segments: [], kind: "leave" },
  GH: { label: "Holiday", segments: [], kind: "leave" },
  "C/O": { label: "Compensatory off", segments: [], kind: "off" },
  MAT: { label: "Maternity leave", segments: [], kind: "leave" },
  PAT: { label: "Paternity leave", segments: [], kind: "leave" },
  OD: { label: "Official duty", segments: [["08:30", "17:00"]] },
};
export function shiftsForCode(date: string, code: string): Shift[] {
  const preset = ROTA_CODES[code];
  if (!preset) throw new Error("Unknown shift code: " + code);
  if (preset.kind)
    return [
      {
        id: createId(),
        date,
        start: "00:00",
        end: "00:00",
        label: code + " · " + preset.label,
        kind: preset.kind,
      },
    ];
  return preset.segments.map(([start, end], i) => ({
    id: createId(),
    date,
    start,
    end,
    label:
      code +
      " · " +
      preset.label +
      (preset.segments.length > 1
        ? ` (${i + 1}/${preset.segments.length})`
        : ""),
  }));
}
export function parseRota(
  text: string,
  month: string,
): { shifts: Shift[]; errors: string[] } {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))
    return { shifts: [], errors: ["Choose a valid month."] };
  const limit = new Date(
    Number(month.slice(0, 4)),
    Number(month.slice(5)),
    0,
  ).getDate();
  const tokens = text
    .toUpperCase()
    .trim()
    .split(/[\s,;]+/)
    .filter(Boolean);
  const errors: string[] = [];
  const shifts: Shift[] = [];
  const seen = new Set<number>();
  let sequential = 1;
  for (let i = 0; i < tokens.length; i++) {
    let day = sequential;
    let code = tokens[i];
    if (/^\d{1,2}$/.test(code)) {
      day = Number(code);
      code = tokens[++i] || "";
    } else if (/^\d{1,2}[:=-]/.test(code)) {
      const match = code.match(/^(\d{1,2})[:=-](.*)$/)!;
      day = Number(match[1]);
      code = match[2];
    }
    sequential = day + 1;
    if (day < 1 || day > limit) {
      errors.push(`Day ${day} is outside this month.`);
      continue;
    }
    if (seen.has(day)) {
      errors.push(`Day ${day} appears more than once.`);
      continue;
    }
    seen.add(day);
    if (!ROTA_CODES[code]) {
      errors.push(`Day ${day}: unknown code “${code}”.`);
      continue;
    }
    shifts.push(
      ...shiftsForCode(`${month}-${String(day).padStart(2, "0")}`, code),
    );
  }
  if (!tokens.length) errors.push("Paste at least one shift code.");
  return { shifts, errors };
}
export function rotaWarnings(shifts: Shift[]): string[] {
  const work = shifts
    .filter((s) => !s.kind)
    .map((s) => {
      const start = Date.parse(s.date + "T" + s.start);
      return { s, start, end: start + shiftHours(s) * 3600000 };
    })
    .sort((a, b) => a.start - b.start);
  const warnings: string[] = [];
  for (let i = 1; i < work.length; i++) {
    const gap = (work[i].start - work[i - 1].end) / 3600000;
    if (gap < 0) warnings.push(`${work[i].s.date}: overlapping shifts.`);
    else if (gap > 0 && gap < 11)
      warnings.push(
        `${work[i].s.date}: only ${gap.toFixed(1)} hours between shifts. Review your rest plan.`,
      );
  }
  return [...new Set(warnings)];
}

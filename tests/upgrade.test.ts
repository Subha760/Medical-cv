import assert from "node:assert/strict";
import {
  TEMPLATE_CATALOG,
  CATEGORY_INFO,
  templateById,
} from "../src/data/templateCatalog";
import {
  OFFLINE_ASSISTANTS,
  runOfflineAssistant,
} from "../src/ai/offlineAssistants";
import { parseRota, shiftsForCode, rotaWarnings } from "../src/workspace/rota";
import {
  shiftHours,
  calendarFor,
  isWorkspace,
  emptyWorkspace,
} from "../src/workspace/model";
assert.equal(TEMPLATE_CATALOG.length, 64);
for (const category of Object.keys(CATEGORY_INFO)) {
  const designs = TEMPLATE_CATALOG.filter((t) => t.category === category);
  assert.equal(designs.length, 8);
  assert.equal(
    new Set(
      designs.map((t) =>
        [t.layout, t.header, t.headingStyle, t.fontStyle].join(":"),
      ),
    ).size,
    8,
  );
}
assert.equal(templateById("clinical_old_01").category, "CLINICAL");
for (const [code, hours] of [
  ["M+E", 14],
  ["E+N", 19],
  ["M+N", 19.5],
  ["SPL", 8],
  ["OFF", 0],
  ["CL", 0],
] as const)
  assert.equal(
    shiftsForCode("2026-10-01", code).reduce((n, s) => n + shiftHours(s), 0),
    hours,
  );
const parsed = parseRota("1 M, 2 E+N, 3 OFF, 4 CL", "2026-10");
assert.deepEqual(parsed.errors, []);
assert.equal(parsed.shifts.length, 5);
assert(isWorkspace({ ...emptyWorkspace(), shifts: parsed.shifts }));
assert(parseRota("1 M 1 N", "2026-10").errors.length);
assert(parseRota("32 M", "2026-10").errors.length);
assert(parseRota("M BAD", "2026-10").errors.length);
const cal = calendarFor(parsed.shifts);
assert(cal.includes("DTEND:20261003T080000"));
assert(cal.includes("DTSTART;VALUE=DATE:20261004"));
assert(!cal.includes("SUMMARY:OFF"));
assert(
  rotaWarnings([
    ...shiftsForCode("2026-10-01", "N"),
    ...shiftsForCode("2026-10-02", "M"),
  ]).some((w) => w.includes("overlapping")),
);
assert.equal(OFFLINE_ASSISTANTS.length, 15);
for (const a of OFFLINE_ASSISTANTS) {
  assert(
    runOfflineAssistant(
      a.id,
      "Communication: explain the plan\nToday: revise notes",
    ).length > 20,
  );
  assert.equal(runOfflineAssistant(a.id, ""), "Add your own notes first.");
}
assert(
  !runOfflineAssistant("rewrite", "helped with paperwork").includes(
    "medication",
  ),
);
console.log(
  "PASS: 64 structurally distinct presets, roster validation/calendar math and 15 offline assistants.",
);

const { csv, dailyAccounts } = await import("../src/pulse/report");
const { completionPayload, qualifyingCv } =
  await import("../src/account/referrals");
const { demoCv } = await import("../src/data/demoCv");
const cv = demoCv("clinical_01", "teal");
cv.personalInfo.profilePhotoDataUrl = "PRIVATE_PHOTO";
cv.personalInfo.fullAddress = "PRIVATE_ADDRESS";
cv.signatureDataUrl = "PRIVATE_SIGNATURE";
assert(qualifyingCv(cv));
const payload = JSON.stringify(completionPayload(cv));
assert(!payload.includes("PRIVATE_"));
assert(!payload.includes("professionalSummary"));
assert(!payload.includes("registrationInfo"));
assert(!qualifyingCv({ ...cv, education: [], experience: [] }));
assert(csv([[" =SUM(1,2)", 'a"b', "normal"]]).includes('"\' =SUM(1,2)"'));
assert(csv([['a"b']]).includes('"a""b"'));
const dates = dailyAccounts(
  [
    {
      user_id: "a",
      code: "a",
      credits: 0,
      frozen: false,
      created_at: "2026-10-10T12:00:00",
    },
    {
      user_id: "b",
      code: "b",
      credits: 0,
      frozen: false,
      created_at: "2026-09-01T12:00:00",
    },
  ],
  new Date("2026-10-10T13:00:00"),
);
assert.equal(dates.length, 7);
assert.equal(
  dates.reduce((sum, day) => sum + day.count, 0),
  1,
);
console.log(
  "PASS: private referral payload, CV qualification, spreadsheet-safe CSV and dated account activity.",
);

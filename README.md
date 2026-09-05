# MedCV Maker — Web

The browser-based sibling of the [MedCV Maker Android app](../medcv-maker):
same product, same privacy model, built with React + TypeScript + Vite
instead of Kotlin + Compose. Nothing you type is ever sent to a server —
everything lives in this browser's `localStorage`, and PDFs are generated
entirely client-side with [jsPDF](https://github.com/parallax/jsPDF).

## Design

The visual identity is a "clinical chart" concept, not a generic template:
cool paper background (not the common warm-cream default), the same brand
teal as the Android app for real continuity across platforms, and an ochre
accent standing in for a manila-folder tab color. Fraunces (display) + IBM
Plex Sans (body) + IBM Plex Mono (chart-like data — reg numbers, dates,
metadata) carry the type system. See `src/styles/tokens.css` for the full
token set and the reasoning behind each choice.

## Architecture

```
src/
  types/        CvDocument and friends — mirrors the Android app's Kotlin models
  data/         Template catalog (mirrors TemplateCatalog.kt)
  storage/      localStorage-backed repository — the web equivalent of Room
  pdf/          Client-side PDF generation (jsPDF) — no server round trip
  pages/        One file per route (Home, ProfessionSelect, TemplateSelect,
                Editor, Preview, SavedCvs, Settings)
  components/   Shared UI (NavBar)
  styles/       Design tokens + global base styles
```

## Privacy model

Every read/write in `src/storage/cvStorage.ts` touches only
`window.localStorage`. There is no `fetch()`, no `XMLHttpRequest`, nothing
that leaves the browser anywhere in the CV data path. PDF generation
(`src/pdf/pdfGenerator.ts`) runs entirely client-side via jsPDF and returns a
Blob — the file never touches a server either.

## Running it

```
npm install
npm run dev
```

**Note:** `npm install` needs network access, which this scaffolding
environment doesn't have — dependencies in `package.json` are declared but
never actually installed/verified here. Run `npm install` on your own
machine to pull them down and confirm everything resolves.

## What's implemented vs. stubbed

**Implemented:** full routing (Home → Profession → Template → Editor →
Preview → Saved CVs → Cover Letter → Settings), localStorage persistence
with autosave, client-side PDF generation and download, a designed Home page
(not a generic template — see "Design" above), all 8 CV editor wizard steps
plus a Reorder Sections step (Personal Details, Professional
Summary+Registration, Education, Experience, Certifications with quick-add
chips, Achievements, Languages, Additional Sections covering
Publications/Conferences/Memberships/References plus fully custom
user-defined sections, and Reorder Sections with up/down controls), template
accent-color picker on the Template Select screen, a full cover letter
builder (6 templates, its own PDF generator, own localStorage-backed
repository), profile photo upload (client-side downscale via `<canvas>`
before storing, since localStorage has a small per-origin quota — never
uploaded, and the CV export embeds it for photo-supporting templates only),
an ATS/completeness checker (`src/validation/cvChecks.ts`) surfaced on the
Preview page, a Settings page with a privacy dashboard and a delete-all that
covers both CVs and cover letters, and a PDF generator that honors the
chosen accent color, the user's chosen section order, and renders every
field collected.

**Stubbed / not yet built:** true per-template *layout* differentiation
(distinct multi-column/type treatments per template category — what exists
now is color + section-order differentiation, not yet structurally
different layouts); drag-and-drop for section reordering (shipped as
up/down buttons instead, which needed no extra library and is arguably more
accessible — genuine drag-and-drop would need a dependency this sandbox
can't verify installs cleanly). Both are reasonable stopping points rather
than gaps.

**Where the web app is ahead of the Android app:** profile photo embedding
in the PDF, and section-order-aware rendering — `PdfGenerator.kt` doesn't do
either yet.

**A note on verification:** `npm install` can't run here (no network — see
above), but the source was still type-checked against hand-written stand-in
type declarations for React/React Router/jsPDF (not the real packages) using
the `tsc` binary available in this sandbox. That caught zero real bugs
across every pass, including this one — one flagged line (`navigate(-1)`)
was a false positive from an oversimplified stub, not an actual issue. It's
not a substitute for a real `npm install && npm run build` on your machine,
but it's more than an unverified guess.

## Relationship to the Android app

This is a separate, independent client — not a shared codebase. Both read
the same conceptual data model and both promise the same thing (nothing
uploaded, ever), but a CV created in one won't currently transfer to the
other (no export/import format between them yet).

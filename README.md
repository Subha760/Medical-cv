# MedCV Nursing Workspace 2.0

A private CV builder and daily companion for nurses and nursing students. React + TypeScript + Vite power the website and an offline Android WebView app.

## Features

- Guided healthcare CVs, 48 original designs in eight categories, photos, section ordering, PDF preview/download, saved CVs, and cover letters.
- Shift planning with overnight durations and local-calendar ICS export.
- Professional tasks with priorities, due dates, completion, and overdue indicators.
- Registration/certification expiry tracker and import from saved CVs.
- CPD/placement learning log, reflections, learning-hour totals, and CSV export.
- Local notes-to-study-cards assistant with scheduled review.
- Nursing job keyword matching, STAR interview practice feedback, and application status tracker.
- Personal shift checklist and reflection prompts.
- Full editable JSON backup/restore, previous-revision recovery, and visible storage failures.
- Installable web app with offline caching after its first successful online load. Android bundles the same tools offline.

## Local assistants and privacy

Assistants use deterministic local rules, not a remote generative model. They organise supplied notes and CV facts without sending them to an AI provider. CV Autopilot requires confirmation and no longer inserts unverified duties or skills. Suggested skills must still be reviewed by the user.

Daily tools are for personal professional planning and education; they do not diagnose, recommend treatment, or store patient records. In-app renewal/review reminders are visible when opening the app; no background push notifications are promised. Learning hours are personal records, not accredited credits. Job matching and the CV completeness estimate do not reproduce an employer's ATS scoring.

Data stays in localStorage. Export backups regularly, especially before clearing browser data or uninstalling the Android app. Backups include personal data and should be stored securely. Corrupted collections are preserved and saving is blocked until recovery; Settings can download raw backup data and restore the previous valid local revision.

## Run and verify

```sh
npm ci
npm run dev
npm test
npm run build
npm run test:pdf
npx playwright install --with-deps chromium
npm run test:e2e
```

`npm run build` creates `dist/` and a versioned offline service worker. Serve the output over HTTPS (localhost also works). The worker precaches only app resources, never advertisements. Updated versions prompt the user to finish editing before activating. Google fonts were removed so font delivery no longer requires third-party access.

Playwright covers desktop and 390px phone layouts, daily tools, persistence, calendar/PDF downloads, backup recovery and offline reopening. `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` can select a system Chromium. PDF checks exercise all 48 designs and a long multipage fixture.

## Google AdSense

Monetag integration has been removed. Copy `.env.example` to `.env` and set your real `VITE_ADSENSE_CLIENT_ID` and `VITE_ADSENSE_SLOT_ID` when ready. Both are intentionally empty by default. Without valid values, no ad script, placeholder, or ad network request is made.

AdSense is web-only on the home screen after opting in; it is excluded from editors, previews and the offline Android app. Settings can reset advertising consent. Production advertising also requires your approved AdSense site, applicable regional consent configuration (including a Google-certified CMP where required), and the ads.txt entry supplied by your account. These account-specific steps cannot be completed with empty IDs.

## Android

The app uses WebViewAssetLoader and blocks remote asset requests. PDFs, JSON backups, calendars and CSV exports use the Android system file picker. The web build is copied into the APK by `.github/workflows/build-apk.yml`. The workflow builds a debug APK and runs Android 10 emulator smoke tests, including the nursing workspace. A production Play Store release requires your signing configuration; signing credentials are not included.

Web CI runs logic checks, real production builds, PDF checks and desktop/phone browser tests. See `.github/workflows/verify.yml`.

## Limits

The 48 templates use ten layout families, eight heading treatments and eight categories; legacy template IDs resolve to a compatible category design. PDF fonts currently use jsPDF's built-in Latin fonts; full multilingual script support needs bundled Unicode fonts. No cloud sync, external LLM, background reminders, or clinical decision support is enabled. A signed release and live advertising are separate account-specific steps.

## Version 3.0

- Animated Mira home interview: answers/skips, photo and signature upload, repeatable education/experience/certifications/languages, custom sections, saved draft and resumable question position.
- Light/dark appearance, motion-sensitive animation, responsive category navigation, and redesigned cards and hover/focus states.
- 15 offline assistants: CV bullets, summary, keywords, STAR interviews, flashcards, recall quiz, reflections, SBAR practice, emails, cover letters, study plans, personal task sorting, portfolios, readability and shift preparation. These use local deterministic rules/templates, not neural model weights. They do not diagnose, prescribe, or verify clinical facts.
- Rota studio: monthly calendar, editable custom shifts, 19 codes, actual split/combined segment durations, OFF/leave days, review-before-save text imports, overlap/rest notices, pay estimates and calendar export. Rota-pro is a reference only and remains unchanged. Imports accept a single staff row of codes, not OCR.
- AdSense IDs remain blank and ads remain disabled until configured.

Original CV layouts were informed by [RCN CV guidance](https://www.rcn.org.uk/Professional-Development/Your-career/CV-writing), [RCN student guidance](https://www.rcn.org.uk/Professional-Development/Your-career/Student/Student-nurse-CV-writing), [Harvard career templates](https://careerservices.fas.harvard.edu/resources/category/resume-cv-cover-letter-templates/), and [Oxford academic CV guidance](https://www.careers.ox.ac.uk/academic-cvs).

# MedCV · Medico 4.3

Healthcare CVs and a daily workspace for nurses and nursing students. React, TypeScript and Vite power an offline-capable website and two Android applications.

Live app: https://medico.choicematrix.in/
Pulse owner console: https://medico.choicematrix.in/pulse/

## Features

- Redesigned responsive homepage with interactive layout/colour previews, persistent accents, searchable career collections, category-specific gallery links and quick tool actions.
- Mira floats at the bottom-right; its keyboard-accessible chat panel keeps in-progress answers when closed and resumes saved interviews after reload. Motion respects the device’s reduced-motion preference.

- 64 free original templates in eight categories and 32 original premium designs.
- Free custom-layout studio: structure, heading treatments, type, density and accents, with a live PDF preview and portable backup configuration.
- Mira's animated guided CV interview, with skipped questions, images, repeated entries, saved drafts and editable forms.
- Local CV drafts, PDF exports, cover letters, photos/signatures, validated backups and recovery.
- Nursing shift plans, reviewed rota imports, calendar exports, task/credential/study/application tools and 15 rule-based offline assistants. These are not trained generative models or clinical decision systems.
- Optional verified accounts and a server-authoritative referral ledger. One new verified account completing its first CV earns one credit for its original referrer. Duplicate completions do not earn more credits; installs alone are not counted.
- Consent-based automatic first-CV completion verification on PDF download; server balances synchronize while visible and after reconnect. Verification sends only the required completion fields.
- Pulse light/dark owner workspace with mobile account cards, search/filter/sort/pagination, ticket-specific replies, seven-day activity, session countdown, automatic report refresh, audited credit controls and CSV/JSON/print reports.
- One credit permanently unlocks one premium template, or reserves one 24-hour PDF/DOCX edit session producing one final version. Identical retries are allowed; a different version requires a new credit.
- PDF references with positioned text replacements; DOCX references with extracted text and rebuilt editable Word exports. Limits: 8 MB, 20 PDF pages, 40,000 Word characters. No automatic OCR, secure redaction or exact Word formatting preservation.
- Separate Pulse entry and Android package with verified-owner email-code sessions (30 minutes) or verified TOTP/AAL2 enforcement, reports, credit adjustments, account pauses, unused-edit refunds, support replies, feature flags and an audit trail.
- Public privacy, deletion, support, terms and original career-guide pages; cache/local-storage disclosure.

## Local development and checks

```sh
npm ci
npm run dev
npm test
npm run test:documents
npm run build
npm run test:pdf
npm run test:e2e
```

`test:pdf` checks all 96 original designs. Browser checks cover desktop/390px phone layouts, custom/premium galleries, Word/PDF references, guided CVs, workspace/export/backup/offline flows and signed-out Pulse access. `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` can select a local Chromium.

`npm run test:backend` is exclusively for a disposable PostgreSQL 17 test database initialized with `tests/fixtures/auth.sql`. Set `MEDCV_TEST_DB_HOST` and optional `MEDCV_TEST_DB_PASSWORD`. It recreates the MedCV test schema and verifies role boundaries, verified sessions, owner MFA, concurrent credit spending/referral deduplication, final-version binding, export preflight and profile deletion abuse prevention. Never point it at production. CI creates its own PostgreSQL service.

## Backend and privacy

The backend uses dedicated `medcv_private` tables in the connected ChoiceMatrix Supabase project. Existing Deals tables and shared Auth settings are not changed. Clients have no direct table access. Public invoker RPCs call private, narrowly granted handlers; receipt/finalization/preflight helpers are service-role-only. Owner identity is configured server-side, and administration requires a verified TOTP/AAL2 session or a server-issued, unexpired Gmail verification grant tied to the exact Auth session. Session records, expiry and email verification are checked by the database.

`supabase/functions/medcv-gateway` authenticates every request with Supabase `getUser` and then validates the continued session/entitlement in PostgreSQL. Its platform JWT flag is disabled because the function implements authentication itself; this is not an anonymous processing route. It limits request size and archive expansion, checks entitlements before rendering and never persists reference-file/CV content. The publishable frontend key is not a service key. Migration files and deployment source are included; server secrets are never shipped to browsers.

Ordinary CV/workspace editing stays local. Manual referral completion verification, or optional automatic verification enabled by the user, transmits only name, title, email and education/employment institution and retains a hash/receipt. Photos, signatures and the rest of the CV stay local. Paid import exports process the reference and edit intent transiently, retaining entitlement/hash metadata. See the live policy for provider logs, deletion and retained anti-abuse fingerprints.

## Android and store preparation

AGP 8.10.1 / Gradle 8.11.1 / Java 17 / compile and target API 36 / minimum API 23. Product flavors: `medico` retains `com.medcvmaker.app`; `pulse` uses `com.medcvmaker.app.pulse`. The bridged WebView serves packaged local files; only the configured Supabase HTTPS host is allowed for API resources, and remote navigation opens externally. File exports use Android's document picker. Android 10 instrumentation exercises both entries; API 36 window insets are handled.

```sh
npm run build
mkdir -p android/app/src/main/assets/web
cp -R dist/. android/app/src/main/assets/web/
gradle -p android assembleDebug assembleRelease bundleRelease
```

CI publishes separate app artifacts and instrumentation reports. Production signing keys/passwords live outside Git and the web bundle. Preserve the initial upload key privately; use the existing store certificate instead if this package already has a published listing. Store listings, assets generator, submission checklist and DNS instructions are in `release/`. Actual store submissions require the developer accounts, signing identity, required testing and review.

## Advertising and domain

Web AdSense is disabled until real publisher/slot IDs, approval flags and a Google-certified CMP are configured. Android never loads web AdSense. Native AdMob 24.9.0 and UMP 4.0.0 are integrated with automatic initialization removed; blank IDs/false approval flags prevent ad initialization and requests. A configured eligible home route must also pass consent before loading a banner. Referral, clinical workspace, editing and Pulse screens do not show ads. Gradle properties: `ADMOB_APP_ID`, `ADMOB_BANNER_ID`, `ADS_APPROVED`. Advertising privacy choices appear in Android Settings.

The live domain is https://medico.choicematrix.in/ with a dedicated Cloudflare Worker, managed TLS and security headers. GitHub Pages remains the build origin. `cloudflare/medico-domain.mjs` contains the domain Worker; its custom domain is managed by Cloudflare, without changing the other ChoiceMatrix sites.

Pulse’s Continue with Gmail opens Cloudflare Access email verification. The only allowed email is subhajitsatpathi6@gmail.com. A signed Access assertion is verified by `medcv-pulse-access` (RS256/JWKS, fixed issuer/audience, exact email and expiry) before issuing a short-lived owner session. It pins the first verified owner’s Auth user ID. Public/ordinary authenticated roles cannot grant owner sessions. No Gmail password or OAuth inbox access is required. Existing verified TOTP/AAL2 remains supported. Native Pulse’s link opens this secure login in the browser; its packaged offline console does not receive a browser session automatically.

The shared Access organization has an existing team hostname; its name/login design and other Access applications are unchanged. Public signup email still uses Supabase. An owner email request was accepted (HTTP 200); inbox receipt and general-public delivery were not verified. Custom SMTP/auth settings cannot be managed through the connected database tools. Cloudflare Email Sending returned 2036 Unauthorized. Store submission tools/credentials are not connected; developer account declarations, store review and advertising IDs/consent/approval remain external requirements. See `release/SECURITY-AND-DOMAIN.md`.

## Known limits

PDFs use built-in Latin fonts; full complex-script support needs bundled Unicode fonts. There is no general cloud CV library, background notification service, install attestation or clinical decision engine. Word import rebuilds text instead of reproducing arbitrary layouts. Template gating is an entitlement control, not DRM for files already downloaded. All premium designs are original; no third-party paid template code or assets are redistributed. See `release/template-research.md` for references.

# Medico 4.1 delivery report

Updated 9 October 2026 for 4.1. App: https://medico.choicematrix.in/ · Pulse: https://medico.choicematrix.in/pulse/

## Delivered

The public app has a professional light/dark design, responsive navigation, hover/focus states, reduced-motion handling, an animated guided CV interview, 64 free templates across eight categories and 32 original premium templates. A free custom studio combines layout, headings, fonts, spacing and accents and retains its configuration in CV backups. Premium previews are actual rendered sample PDFs. Original career guides, privacy/terms/support/deletion pages and a storage/cache notice are public.

Optional verified accounts provide referral codes, immutable first-enrollment attribution, a credit balance/history, template entitlements, support tickets and profile deletion. A new verified account's first complete CV can award one credit to its referrer. Repeated completion calls cannot award additional credits. A salted completion fingerprint prevents deletion/recreation of the same email from earning again; Gmail dot/plus aliases are normalized. Installs alone are not credited because install attestation was not configured.

One credit buys one permanent premium-template entitlement or one 24-hour imported-document edit session producing one final version. Reference PDFs/DOCX files can be previewed freely. PDF edits preserve reference pages with positioned white covers/text replacements. DOCX imports extract text and rebuild an editable Word document. The server authenticates users, checks the current session/entitlement before processing, bounds request/archive size and fixes the exact final edit intent. Identical retries of a final version are permitted during the reservation; changed versions require a new credit. Unused reservations can be refunded once through Pulse.

Pulse is a separate web entry and separate Android package. Its reports and actions require the configured verified owner and either a fresh server-verified Cloudflare email-code session (maximum 30 minutes) or an existing verified authenticator/AAL2 session. The owner email is locked to subhajitsatpathi6@gmail.com and the first verified Auth user ID is pinned. It provides account/referral/credit/export/unlock statistics, account pauses, audited support adjustments, unused-edit refunds, support replies, feature controls and JSON reports. Reports contain metadata; CV/reference files are not retained as an admin library.

## Verification

- Core tests and all 15 offline assistant checks pass.
- All 96 original template PDFs pass page/text-boundary checks; long multipage and searchable credential/date fixtures pass.
- PDF page preservation, bounds and text-fit tests pass. DOCX text roundtrip and decompression-limit tests pass. Custom layout and base64/hash validation pass.
- Real PostgreSQL 17 tests pass for direct-table/API role boundaries, verified/expired sessions, owner MFA, concurrent referral completion, simultaneous credit spending, idempotent unlocks, exact-version finalization, export preflight/rate limits and profile deletion abuse prevention.
- Latest web CI passes on both push and pull-request runs, including 32 desktop/phone browser cases. The custom-preview flow also passes four repeated runs per viewport after the initial empty-preview area was fixed.
- Android 10 instrumentation passes for both Medico and Pulse. The final release build passed before signing/delivery. The production phone app, premium previews, custom PDF preview, protected Pulse and public privacy page were also checked after deployment with no page errors or horizontal overflow. Both APK signatures (v1/v2/v3), 16 KB ZIP alignment and both AAB signatures verify; all 74 packaged web resources match the verified build byte-for-byte. API 36 insets are implemented; a physical Android 16 device was not available for additional hardware testing.
- The deployed document service rejects anonymous and invalid-token requests with HTTP 401. It authenticates inside the function and checks sessions/entitlements in PostgreSQL; its platform JWT flag is intentionally disabled to use that explicit authentication.
- Supabase's security advisor reports no Medico schema findings. Shared-project warnings concern the unrelated Deals function public.bump_deal_feed_revision and disabled leaked-password protection; no changes were made to that service or shared Auth configuration. The new owner email-code flow does not use a password. Reference: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable

## Android and store materials

Medico retains com.medcvmaker.app; Pulse uses com.medcvmaker.app.pulse. Version 4.1.0, versionCode 6, compile/target API 36, minimum API 23. AdMob 24.9.0 is pinned to preserve Android 6 compatibility; UMP 4.0.0 is integrated. Signed release APKs and AABs use the initial private RSA-4096 upload key; its certificate SHA-256 is F8:E9:81:CD:02:67:D4:64:82:F4:D6:A4:DB:86:5E:41:4E:0B:F2:60:66:D3:46:1C:0E:1A:08:33:53:F5:C6:C1. The key/password are not in Git or public deploy files. Back up the private signing package. If an existing store listing uses another certificate, use that existing key or an approved reset rather than this initial key. Export a local backup before replacing a differently signed debug install.

The store kit contains a 512px icon, 1024×500 feature graphic, actual 1170×2532 phone screenshots, descriptions, release notes and a Play/Indus submission/data-safety checklist. These files do not mean a store submission or approval has occurred.

## Account configuration still required

1. Owner access is configured: open Pulse, choose Continue with Gmail and verify subhajitsatpathi6@gmail.com using the Cloudflare email code. No public signup or password is required. Inbox verification must be completed by the owner; no successful inbox login was fabricated.
2. Public signup email: an owner Supabase email request returned HTTP 200, but general-public delivery and inbox receipt were not verified. Auth/SMTP management APIs are unavailable through the connected Supabase tools, and Cloudflare Email Sending returned 2036 Unauthorized. Shared Auth settings are unchanged.
3. Domain connected: https://medico.choicematrix.in/ is active with Cloudflare managed HTTPS and a dedicated Worker. GitHub Pages remains the build origin; other ChoiceMatrix sites are unchanged. See SECURITY-AND-DOMAIN.md.
4. Stores: actual Play Console/Indus developer access, declarations, any required closed testing, signing identity confirmation and review are needed. No submission or approval is claimed.
5. Advertising: web AdSense publisher/slot IDs remain blank. Google-certified CMP configuration and approval flags are also required. Android uses separate AdMob/UMP setup, never web AdSense. SDK initialization/ad requests stay disabled without valid IDs and approval; eligible native home ads also require consent. Referral, workspace, import and Pulse pages are ad-free. No referral award depends on an ad impression/click. Google alone decides approval; policies and original content improve readiness but do not guarantee it.

## Practical limits

PDF exports use built-in Latin fonts. Complex-script fonts and arbitrary Word layouts/images are not preserved. Scanned PDFs have manual overlays, not OCR. White covers are not secure redaction. Local assistants use rules/templates, not trained LLMs or treatment guidance. No background reminder service, general cloud CV sync or install attestation is enabled. Ordinary local drafts can be lost if browser/app storage is cleared; keep exported backups. Template entitlements are not DRM for an already exported file. Imported files/CV verification text are transiently processed only through explicit actions; technical logs and hashes/metadata follow the public privacy policy.

## Earlier 4.0 release evidence

Source release commit: 3eff6fff0008004ac877943cc82d7cc2ebf1f0cb. Merged PR: https://github.com/Subha760/Medical-cv/pull/2.

- Web + PostgreSQL verification: https://github.com/Subha760/Medical-cv/actions/runs/37899158907
- Pull-request verification: https://github.com/Subha760/Medical-cv/actions/runs/37899166859
- Both Android apps + emulator tests: https://github.com/Subha760/Medical-cv/actions/runs/37899158874
- Production web deployment: https://github.com/Subha760/Medical-cv/actions/runs/37899962008

Signed artifact checksums:

```json
[
  {
    "file": "Medico-4.0.apk",
    "bytes": 8529760,
    "sha256": "91eb60f9caeadf234df046e49cd7edcbeed30ad0019bfbe5799a1998f89709cb"
  },
  {
    "file": "Pulse-4.0.apk",
    "bytes": 8529760,
    "sha256": "d2f52e50ed1ecf663bae90e93feac20b849964f77502df683b834d3995568bb6"
  },
  {
    "file": "Medico-4.0.aab",
    "bytes": 8270622,
    "sha256": "dd5916f403e9f56fe7bbe635b8ffe4c79c70d8f747f4c9097f4d771315a216b8"
  },
  {
    "file": "Pulse-4.0.aab",
    "bytes": 8270707,
    "sha256": "6f3a2055d1bdd8e83fed4917fa3b852f17e6cf6c2118bf67170b7ab98e4ca346"
  }
]
```

## 4.1 security and domain follow-up

See [SECURITY-AND-DOMAIN.md](SECURITY-AND-DOMAIN.md) for the email-code trust boundary, session expiry, pinned owner identity, live domain headers, latest verification and account-access limits. The checksum artifact record above describes the earlier 4.0 binaries; 4.1 builds use the same private signing key.

## Verified 4.1 release

Application source commit: 5246ade80466e2a9292e14a46c7f650c6ec65d74. The later domain-policy, documentation and test-wait updates do not change packaged app resources.

- Web/PostgreSQL/32 desktop-phone CI cases: https://github.com/Subha760/Medical-cv/actions/runs/37970904426
- Medico/Pulse Android builds and Android 10 instrumentation: https://github.com/Subha760/Medical-cv/actions/runs/37970904398
- Production deployment: https://github.com/Subha760/Medical-cv/actions/runs/37970904386
- Live custom-domain phone check: home, custom PDF canvas, locked owner Gmail, no password field and secure Cloudflare email-code screen passed, with no page errors. Completing the actual inbox code requires the owner.
- Full local browser run passed 29 cases and exposed three timing failures under parallel execution. The affected category, interview and preview flows passed again on both viewports with one worker (six cases). Test waits now follow question changes and scroll the lazy preview into view. The full CI suite passed all 32 cases.
- Both release APKs verify v1/v2/v3 signatures and 16 KB ZIP alignment. Both AAB signatures verify. All 74 packaged web resources in both APKs match the verified build byte-for-byte. npm audit reports zero production or development vulnerabilities.

Signed 4.1 artifact checksums:

```json
[
  {
    "file": "Medico-4.1.apk",
    "bytes": 8533856,
    "sha256": "fe953cbaf30d2ed3dcd88079201e50c7e6cae189d2d9b07596ef1b46247d1fd8"
  },
  {
    "file": "Pulse-4.1.apk",
    "bytes": 8533856,
    "sha256": "6a8e526dd4ebd016947bcbad282e9fc4c616c302a538e6760b6bdeeaa98abaf0"
  },
  {
    "file": "Medico-4.1.aab",
    "bytes": 8276902,
    "sha256": "a5e0d32339837dd0bb101794ae94a7ab03f8d621658232ef216f30d191114170"
  },
  {
    "file": "Pulse-4.1.aab",
    "bytes": 8276976,
    "sha256": "d8fe1c305db264ada8e1b5a81a40c7b460e6a64151a0d6d8e723a5f85f754b7c"
  }
]
```

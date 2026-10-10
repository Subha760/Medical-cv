# Medico and Pulse 4.2

Pulse now has a responsive owner workspace with light/dark themes, motion with reduced-motion support, section navigation, a session countdown and automatic report refresh. It adds seven-day account activity, a support queue, account search/filter/sort/pagination, 1–20 support credit grants, ticket-specific responses, open/resolved support filters, audit search, filtered CSV exports, a summary CSV, JSON export and printable reports. Mobile accounts use stacked cards so administrative controls remain reachable. Activity charts and queue counts explicitly describe their newest-200-record scope. No mock activity is displayed in production.

Referral credit balances refresh from the server every 30 seconds while visible and on focus or reconnect. Users may opt in to automatic first-CV verification when downloading a qualifying CV. The setting is off until consent and is tied to the signed-in account on the current device. Verification sends only name, title, email and education/employment institution; photographs, signatures, birth date, address and the rest of the CV are excluded. A failed verification does not block PDF download. The manual verification action remains available.

Credit issuance and spending remain server-controlled: a new verified Medico account with a referral code and first qualifying CV can award one credit. Installs alone do not qualify. The user chooses one permanent premium design or one 24-hour document edit producing one final version. Referral attribution is fixed at first enrollment. Repeated submissions and normalized Gmail aliases cannot earn extra rewards; concurrent spending cannot create negative balances; non-owners cannot grant or refund credits; unused edit refunds are issued once. These controls do not guarantee detection of every distinct-email abuse attempt or establish an install as a verified referral.

The upgrade preserves the deployed owner Gmail verification flow, fixed issuer/audience proof checks, pinned owner identity, server-issued owner grants, 30-minute email session lifetime and encrypted 120-second HttpOnly handoff. Administrative changes require an audit reason, and their buttons block duplicate in-flight actions. CSV exports quote cells and neutralize spreadsheet formulas in user-entered content.

Application version 4.2.0; Android versionCode 7. Ads remain disabled until IDs, consent setup and approval are configured. Store publication and review are separate from build preparation.

## Local verification

- All 40 Chromium desktop/390px-phone browser cases passed, including the owner handoff, report refresh/pause, grants, ticket responses, exports, consent, automatic verification, balance refresh, outage recovery and the existing CV/workspace/offline flows.
- Unit checks passed for private completion payloads, eligibility, formula-safe CSV, seven-day activity and the existing application/owner handoff rules.
- Disposable PostgreSQL checks passed for verified sessions, pinned owner/MFA grants, forged-client credit denial, grant limits, concurrent deduplication/spending, Gmail aliases, paused accounts, strict final-version edits and one-time unused refunds.
- Browser authentication and referral cases use isolated fixtures. The actual production owner login was separately proven on the preceding owner-session fix; this UI update does not bypass verification or claim a new personal-code test.

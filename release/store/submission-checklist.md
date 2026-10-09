# Submission checklist — prepared, not submitted

## Signing

An initial RSA-4096 upload certificate was generated outside Git and outside the web bundle at /workspace/medcv-private-release/. This release is not known to have a previous store signing identity. Do not upload under an already published listing unless the existing upload/signing certificate matches, or the store has approved a key reset. Preserve the initial keystore and its password privately for every future update. Public debug APKs cannot update a store-signed installation, and this new signed release cannot overwrite an older debug install without uninstalling it; export a local backup first.

Medico retains package com.medcvmaker.app. Pulse uses com.medcvmaker.app.pulse and is intended for private owner distribution, not public store discovery. Both apps require internet only for optional verified account/backend features. Pulse cannot access data without the configured owner email and verified authenticator MFA.

## Google Play

1. Developer account verification, payments/profile registration where applicable, and access to Play Console are required. No account credentials were available to this session.
2. Upload the signed Medico AAB, enroll in Play App Signing and retain the upload key.
3. Supply the listing, 512px icon, 1024×500 feature graphic and actual phone screenshots from this package.
4. Complete content rating, target audience, ads declaration, app access and Data safety forms with the actual configuration below. Provide a dedicated verified reviewer account for account-gated features; never share the owner/Pulse account or an MFA secret. New personal accounts may need 12 opted-in testers for at least 14 continuous days before production access.
5. Check the Android 16 / API 36 target requirement and current Play Console checks. Review is a store decision, not guaranteed by these files.

## Indus

Create/verify an Indus developer account, upload the signed APK (or follow the store's AAB signing procedure), supply the listing and screenshots, use the live privacy/deletion URLs, complete declarations and submit for review. No submission was made without developer-console access.

## Data safety draft — review before submitting

Account email and user ID are processed for optional authentication and service functionality. Referral attribution, ledger, unlock and support records are retained. CV verification text and imported files/documents leave the device only through the explicit verification/export flows; files are processed ephemerally, with input/completion/final-version hashes retained. Infrastructure security logs can include IP/network details and request metadata. Photos/signatures in ordinary CVs and workspace drafts stay local. The operator does not sell data; service-provider processing is subject to the store's disclosure definitions. Data is encrypted in transit. Profile deletion and a public full-identity deletion request page are available. A salted anti-abuse fingerprint remains after profile deletion; provider backups/logs follow their retention policies.

Do not declare “no data collected”: optional account and processing features transmit data. Account features are optional for free tools; some premium features require verified sign-in. Advertising is disabled, with AdMob/UMP libraries present but no SDK initialization/ad requests without real IDs, explicit approval and consent. Review the current Contains ads form against this shipped SDK and explain the disabled configuration. If ads are enabled later, update disclosures for advertising identifiers, device information, app interactions and Google SDK processing; configure UMP messages and privacy options first.

Health apps declaration: the app provides nursing education/practice and professional organisation, including SBAR practice, without diagnosis, treatment, health-record management or prescribing. Select the categories that match the current official questionnaire. Do not claim clinical safety certifications or medical-device approval.

## Remaining account configuration

• Owner: create and verify subhajitsatpathi6@gmail.com in Account, then sign in to Pulse and enroll/verify an authenticator. Ownership is enforced by the database, not URL secrecy.
• Supabase: configure production SMTP and allowed verification redirects for the app URLs. Default Supabase email delivery is limited and is not a production mailing service. No SMTP credential was supplied, and shared ChoiceMatrix Auth configuration was not silently changed.
• DNS: choicematrix.in uses Cloudflare nameservers skip.ns.cloudflare.com and cora.ns.cloudflare.com. Create medico CNAME → Subha760.github.io (DNS-only), then add medico.choicematrix.in to this GitHub Pages project's custom-domain settings and enable HTTPS after validation. Verify domain ownership through GitHub's TXT record if requested. Do not switch the app to the custom hostname until DNS resolves; the existing GitHub URL stays available.
• Advertising: supply approved web AdSense publisher/slot IDs and a Google-certified CMP; use VITE_ADSENSE_APPROVED=true and VITE_GOOGLE_CERTIFIED_CMP=true only after approval/setup. Native AdMob is separately configured with Gradle ADMOB_APP_ID, ADMOB_BANNER_ID and ADS_APPROVED=true. Blank IDs/false flags keep both disabled. AdSense is never loaded in the Android WebView. No referral rewards depend on advertising.

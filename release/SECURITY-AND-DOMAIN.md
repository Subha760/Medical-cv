# Medico 4.1 · Owner email verification and domain

Live app: https://medico.choicematrix.in/
Pulse: https://medico.choicematrix.in/pulse/
GitHub Pages build origin: https://subha760.github.io/Medical-cv/

## Owner sign-in

Choose Continue with Gmail in Pulse. Enter subhajitsatpathi6@gmail.com on the secure Cloudflare verification page, request the email code, and enter it. Cloudflare redirects to Pulse, which verifies the signed Access assertion on the server and establishes a short-lived session automatically. No public-app signup or password is required for this path. Cloudflare's existing team hostname is toolinger-owner.cloudflareaccess.com; this is the owner's already configured shared Access organization, not a third-party login.

Only the exact owner email is permitted by the Access policy, Edge verification and database ownership check. This is email authentication, not Google OAuth or a claim that one email code is two-factor authentication. Existing verified TOTP/AAL2 is still supported. Signing out closes the Pulse Auth session and Cloudflare login. The first successfully verified owner's Supabase user ID is pinned to prevent email reassignment from creating a different owner. Owner reports are unavailable to public visitors and ordinary signed-in accounts.

The email session expires no later than the signed Access assertion, at most 30 minutes. Refreshing an Auth token does not extend this database grant. An expired or deleted Auth session cannot administer the app. Client roles cannot issue owner grants or read private tables. Pulse uses a separate authentication key in tab session storage rather than sharing public-app local-storage sign-in.

Native Pulse's Continue with Gmail opens the secure web login in the system browser. The web console works after verification; its browser session is not automatically copied to the packaged offline Android WebView.

## Domain and security

The registrar is GoDaddy; authoritative DNS is Cloudflare. A new dedicated medico-domain Worker custom domain provides managed HTTPS and routes static GET/HEAD requests to the deployed GitHub Pages build. Root, /pulse/ and public legal pages resolve successfully. Other ChoiceMatrix DNS records, Workers and Access policies were left intact. GitHub Pages domain writes returned 403 Resource not accessible by integration, so the domain does not depend on GitHub administration permissions.

The domain adds HSTS, no-sniff, frame denial, a content security policy, referrer/permissions policies, no-store for Pulse responses and no-cache for the service worker. It never forwards cookies, Authorization or Access assertions to GitHub. POST is accepted only by the protected, same-origin JSON owner-session route. The Edge Function verifies RSA signature via fixed JWKS, issuer, audience, exact owner email, token type and time claims; a client-supplied email or unverified header does not confer authority. Owner verification does not read Gmail. No owner password or service-role key is published.

## Verification and limits

- Disposable PostgreSQL tests exercise owner/ordinary-user/anonymous permissions, invalid and expired owner grants, session ownership, maximum session age, null AAL, pinned identity, and server-only grant permissions.
- Claim and Worker tests reject changed emails, expired/future/overlong claims, service tokens and forged assertions; they check no credential forwarding and security headers.
- Live Edge Function requests with missing and invalid assertions return 401.
- Production and development dependencies were checked. Build tooling was updated to Vite 6.4.4 with source-map-js 1.2.2; DOMPurify was updated to 3.4.16 and Mammoth’s CLI-only argparse dependency was replaced with the compatible 2.0.1 release; DOCX extraction and the CLI help entry pass verification.
- The live protected sign-in route redirects to Cloudflare email verification; completing the inbox code requires the owner. No inbox receipt or successful owner code was fabricated.
- A Supabase built-in owner email request returned HTTP 200. This proves request acceptance, not inbox delivery, custom SMTP setup or general-public email deliverability. Cloudflare Email Sending returned 2036 Unauthorized. The connected Supabase tools provide database/Edge access but no Auth/SMTP configuration API.
- Play Console, Indus developer submission and Google advertising approval APIs/credentials are not connected. Signed release binaries and store submission materials are prepared; store publication and approval have not happened. Ad IDs remain blank per the owner's instruction, so advertising is disabled.
- Supabase's shared-project advisor lists unrelated pre-existing Deals function grants and disabled leaked-password protection. No MedCV private-table/grant warning was returned. Shared-project Auth configuration could not be changed through this connection; the email-code owner path does not use a password.

Changes: source version 4.1.0; Android versionCode 6, versionName 4.1.0. Initial signing key remains private and is reused for updates.

# Indus signup hold — investigation and repair

Indus reports that a reviewer created an account but could not sign in.

Production Supabase Auth logs on 13 October 2026 show `/signup` returning HTTP 500 because PostgreSQL connections are refused. A direct database health query also failed with ECONNREFUSED. PostgreSQL logs show startup recovery failing with `could not write to file pg_wal/xlogtemp...: No space left on device`, then shutting down. The project management status had incorrectly remained ACTIVE_HEALTHY while these services were unavailable.

A supported pause-and-restore recovery was started for existing project jfweexvfnkotusyajkst. No app records were deleted, no email verification requirement was disabled and no new project was substituted. Restoration must complete and live Auth must be verified before the Indus hold is resolved.

App release 4.5.1 adds a twenty-second request deadline, clear account-service outage messages, and correct handling of expired email callback links. Signup does not report success when the service returns an error. Existing local CV and workspace records remain intact. Pulse authorization is unchanged.

Required final production checks: a fresh external email completes signup, receives verification, confirms the email, signs in with its chosen password in the Medico APK, and stays signed in after an app restart. Until those pass, this remains an unresolved production backend issue, even if app tests pass.

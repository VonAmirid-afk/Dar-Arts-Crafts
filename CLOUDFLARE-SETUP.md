# Activate on your existing Cloudflare Pages project

No domain change is needed. No paid subscription is required within the providers' free limits.

1. Create a Cloudflare D1 database. Execute `migrations/0001.sql` in its SQL console (or with Wrangler D1 execute). In Pages project Settings → Bindings, bind this database as **DB**. Use a separate database for preview deployments.
2. In Pages settings, add these encrypted secrets for production:
   - `ADMIN_PASSWORD`: a unique random password of at least 16 characters.
   - `BREVO_API_KEY`: a Brevo **API** key, not an SMTP key.
   - `MAIL_FROM`: your verified Brevo sender email address.
   - `OWNER_EMAIL`: the mailbox where Plamena receives enquiries and customer replies.
3. In Brevo, verify the sender and authenticate your purchased domain using the DNS records Brevo supplies. Add those records in Cloudflare DNS. This email sending integration does not create an inbox; OWNER_EMAIL must already receive mail.
4. Configure Pages build command `node scripts/build-pages.cjs` and output directory `dist`. The root `functions/` directory is compiled by Pages. Deploy through Git integration or Wrangler Pages deploy; dashboard drag-and-drop does not compile Functions. Never use the repository root as the static output: it contains tests and deployment documentation.
5. Redeploy after binding/secrets changes. Open `/admin.html`, switch to **Моите поръчки**, and sign in. Submit a test enquiry with an address you control. Confirm it appears, inspect email history, then save and preview/send the confirmed, making, and ready statuses.

The public endpoint uses a honeypot, strict validation, and a persistent per-IP hourly limit. Login is rate limited; cookies are Secure, HttpOnly, SameSite=Strict and expire after 8 hours. API writes require the same Origin. No credentials are stored in browser storage. Preview deployments should use isolated credentials and a test mailbox, never production customer records.

Enquiries initially have zero prices and a placeholder due date equal to receipt date. Set the agreed prices and deadline before confirming. Internal notes never appear in customer status emails. Status saves do not send emails: use **Преглед и изпращане** after saving. Pending or explicitly rejected emails can be retried in the history. `accepted` means Brevo accepted the request, not that it reached the inbox. `sending` or `unknown` needs manual inspection in Brevo; the application will not risk automatically duplicating it. Pending acknowledgement sends can be retried from the dashboard after configuring Brevo.

Real-mode bulk restore is disabled to prevent overwriting shared enquiries. Old browser-local orders remain in browser storage; export them from the old version before migrating. Keep D1 backups, including the `emails` table (duplicate prevention history). Periodically delete expired `sessions` and old hourly `limits` rows. There is no background scheduled retry worker or delivery-webhook integration in this version.

Local API tests: `node --test tests/backend.test.mjs`. Existing calculations: `node tests/admin-core.test.cjs`. Preview the actual Functions locally with Wrangler Pages dev and a local D1 binding; plain Python HTTP preview cannot run the backend.

References: https://developers.cloudflare.com/pages/functions/bindings/ and https://developers.brevo.com/reference/send-transac-email

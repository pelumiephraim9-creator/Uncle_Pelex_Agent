# Pelex professional email: setup guide

**Two addresses, two jobs**
- **hello@pelex.tech** sends: confirmation codes, the welcome message, and "what's new" updates.
- **support@pelex.tech** handles: help requests, subscription invoices and receipts. Welcome emails set Reply-To to support@ so replies land there.

## Step 1. Receiving vs sending (the important difference)
What you set up "locally" most likely lets you **receive** mail at these addresses (forwarding, for example Cloudflare Email Routing). The site also has to **send** mail, and that needs a sending service. Pick one (both have a free tier; check their current limits):
- **Resend** (resend.com), simple, made for apps.
- **Brevo** (brevo.com), includes newsletters.

In the service: add domain **pelex.tech**, then copy the DNS records it shows (SPF, DKIM, and a return-path record) into **Cloudflare > DNS**. Set each of those records to **DNS only** (grey cloud), not proxied. Wait until the service says "Verified". Also add one DMARC record: name `_dmarc`, type TXT, value `v=DMARC1; p=none; rua=mailto:support@pelex.tech`.

## Step 2. Make Supabase send from hello@pelex.tech
Supabase > **Authentication > Emails > SMTP Settings** > turn on custom SMTP:
- Sender email: `hello@pelex.tech`   Sender name: `Pelex`
- Host, port, username, password: from your sending service (its "SMTP" page)

This removes "Supabase Auth" as the sender and lifts the tiny built-in email limit.

## Step 3. Branded confirmation email with a code
Supabase > **Authentication > Emails > Templates > Confirm signup**:
- Subject: `Your Pelex confirmation code`
- Body: paste the whole of `email_confirm_signup.html`

Supabase > **Authentication > URL Configuration**:
- Site URL: `https://pelex.tech`
- Redirect URLs: add `https://pelex.tech/**`

The new index.html already shows a "Confirmation code" box after sign-up, and the email button opens `pelex.tech/?token_hash=...`, so **the supabase.co address no longer appears** in the email or the link.

## Step 4. Google and GitHub screens (cannot be done in code)
- **Google:** Google Cloud Console > APIs & Services > OAuth consent screen > Branding: App name `Pelex`, logo, support email `support@pelex.tech`, add `pelex.tech` as an authorised domain.
- **GitHub:** create a free GitHub **Organization** named Pelex, then move the OAuth app into it (app Settings > Transfer ownership). The screen then says "by Pelex" instead of your username.
- The long `...supabase.co` address on those screens comes from Supabase's **Custom Domain** add-on (paid). With it, the address becomes something like `auth.pelex.tech`. Until then, that line stays.

## Step 5. Welcome email (n8n)
1. n8n > new workflow **Pelex welcome**:
   - **Webhook** node: POST, path `pelex-welcome`, Authentication = Header Auth. Create a credential with header name `x-pelex-secret` and a long random password.
   - **Send Email** (SMTP) node: SMTP credential from your sending service. From `Pelex <hello@pelex.tech>`, To `{{ $json.body.email }}`, Reply-To `support@pelex.tech`, Subject `Welcome to Pelex`, HTML = `email_welcome.html` (as an Expression).
   - Activate the workflow.
2. Open `welcome_email_trigger.sql`, replace the two CHANGE_ME values (same secret as n8n), and run it in the Supabase SQL Editor.
3. Test: create a new account. The welcome email arrives right after the email is confirmed (Google/GitHub: right away).

## Step 6. Invoices from support@
Paystack already emails its own receipt. For a Pelex-branded invoice: Paystack webhook > n8n > Send Email from `support@pelex.tech`. Build this when payments go live.

## Newsletter rules
The table `newsletter_subscribers` starts everyone as **not** subscribed. Only email "what's new" to people who opted in, and every update needs an unsubscribe link. Next step for the site: an "email me product updates" tick box at sign-up and in Settings.

## Not built yet
- **Forgot password.** The site has no reset screen yet, so no reset email template is included.

# Branded team emails (password reset, invitation…)

Supabase sends these emails, not the website. Two things make them branded and reliable. Both are done in the Supabase dashboard; nothing here runs on its own.

## 1. Send them from contact@kinshasalabel.com through Brevo (SMTP)

Without this, Supabase sends from its own address, without the brand name, and only a few emails per hour.

Supabase → **Project Settings → Authentication → SMTP Settings** → **Enable custom SMTP**:

| Field | Value |
|---|---|
| Sender email | `contact@kinshasalabel.com` |
| Sender name | `Kinshasa Label` |
| Host | `smtp-relay.brevo.com` |
| Port | `587` |
| Username | the **login** shown in Brevo → SMTP & API → **SMTP** tab (looks like `xxxx@smtp-brevo.com`) |
| Password | an **SMTP key** from that same tab (starts with `xsmtpsib-`). This is NOT the API key used by the website. |

Then Supabase → **Authentication → Rate Limits**: raise "emails per hour" to 30.

## 2. Paste the templates

Supabase → **Authentication → Email Templates**. For each one, set the subject and paste the whole file into the message box (switch to the HTML / source view if offered):

| Template in Supabase | Subject | File |
|---|---|---|
| Reset password | `Choisis un nouveau mot de passe · Kinshasa Label` | `reset-password.html` |
| Invite user | `Tu es invité(e) dans l'équipe Kinshasa Label` | `invite.html` |
| Magic link | `Ton lien de connexion · Kinshasa Label` | `magic-link.html` |
| Confirm signup | `Confirme ton adresse · Kinshasa Label` | `confirm-signup.html` |
| Change email address | `Confirme ta nouvelle adresse · Kinshasa Label` | `change-email.html` |

## 3. Allow the reset page

Supabase → **Authentication → URL Configuration**:
- Site URL: `https://www.kinshasalabel.com`
- Redirect URLs: add `https://www.kinshasalabel.com/login/nouveau-mot-de-passe` (and `https://kinshasalabel.com/login/nouveau-mot-de-passe`).

## Test

kinshasalabel.com/login → **Mot de passe oublié ?** → your team email → the branded email arrives → the button opens "Nouveau mot de passe" → save → you land in the backoffice.

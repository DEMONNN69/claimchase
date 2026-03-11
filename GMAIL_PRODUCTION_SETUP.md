# Gmail Integration — Production Setup Guide

## Overview

This guide sets up the full Gmail integration for `amicusclaims.ai`:
- Users connect their Gmail via OAuth
- App sends grievance emails on their behalf
- Gmail notifies the app when insurance companies reply (Pub/Sub)
- Replies are matched to cases automatically

**Time required:** ~30 minutes

---

## Step 1 — Fix Environment Variable Names (Critical)

Your `.env.production` on the VPS has **wrong key names** that don't match what Django reads. Fix this first.

SSH into VPS and edit the env file:

```bash
nano /root/claimchase/.env.production
```

Find these lines:
```env
GOOGLE_CLIENT_ID=552828618408-...
GOOGLE_REDIRECT_URI=https://www.amicusclaims.ai/api/auth/gmail/callback/
```

**Change them to:**
```env
GOOGLE_OAUTH_CLIENT_ID=552828618408-f4irrri0a5t6d8fqcbrc4o84q4e3pfne.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=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
GOOGLE_OAUTH_REDIRECT_URI=https://www.amicusclaims.ai/api/auth/gmail/callback/
GMAIL_PUBSUB_TOPIC=projects/claimchase-grievance/topics/gmail-notifications
```

> The old `GOOGLE_CLIENT_ID` and `GOOGLE_REDIRECT_URI` keys were never being read by Django. This is why Gmail connect was failing silently.

Save (`Ctrl+O`, `Enter`, `Ctrl+X`) then restart the backend:

```bash
cd /root/claimchase
docker compose restart backend
```

---

## Step 2 — Google Cloud Console: Enable APIs

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Select project **claimchase-grievance** (top-left dropdown)
3. Go to **APIs & Services → Library**
4. Search and **Enable** each of these if not already enabled:
   - ✅ **Gmail API**
   - ✅ **Cloud Pub/Sub API**

---

## Step 3 — Update OAuth Credentials (Add Production URI)

1. Go to **APIs & Services → Credentials**
2. Click on your **OAuth 2.0 Client ID** (the one used for this app)
3. Under **Authorized redirect URIs**, click **Add URI** and add:
   ```
   https://www.amicusclaims.ai/api/auth/gmail/callback/
   https://amicusclaims.ai/api/auth/gmail/callback/
   ```
4. Click **Save**

> Without this, Google will reject the OAuth callback with a `redirect_uri_mismatch` error.

---

## Step 4 — Configure OAuth Consent Screen for Production

1. Go to **APIs & Services → OAuth consent screen**
2. Check the current status:
   - If **Testing** → users outside your Google account can't connect Gmail
   - If **In production** → all users can connect

**To publish for production:**

1. Click **Edit App**
2. Fill in all required fields:
   - App name: `AmicusClaims`
   - User support email: your email
   - Developer contact email: your email
3. Under **Scopes**, confirm these are listed:
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/gmail.metadata`
4. Click **Save and Continue** through all steps
5. On the final screen, click **Publish App** → **Confirm**

> If Google requires verification for sensitive scopes, you'll need to submit for review. For `gmail.send` and `gmail.metadata`, the review process takes 1–4 weeks. Until approved, only test users can connect.

**Add test users (bypass review during testing):**
1. OAuth consent screen → **Test users** → **Add users**
2. Add email addresses of users who need to connect Gmail now

---

## Step 5 — Create Pub/Sub Topic (if not exists)

1. Go to **Pub/Sub → Topics**
2. Check if `gmail-notifications` topic exists
3. If not, click **Create Topic**:
   - Topic ID: `gmail-notifications`
   - Leave defaults
   - Click **Create**

**Grant Gmail publish permission:**
1. Click on the `gmail-notifications` topic
2. Go to the **Permissions** tab (right-side panel)
3. Click **Add Principal**
4. Principal: `gmail-api-push@system.gserviceaccount.com`
5. Role: **Pub/Sub Publisher**
6. Click **Save**

> Without this, Gmail cannot publish notifications to your topic.

---

## Step 6 — Create Pub/Sub Push Subscription

1. Go to **Pub/Sub → Subscriptions**
2. Click **Create Subscription**
3. Configure:
   - Subscription ID: `gmail-notifications-prod`
   - Select topic: `projects/claimchase-grievance/topics/gmail-notifications`
   - Delivery type: **Push**
   - Endpoint URL: `https://www.amicusclaims.ai/webhooks/gmail/`
   - Acknowledgement deadline: `60` seconds
   - Message retention: `7 days`
4. Click **Create**

> The trailing slash on the endpoint URL is required — Django will reject requests without it.

**Verify the subscription is active:**
- Status should show **Active**
- Endpoint: `https://www.amicusclaims.ai/api/webhooks/gmail/`

---

## Step 7 — Verify Webhook URL is Registered in Django

The webhook endpoint must be accessible. Check it:

```bash
curl -X POST https://www.amicusclaims.ai/webhooks/gmail/ \
  -H "Content-Type: application/json" \
  -d '{"message": {"data": "dGVzdA==", "messageId": "test"}}'
```

Expected response: `HTTP 200` (Django acknowledges the message)

If you get `404`, check `backend/claimchase/urls.py` has the webhook registered:

```python
path('api/webhooks/gmail/', gmail_webhook, name='gmail-webhook'),
```

---

## Step 8 — Verify Full .env.production on VPS

SSH in and confirm all Gmail-related vars are set correctly:

```bash
grep -E "GOOGLE_|GMAIL_" /root/claimchase/.env.production
```

Expected output:
```
GOOGLE_OAUTH_CLIENT_ID=552828618408-f4irrri0a5t6d8fqcbrc4o84q4e3pfne.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=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
GOOGLE_OAUTH_REDIRECT_URI=https://www.amicusclaims.ai/api/auth/gmail/callback/
GMAIL_PUBSUB_TOPIC=projects/claimchase-grievance/topics/gmail-notifications
```

---

## Step 9 — Test the Full Gmail Connect Flow

1. Open `https://www.amicusclaims.ai` in browser
2. Login with a user account
3. Go to **Settings** page
4. Click **Connect Gmail**
5. Google OAuth page opens — authorize the app
6. Should redirect back to Settings with "Gmail Connected ✅"

**Check Django logs to confirm:**
```bash
docker compose logs backend --tail=50 | grep -i gmail
```

Expected log lines:
```
Gmail OAuth callback received
User ... connected Gmail account: user@gmail.com
Gmail watch started for user@gmail.com, expires: ...
```

---

## Step 10 — Test Email Sending

1. Create a case in the app
2. Go to the case detail page
3. Try sending a grievance email
4. Check Django logs:

```bash
docker compose logs backend --tail=50 | grep -i "email\|gmail"
```

Expected: `Email sent successfully, thread_id: ...`

---

## Step 11 — Test Pub/Sub Notification (Reply Detection)

1. From a **different email account**, reply to the grievance email sent in Step 10
2. Wait ~30 seconds
3. Check logs:

```bash
docker compose logs backend --tail=100 | grep -i "webhook\|notification\|reply"
```

Expected:
```
Gmail notification for user@gmail.com, history ID: ...
Processing Gmail history for user@gmail.com
Found reply email, matched to case #...
```

4. Refresh the case in the app — the reply should appear in the timeline

---

## Step 12 — Set Up Watch Renewal (Gmail watches expire every 7 days)

Gmail's Pub/Sub watch must be renewed every 7 days. Add a cron job on the VPS:

```bash
crontab -e
```

Add this line:
```
0 2 * * * cd /root/claimchase && docker compose exec -T backend python manage.py renew_gmail_watches 2>&1 | logger -t gmail-watch-renewal
```

This runs daily at 2 AM and renews watches that are about to expire.

**Verify the management command exists:**
```bash
docker compose exec backend python manage.py help renew_gmail_watches
```

If it shows "Unknown command", the command needs to be created — see the note below.

> **Note:** If `renew_gmail_watches` management command doesn't exist yet, users' Gmail watches will silently expire after 7 days and reply detection will stop working. The manual workaround until then is: users disconnect and reconnect Gmail every week.

---

## Step 13 — SSL Verification (if not done yet)

Gmail OAuth requires HTTPS. If you haven't set up SSL yet:

```bash
# Stop nginx to free port 80
cd /root/claimchase
docker compose stop web

# Get certificate
certbot certonly --standalone \
  -d amicusclaims.ai \
  -d www.amicusclaims.ai \
  --email your@email.com \
  --agree-tos \
  --non-interactive

# Restart
docker compose up -d web
```

---

## Troubleshooting

### "redirect_uri_mismatch" error on Gmail connect
→ Step 3: Add the production redirect URI to Google Cloud OAuth credentials

### "access_denied" error
→ Step 4: Consent screen is in Testing mode — add the user's email as a test user

### Gmail connects but no notifications on reply
→ Step 5/6: Check that `gmail-api-push@system.gserviceaccount.com` has Publisher role on the topic
→ Check Pub/Sub subscription endpoint URL is exactly `https://www.amicusclaims.ai/api/webhooks/gmail/`

### Watch expired after 7 days
→ Step 12: Set up the cron job. Manually trigger: `docker compose exec backend python manage.py renew_gmail_watches`

### "GOOGLE_OAUTH_CLIENT_ID not set" in logs
→ Step 1: The env var names were wrong — confirm fix was applied and backend was restarted

### Check Pub/Sub message delivery
1. Go to **Google Cloud → Pub/Sub → Subscriptions → gmail-notifications-prod**
2. Click **Messages** tab
3. Undelivered messages will show here with error details

---

## Summary of Env Vars Required

| Variable | Value |
|---|---|
| `GOOGLE_OAUTH_CLIENT_ID` | From Google Cloud → OAuth credentials |
| `GOOGLE_OAUTH_CLIENT_SECRET` | From Google Cloud → OAuth credentials |
| `GOOGLE_OAUTH_REDIRECT_URI` | `https://www.amicusclaims.ai/api/auth/gmail/callback/` |
| `GMAIL_PUBSUB_TOPIC` | `projects/claimchase-grievance/topics/gmail-notifications` |

---

## How It All Works (Flow Diagram)

```
User clicks "Connect Gmail"
    → GET /api/auth/gmail/connect/
    → Django returns Google OAuth URL
    → User authorizes on Google
    → Google redirects to /api/auth/gmail/callback/?code=...&state=<token>
    → Django exchanges code for tokens
    → Tokens encrypted with SECRET_KEY and saved to DB
    → Django calls gmail.users().watch() → Pub/Sub watch starts
    → User sees "Gmail Connected ✅"

User sends grievance email
    → POST /api/cases/{id}/send_email/
    → Django decrypts refresh token
    → Gets fresh access token from Google
    → Sends email via Gmail API
    → thread_id saved to EmailTracking record

Insurance company replies
    → Gmail detects new email in INBOX
    → Gmail publishes notification to Pub/Sub topic
    → Pub/Sub pushes to https://www.amicusclaims.ai/api/webhooks/gmail/
    → Django fetches email history via Gmail API
    → Matches email thread_id to case
    → Creates CaseTimeline entry "Reply received"
    → Case status updated to "under_review"
```

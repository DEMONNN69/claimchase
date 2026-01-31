# Gmail Pub/Sub Setup Guide for ClaimChase

## 🚧 Development Setup (Local Environment)

This guide is for **local development**. You'll use ngrok to expose your local server.

---

## Quick Start (5 Steps)

### Step 1: Install & Start ngrok

```bash
# Install ngrok (choose one):
# Windows (with chocolatey): choco install ngrok
# Windows (manual): Download from https://ngrok.com/download

# Start ngrok (in a new terminal, keep it running!)
ngrok http 8000
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok-free.app`)

⚠️ **Note**: Free ngrok URLs change every time you restart. You'll need to update the Pub/Sub subscription each time.

---

### Step 2: Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select/create your project
3. Enable APIs:
   - Go to **APIs & Services > Enable APIs**
   - Enable **Cloud Pub/Sub API** (Gmail API should already be enabled)

---

### Step 3: Create Pub/Sub Topic & Subscription

**Create Topic:**
1. Go to **Pub/Sub > Topics**
2. Click **Create Topic**
3. Topic ID: `claimchase-gmail-dev`
4. Click **Create**

**Grant Gmail Permission:**
1. Click on your topic
2. Go to **Permissions** tab
3. Click **Add Principal**
4. Principal: `gmail-api-push@system.gserviceaccount.com`
5. Role: `Pub/Sub Publisher`
6. Save

**Create Subscription:**
1. Click **Create Subscription**
2. Subscription ID: `claimchase-gmail-dev-sub`
3. Delivery type: **Push**
4. Endpoint URL: `https://YOUR-NGROK-URL/webhooks/gmail/`
   
   Example: `https://abc123.ngrok-free.app/webhooks/gmail/`
   
5. Click **Create**

---

### Step 4: Update Your .env File

```env
# Add this to backend/.env
GMAIL_PUBSUB_TOPIC=projects/YOUR-PROJECT-ID/topics/claimchase-gmail-dev
```

Find your project ID in Google Cloud Console (top-left dropdown).

---

### Step 5: Test It!

1. Start your Django server: `python manage.py runserver`
2. Make sure ngrok is running
3. Connect Gmail in your app (Settings page)
4. Send a test email TO your connected Gmail from another account
5. Check Django logs for webhook activity

---

## Development Workflow

Every time you start developing:

```bash
# Terminal 1: Start ngrok
ngrok http 8000

# Terminal 2: Start Django
cd backend
.\venv\Scripts\activate
python manage.py runserver

# Terminal 3: Start Frontend
cd frontend  
npm run dev
```

**When ngrok URL changes**, update the Pub/Sub subscription:
1. Go to Pub/Sub > Subscriptions
2. Click on your subscription
3. Click **Edit**
4. Update the Endpoint URL with new ngrok URL
5. Save

---

## 💡 Pro Tip: Use ngrok with Fixed Domain (Free)

To avoid updating the subscription URL every time:

1. Sign up for free ngrok account at https://ngrok.com
2. Get your auth token from dashboard
3. Run: `ngrok config add-authtoken YOUR_TOKEN`
4. Start with: `ngrok http 8000 --domain=your-name.ngrok-free.app`

Now your URL stays the same across restarts!

---

## Email Notifications (Development)

For development, you can use **console email backend** to see emails in terminal:

Add to `settings/base.py` or `settings/development.py`:
```python
# Print emails to console instead of sending
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
```

Or use [Mailtrap](https://mailtrap.io) for a free email testing inbox.

---

## How It Works

### When User Connects Gmail:
```
User clicks "Connect Gmail"
    → OAuth flow completes
    → Backend calls gmail.users().watch()
    → Gmail starts watching user's inbox
    → Watch expires in 7 days (needs renewal)
```

### When Reply is Received:
```
Insurance company sends reply to user's Gmail
    → Gmail detects new email in INBOX
    → Gmail publishes to Pub/Sub topic
    → Pub/Sub pushes to /webhooks/gmail/
    → Webhook fetches email via Gmail API
    → Matches email to case by thread_id
    → Creates EmailTracking record
    → Updates case status to "under_review"
    → Sends notification email to user
```

---

## Troubleshooting

### "Watch failed: 403 Forbidden"
- Ensure `gmail-api-push@system.gserviceaccount.com` has **Pub/Sub Publisher** role on your topic

### "Webhook not receiving notifications"
1. Check ngrok is running and URL is correct
2. Verify Pub/Sub subscription endpoint URL (include trailing slash!)
3. Go to Pub/Sub > Subscriptions > your subscription > **Messages** tab
4. Check for unacknowledged messages

### "History ID expired"
- Normal if no notifications for >7 days
- System auto-resets the history ID

### Check Django Logs
```bash
# Windows PowerShell - watch for gmail-related logs
Get-Content logs\django.log -Wait | Select-String -Pattern "gmail|webhook|pubsub"
```

---

## Files Created/Modified

| File | Purpose |
|------|---------|
| `apps/users/models.py` | Added `gmail_watch_expiration`, `gmail_history_id` fields |
| `apps/grievance_core/gmail_service.py` | Added `GmailWatchService` class |
| `apps/grievance_core/webhooks.py` | Webhook handler and notification logic |
| `apps/users/views.py` | Updated Gmail connect/disconnect to manage watch |
| `settings/base.py` | Added `GMAIL_PUBSUB_TOPIC` setting |
| `urls.py` | Added `/webhooks/gmail/` endpoint |

---

## Cost

**$0** - Everything uses free tiers:
- Pub/Sub: 10GB/month free
- Gmail API: Essentially unlimited for dev
- ngrok: Free tier works fine

---

## When You Deploy to Production

1. Update `GMAIL_PUBSUB_TOPIC` in production `.env`
2. Update Pub/Sub subscription endpoint to production URL
3. Set up a cron job or scheduled task to run `python manage.py renew_gmail_watches` daily

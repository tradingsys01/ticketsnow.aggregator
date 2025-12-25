# Gmail API Setup Guide

Send cron sync reports directly from **gshoihet@gmail.com** using Gmail API.

## Why Gmail API?

✅ **Free**: Unlimited emails (within Gmail's sending limits)
✅ **No third-party**: Send directly from your Gmail account
✅ **Reliable**: Uses Google's infrastructure
✅ **Simple**: Once configured, works perfectly

## Setup Steps (One-Time)

### Step 1: Create Google Cloud Project

1. Go to https://console.cloud.google.com
2. Click "Select a project" → "New Project"
3. Name: `kids-ticketsnow-email`
4. Click "Create"

### Step 2: Enable Gmail API

1. In your project, go to **APIs & Services** → **Library**
2. Search for "Gmail API"
3. Click "Gmail API" → Click "Enable"

### Step 3: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
3. If prompted to configure OAuth consent screen:
   - User Type: **External**
   - App name: `Kids TicketsNow Email`
   - User support email: `gshoihet@gmail.com`
   - Developer contact: `gshoihet@gmail.com`
   - Click "Save and Continue"
   - Scopes: Click "Add or Remove Scopes"
     - Search and add: `https://www.googleapis.com/auth/gmail.send`
   - Click "Save and Continue"
   - Test users: Add `gshoihet@gmail.com`
   - Click "Save and Continue"
4. Back to Credentials → Create OAuth client ID:
   - Application type: **Web application**
   - Name: `Kids TicketsNow Email Client`
   - Authorized redirect URIs: `https://developers.google.com/oauthplayground`
   - Click "Create"
5. **SAVE** the Client ID and Client Secret shown

### Step 4: Get Refresh Token

1. Go to https://developers.google.com/oauthplayground
2. Click the ⚙️ (settings) icon in top-right
3. Check ✅ "Use your own OAuth credentials"
4. Enter:
   - **OAuth Client ID**: (from Step 3)
   - **OAuth Client secret**: (from Step 3)
5. Close settings
6. In left panel "Step 1", find **Gmail API v1**
7. Select: `https://www.googleapis.com/auth/gmail.send`
8. Click **"Authorize APIs"**
9. Sign in with **gshoihet@gmail.com**
10. Click "Allow" to grant permissions
11. In "Step 2", click **"Exchange authorization code for tokens"**
12. **SAVE** the "Refresh token" shown

### Step 5: Add to Root Crontab

SSH to production server:

```bash
ssh prdr
sudo su -
crontab -e
```

Add these environment variables at the top:

```bash
# Gmail API credentials for kids.ticketsnow.co.il email reports
EMAIL_PROVIDER=gmail
EMAIL_FROM=gshoihet@gmail.com
EMAIL_TO=gshoihet@gmail.com
GMAIL_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your-client-secret-here
GMAIL_REFRESH_TOKEN=your-refresh-token-here
```

### Step 6: Test Email Sending

Test manually:

```bash
ssh prdr

# Test the sync with email
sudo SITE_URL=https://kids.ticketsnow.co.il \
  CRON_SECRET=your-cron-secret \
  EMAIL_PROVIDER=gmail \
  EMAIL_FROM=gshoihet@gmail.com \
  EMAIL_TO=gshoihet@gmail.com \
  GMAIL_CLIENT_ID=your-client-id \
  GMAIL_CLIENT_SECRET=your-client-secret \
  GMAIL_REFRESH_TOKEN=your-refresh-token \
  /home/appuser/apps/kids.ticketsnow.co.il/scripts/cron-sync-events.sh
```

Check **gshoihet@gmail.com** inbox for the email report.

## Complete Crontab Example

```bash
# kids.ticketsnow.co.il - Comprehensive Daily Sync + Gmail Reports
SITE_URL=https://kids.ticketsnow.co.il
CRON_SECRET=your-production-secret
LOG_DIR=/home/appuser/apps/kids.ticketsnow.co.il/logs

# Gmail API credentials
EMAIL_PROVIDER=gmail
EMAIL_FROM=gshoihet@gmail.com
EMAIL_TO=gshoihet@gmail.com
GMAIL_CLIENT_ID=123456789.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=GOCSPX-your-secret
GMAIL_REFRESH_TOKEN=1//your-refresh-token

SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

# Daily comprehensive sync at 02:00 UTC
0 2 * * * /home/appuser/apps/kids.ticketsnow.co.il/scripts/cron-sync-events.sh >> /home/appuser/apps/kids.ticketsnow.co.il/logs/cron.log 2>&1

# Weekly log cleanup
0 3 * * 0 find /home/appuser/apps/kids.ticketsnow.co.il/logs -name "cron-sync-*.log" -mtime +30 -delete >> /home/appuser/apps/kids.ticketsnow.co.il/logs/cleanup.log 2>&1
```

## What You'll Receive

**From:** gshoihet@gmail.com
**To:** gshoihet@gmail.com
**Subject:** ✅ סנכרון יומי הושלם בהצלחה - DD/MM/YYYY

Beautiful HTML email with:
- 📊 Summary statistics (events, competitors, videos, comments)
- 🆕 New events list with direct links
- 🎯 Top competitor matches with scores
- 🎬 New YouTube videos discovered
- ⭐ Top comments by likes
- 🌐 RTL Hebrew layout, mobile-responsive

## Troubleshooting

### Email Not Sent

**Check logs:**
```bash
tail -100 /home/appuser/apps/kids.ticketsnow.co.il/logs/cron-sync-$(date +%Y%m%d).log | grep -i email
```

**Common issues:**

1. **"Gmail OAuth2 credentials not configured"**
   - Verify all 3 variables are set in root crontab:
     - `GMAIL_CLIENT_ID`
     - `GMAIL_CLIENT_SECRET`
     - `GMAIL_REFRESH_TOKEN`
   - Check: `sudo crontab -l | grep GMAIL`

2. **"Invalid credentials" or "Token expired"**
   - Refresh token might be invalid
   - Go back to OAuth Playground (Step 4) and get new token
   - Update `GMAIL_REFRESH_TOKEN` in crontab

3. **"Insufficient permissions"**
   - Ensure Gmail API is enabled in Google Cloud Console
   - Verify scope includes `https://www.googleapis.com/auth/gmail.send`
   - Check OAuth consent screen has `gshoihet@gmail.com` as test user

4. **"Daily sending limit exceeded"**
   - Gmail free accounts: 500 emails/day
   - Our usage: 1 email/day (well within limit)
   - If hit limit, wait 24 hours

5. **Email in Spam**
   - Gmail should NOT mark its own emails as spam
   - If it does, mark as "Not Spam"
   - Add a filter to never send to spam

### Verify Environment Variables

```bash
ssh prdr
sudo su -

# Check if variables are set
echo $GMAIL_CLIENT_ID
echo $GMAIL_CLIENT_SECRET
echo $GMAIL_REFRESH_TOKEN

# Should output your actual values
```

### Test Gmail API Directly

Test the Gmail API without the full sync:

```bash
# Install googleapis if not already installed
cd /home/appuser/apps/kids.ticketsnow.co.il
npm list googleapis || npm install googleapis

# Create test script
cat > test-gmail.js << 'EOF'
const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  'https://developers.google.com/oauthplayground'
);

oauth2Client.setCredentials({
  refresh_token: process.env.GMAIL_REFRESH_TOKEN
});

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

const message = [
  'From: gshoihet@gmail.com',
  'To: gshoihet@gmail.com',
  'Subject: Test from Gmail API',
  '',
  'This is a test email from Gmail API.'
].join('\n');

const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');

gmail.users.messages.send({
  userId: 'me',
  requestBody: { raw: encodedMessage }
}).then(res => {
  console.log('✅ Email sent! Message ID:', res.data.id);
}).catch(err => {
  console.error('❌ Error:', err.message);
});
EOF

# Run test
GMAIL_CLIENT_ID=your-id \
GMAIL_CLIENT_SECRET=your-secret \
GMAIL_REFRESH_TOKEN=your-token \
node test-gmail.js
```

## Security Notes

✅ **Credentials in root crontab only**
- Not in application .env
- Not committed to git
- Only accessible by root user

✅ **OAuth2 scope limited**
- Only `gmail.send` permission
- Cannot read emails
- Cannot access other Gmail data

✅ **Refresh token**
- Long-lived (doesn't expire unless revoked)
- Can be revoked in Google Account settings
- Automatically refreshes access tokens

## Revoke Access (If Needed)

If you need to revoke access:

1. Go to https://myaccount.google.com/permissions
2. Find "Kids TicketsNow Email"
3. Click "Remove Access"
4. Get new credentials if you want to re-enable

## Gmail Sending Limits

**Free Gmail Account:**
- 500 emails/day
- 100 recipients per email

**Our Usage:**
- 1 email/day to 1 recipient
- Well within limits ✅

## Cost

**FREE** ✅
- No additional cost
- Uses existing Gmail account
- No third-party service fees

## Support

**Google Cloud Console:**
https://console.cloud.google.com

**Gmail API Documentation:**
https://developers.google.com/gmail/api

**OAuth 2.0 Playground:**
https://developers.google.com/oauthplayground

**Issues?**
Check logs: `/home/appuser/apps/kids.ticketsnow.co.il/logs/cron-sync-*.log`

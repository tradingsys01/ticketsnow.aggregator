# Email Reporting Setup Guide

The cron sync sends detailed HTML email reports after each daily run to **gshoihet@gmail.com**.

## Email Report Contents

**Every Day at 02:00 UTC**, you'll receive an email with:

✅ **Summary Stats**
- Total events, new/updated/removed counts
- Competitor search results and quota usage
- YouTube videos found
- Comments pulled

📋 **Detailed Lists**
- New events added (with links)
- Top competitor matches (with match scores)
- New YouTube videos discovered
- Top comments by likes

📊 **Visual Cards**
- Color-coded status badges
- RTL Hebrew layout
- Mobile-responsive design

## Supported Email Providers

Choose ONE of these providers:

### Option 1: Resend (Recommended)

**Why Resend?**
- Free tier: 100 emails/day, 3,000/month
- Simple API, no credit card required
- Modern, developer-friendly

**Setup:**
1. Sign up at https://resend.com
2. Get API key from dashboard
3. Verify domain (or use resend.dev for testing)

**Environment Variables:**
```bash
EMAIL_PROVIDER=resend
EMAIL_API_KEY=re_...your-key...
EMAIL_FROM=noreply@kids.ticketsnow.co.il
EMAIL_TO=gshoihet@gmail.com
```

### Option 2: SendGrid

**Why SendGrid?**
- Free tier: 100 emails/day
- Established, reliable service
- Good deliverability

**Setup:**
1. Sign up at https://sendgrid.com
2. Create API key (Settings > API Keys)
3. Verify sender email

**Environment Variables:**
```bash
EMAIL_PROVIDER=sendgrid
EMAIL_API_KEY=SG.your-key-here
EMAIL_FROM=noreply@kids.ticketsnow.co.il
EMAIL_TO=gshoihet@gmail.com
```

### Option 3: Mailgun

**Why Mailgun?**
- Free tier: 100 emails/day for 3 months
- Good for transactional emails

**Setup:**
1. Sign up at https://mailgun.com
2. Get API key from Settings
3. Add authorized recipient (gshoihet@gmail.com)

**Environment Variables:**
```bash
EMAIL_PROVIDER=mailgun
EMAIL_API_KEY=your-mailgun-api-key
MAILGUN_DOMAIN=kids.ticketsnow.co.il
EMAIL_FROM=noreply@kids.ticketsnow.co.il
EMAIL_TO=gshoihet@gmail.com
```

## Installation Steps

### 1. Choose Email Provider

Pick one from above (Resend recommended).

### 2. Get API Key

Follow provider's setup instructions to get your API key.

### 3. Add to Production .env

SSH to production and edit the .env file:

```bash
ssh prdr
nano /home/appuser/apps/kids.ticketsnow.co.il/.env
```

Add these lines:
```
EMAIL_PROVIDER=resend
EMAIL_API_KEY=re_your_key_here
EMAIL_FROM=noreply@kids.ticketsnow.co.il
EMAIL_TO=gshoihet@gmail.com
```

### 4. Add to Root Crontab

**IMPORTANT:** The user mentioned email secret should be defined in **root crontab**.

```bash
ssh prdr
sudo su -
crontab -e
```

Add these environment variables at the TOP of the crontab:
```bash
# Email reporting for kids.ticketsnow.co.il
EMAIL_API_KEY=re_your_key_here
EMAIL_PROVIDER=resend
EMAIL_FROM=noreply@kids.ticketsnow.co.il
EMAIL_TO=gshoihet@gmail.com
```

### 5. Test Email Sending

Test manually to verify email works:

```bash
# Test via curl (replace with your API key)
curl -X GET \
  -H "Authorization: Bearer your-cron-secret" \
  https://kids.ticketsnow.co.il/api/cron/daily-sync
```

Check gshoihet@gmail.com inbox for the email report.

## Email Report Example

**Subject:** ✅ סנכרון יומי הושלם בהצלחה - 24/12/2025

**Content includes:**
```
┌─────────────────────────────────────┐
│ ✅ דוח סנכרון יומי                  │
│ kids.ticketsnow.co.il              │
│ 2025-12-24T02:00:00Z               │
└─────────────────────────────────────┘

📊 Summary Cards:
┌──────────┬──────────┬──────────┬──────────┐
│ 📅 Events│ 🔍 Comps │ 🎥 Videos│ 💬 Cmnts │
│    145   │    25    │    142   │    523   │
│ +12 new  │ 100 qry  │ 47 evnts │ 89 vids  │
└──────────┴──────────┴──────────┴──────────┘

🆕 New Events:
• הופעת ילדים מרתקת - 2025-01-15
  https://kids.ticketsnow.co.il/event/...

🎯 Top Competitor Matches:
• Event Name → Ticketmaster (95% match)

🎬 New Videos:
• Video Title - @ticketsnowcoil

⭐ Top Comments:
• User: "Great show!" (👍 45)
```

## Troubleshooting

### Email Not Received

1. **Check Logs:**
   ```bash
   tail -100 /home/appuser/apps/kids.ticketsnow.co.il/logs/cron-sync-$(date +%Y%m%d).log
   grep "email" /home/appuser/apps/kids.ticketsnow.co.il/logs/cron.log
   ```

2. **Verify Environment Variables:**
   ```bash
   # Check if env vars are set in cron
   sudo crontab -l | grep EMAIL

   # Test from app
   ssh prdr
   cd /home/appuser/apps/kids.ticketsnow.co.il
   echo $EMAIL_API_KEY  # Should show your key
   ```

3. **Check Spam Folder:**
   - Email might be in spam/junk
   - Add noreply@kids.ticketsnow.co.il to contacts

4. **Verify API Key:**
   ```bash
   # Test API key directly with curl
   # For Resend:
   curl -X POST https://api.resend.com/emails \
     -H "Authorization: Bearer $EMAIL_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"from":"noreply@kids.ticketsnow.co.il","to":["gshoihet@gmail.com"],"subject":"Test","html":"<p>Test</p>"}'
   ```

### Email Fails But Sync Succeeds

This is by design! Email failures don't fail the sync. Check logs:

```bash
grep "Failed to send email" /home/appuser/apps/kids.ticketsnow.co.il/logs/cron.log
```

Common causes:
- Invalid API key
- Rate limit exceeded
- Network issues
- Invalid from/to addresses

### Wrong Email Provider

If you configured the wrong provider:

```bash
# Update in .env
nano /home/appuser/apps/kids.ticketsnow.co.il/.env

# And in root crontab
sudo crontab -e
```

## Disable Email Reports

To disable email reports without changing code:

```bash
# In .env or crontab, remove or comment out:
# EMAIL_API_KEY=...

# Or set to empty:
EMAIL_API_KEY=
```

The service will log: `EMAIL_API_KEY not configured, skipping email report`

## Cost Estimates

All providers have free tiers sufficient for 1 email/day:

| Provider | Free Tier | Cost After |
|----------|-----------|------------|
| Resend | 3,000/month | $20/month for 50k |
| SendGrid | 100/day | $19.95/month for 40k |
| Mailgun | 100/day (3mo) | $35/month for 50k |

**Our usage:** 1 email/day = 30/month = **FREE** on all providers

## Change Email Recipient

To send to a different email:

1. Update in .env:
   ```
   EMAIL_TO=newemail@example.com
   ```

2. Update in root crontab:
   ```bash
   sudo crontab -e
   # Change EMAIL_TO=...
   ```

3. Verify in provider settings recipient is authorized (some providers require this).

## Multiple Recipients

To send to multiple emails:

Edit `src/services/email.service.ts`:
```typescript
const EMAIL_TO = process.env.EMAIL_TO || 'gshoihet@gmail.com,other@example.com'

// Then in sendViaResend:
to: EMAIL_TO.split(',').map(e => e.trim())
```

## Email Report Schedule

Currently: **Daily at 02:00 UTC**

To change schedule, edit crontab:
```bash
# Current (02:00 UTC):
0 2 * * *

# Examples:
0 1 * * *    # 01:00 UTC
0 */6 * * *  # Every 6 hours
0 2 * * 1    # Monday only at 02:00
```

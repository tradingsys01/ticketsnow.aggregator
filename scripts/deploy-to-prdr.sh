#!/bin/bash
# Complete deployment script for kids.ticketsnow.co.il cron jobs
# This script will deploy scripts to prdr and help configure crontab

set -e

SSH_HOST="prdr"
REMOTE_APP_DIR="/home/appuser/apps/kids.ticketsnow.co.il"
REMOTE_SCRIPTS_DIR="$REMOTE_APP_DIR/scripts"
LOCAL_SCRIPTS_DIR="./scripts"

echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║           DEPLOYING CRON JOBS TO PRDR - kids.ticketsnow.co.il               ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo ""

# Step 1: Test SSH connection
echo "Step 1: Testing SSH connection to $SSH_HOST..."
if ! ssh -o ConnectTimeout=5 "$SSH_HOST" "echo 'SSH connection successful'" > /dev/null 2>&1; then
  echo "❌ Cannot connect to $SSH_HOST"
  echo "   Please check SSH configuration: ssh $SSH_HOST"
  exit 1
fi
echo "✅ SSH connection successful"
echo ""

# Step 2: Create remote directories
echo "Step 2: Creating remote directories..."
ssh "$SSH_HOST" "mkdir -p $REMOTE_SCRIPTS_DIR $REMOTE_APP_DIR/logs"
echo "✅ Directories created"
echo ""

# Step 3: Deploy cron script
echo "Step 3: Deploying cron-sync-events.sh..."
scp "$LOCAL_SCRIPTS_DIR/cron-sync-events.sh" "$SSH_HOST:$REMOTE_SCRIPTS_DIR/cron-sync-events.sh"
ssh "$SSH_HOST" "chmod +x $REMOTE_SCRIPTS_DIR/cron-sync-events.sh"
echo "✅ Cron script deployed"
echo ""

# Step 4: Copy crontab template
echo "Step 4: Copying crontab template..."
scp "$LOCAL_SCRIPTS_DIR/crontab-production.txt" "$SSH_HOST:/tmp/crontab-kids-ticketsnow.txt"
echo "✅ Crontab template copied to /tmp/crontab-kids-ticketsnow.txt"
echo ""

# Step 5: Get CRON_SECRET from production
echo "Step 5: Fetching CRON_SECRET from production..."
CRON_SECRET=$(ssh "$SSH_HOST" "cat $REMOTE_APP_DIR/.env 2>/dev/null | grep '^CRON_SECRET=' | cut -d'=' -f2-" 2>/dev/null || echo "")

if [ -z "$CRON_SECRET" ]; then
  echo "⚠️  Could not automatically fetch CRON_SECRET"
  echo "   You'll need to get it manually from: $REMOTE_APP_DIR/.env"
else
  echo "✅ Found CRON_SECRET: ${CRON_SECRET:0:20}..."
fi
echo ""

# Step 6: Instructions for Gmail API setup
echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║                    GMAIL API CREDENTIALS REQUIRED                            ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo ""
echo "You need to set up Gmail API credentials (one-time, ~10 minutes):"
echo ""
echo "1. Go to: https://console.cloud.google.com"
echo "2. Create project: 'kids-ticketsnow-email'"
echo "3. Enable Gmail API"
echo "4. Create OAuth 2.0 credentials (Web application)"
echo "5. Get refresh token from: https://developers.google.com/oauthplayground"
echo ""
echo "📖 Detailed guide: GMAIL_API_SETUP.md"
echo ""
read -p "Have you obtained Gmail API credentials? (y/n): " HAS_GMAIL_CREDS
echo ""

if [ "$HAS_GMAIL_CREDS" != "y" ]; then
  echo "⚠️  Please get Gmail API credentials first, then run this script again."
  echo ""
  echo "Quick guide:"
  echo "  1. Read GMAIL_API_SETUP.md"
  echo "  2. Get Client ID, Client Secret, and Refresh Token"
  echo "  3. Run this script again"
  exit 0
fi

# Collect Gmail credentials
echo "Enter your Gmail API credentials:"
echo ""
read -p "GMAIL_CLIENT_ID: " GMAIL_CLIENT_ID
read -p "GMAIL_CLIENT_SECRET: " GMAIL_CLIENT_SECRET
read -p "GMAIL_REFRESH_TOKEN: " GMAIL_REFRESH_TOKEN
echo ""

# Validate inputs
if [ -z "$GMAIL_CLIENT_ID" ] || [ -z "$GMAIL_CLIENT_SECRET" ] || [ -z "$GMAIL_REFRESH_TOKEN" ]; then
  echo "❌ All Gmail credentials are required!"
  exit 1
fi

# Step 7: Create configured crontab entries
echo "Step 7: Creating crontab entries..."

CRONTAB_ENTRIES="
# kids.ticketsnow.co.il - Comprehensive Daily Sync + Gmail Reports
# Added: $(date +%Y-%m-%d)
SITE_URL=https://kids.ticketsnow.co.il
CRON_SECRET=${CRON_SECRET:-REPLACE_WITH_PRODUCTION_SECRET}
LOG_DIR=$REMOTE_APP_DIR/logs

# Gmail API credentials
EMAIL_PROVIDER=gmail
EMAIL_FROM=gshoihet@gmail.com
EMAIL_TO=gshoihet@gmail.com
GMAIL_CLIENT_ID=$GMAIL_CLIENT_ID
GMAIL_CLIENT_SECRET=$GMAIL_CLIENT_SECRET
GMAIL_REFRESH_TOKEN=$GMAIL_REFRESH_TOKEN

SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

# Daily comprehensive sync at 02:00 UTC
0 2 * * * $REMOTE_SCRIPTS_DIR/cron-sync-events.sh >> $REMOTE_APP_DIR/logs/cron.log 2>&1

# Weekly log cleanup
0 3 * * 0 find $REMOTE_APP_DIR/logs -name \"cron-sync-*.log\" -mtime +30 -delete >> $REMOTE_APP_DIR/logs/cleanup.log 2>&1
"

echo "$CRONTAB_ENTRIES" > /tmp/crontab-entries-kids.txt
echo "✅ Crontab entries prepared"
echo ""

# Step 8: Show what will be added
echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║                    CRONTAB ENTRIES TO BE ADDED                               ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo ""
cat /tmp/crontab-entries-kids.txt
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
read -p "Add these entries to ROOT crontab on $SSH_HOST? (y/n): " CONFIRM
echo ""

if [ "$CONFIRM" != "y" ]; then
  echo "⚠️  Deployment cancelled."
  echo ""
  echo "Entries saved to: /tmp/crontab-entries-kids.txt"
  echo "You can manually add them later with:"
  echo "  ssh $SSH_HOST"
  echo "  sudo su -"
  echo "  crontab -e"
  exit 0
fi

# Step 9: Backup existing crontab and add entries
echo "Step 9: Updating root crontab on $SSH_HOST..."
echo ""

ssh -t "$SSH_HOST" "sudo bash -c '
  # Backup existing crontab
  crontab -l > /tmp/crontab-backup-\$(date +%Y%m%d-%H%M%S).txt 2>/dev/null || true

  # Get existing crontab
  crontab -l 2>/dev/null > /tmp/crontab-merged.txt || touch /tmp/crontab-merged.txt

  # Add new entries
  cat >> /tmp/crontab-merged.txt << \"CRONTAB_EOF\"
$CRONTAB_ENTRIES
CRONTAB_EOF

  # Install merged crontab
  crontab /tmp/crontab-merged.txt

  echo \"\"
  echo \"✅ Crontab updated successfully\"
  echo \"\"
  echo \"Verifying installation:\"
  crontab -l | grep -A 15 kids.ticketsnow
'"

echo ""
echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║                         DEPLOYMENT COMPLETE! ✅                              ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo ""
echo "📊 What's been deployed:"
echo "   ✅ Cron script: $REMOTE_SCRIPTS_DIR/cron-sync-events.sh"
echo "   ✅ Root crontab configured with:"
echo "      • Daily sync at 02:00 UTC"
echo "      • Weekly log cleanup"
echo "      • Gmail email reporting"
echo ""
echo "📧 Email reports will be sent to: gshoihet@gmail.com"
echo ""
echo "🧪 Test the setup:"
echo "   ssh $SSH_HOST"
echo "   sudo SITE_URL=https://kids.ticketsnow.co.il \\"
echo "     CRON_SECRET=$CRON_SECRET \\"
echo "     EMAIL_PROVIDER=gmail \\"
echo "     EMAIL_FROM=gshoihet@gmail.com \\"
echo "     EMAIL_TO=gshoihet@gmail.com \\"
echo "     GMAIL_CLIENT_ID='$GMAIL_CLIENT_ID' \\"
echo "     GMAIL_CLIENT_SECRET='$GMAIL_CLIENT_SECRET' \\"
echo "     GMAIL_REFRESH_TOKEN='$GMAIL_REFRESH_TOKEN' \\"
echo "     $REMOTE_SCRIPTS_DIR/cron-sync-events.sh"
echo ""
echo "📝 Monitor logs:"
echo "   ssh $SSH_HOST"
echo "   tail -f $REMOTE_APP_DIR/logs/cron-sync-\$(date +%Y%m%d).log"
echo ""
echo "⏰ Next automated run: Tomorrow at 02:00 UTC"
echo ""

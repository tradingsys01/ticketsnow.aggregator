#!/bin/bash
# Helper script to get CRON_SECRET from production server
# Usage: ./scripts/get-cron-secret.sh [ssh-host]

SSH_HOST="${1:-prdr}"
APP_DIR="/home/appuser/apps/kids.ticketsnow.co.il"

echo "🔑 Fetching CRON_SECRET from $SSH_HOST..."
echo ""

# Get CRON_SECRET from production .env
CRON_SECRET=$(ssh "$SSH_HOST" "cat $APP_DIR/.env 2>/dev/null | grep '^CRON_SECRET=' | cut -d'=' -f2-" 2>/dev/null)

if [ -z "$CRON_SECRET" ]; then
  echo "❌ Could not find CRON_SECRET on $SSH_HOST"
  echo ""
  echo "Tried: $APP_DIR/.env"
  echo ""
  echo "Please check:"
  echo "  1. SSH connection: ssh $SSH_HOST"
  echo "  2. File exists: cat $APP_DIR/.env"
  echo "  3. CRON_SECRET is defined in .env"
  exit 1
fi

echo "✅ Found CRON_SECRET on $SSH_HOST"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "CRON_SECRET=$CRON_SECRET"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 Use this in your root crontab:"
echo "   sudo su -"
echo "   crontab -e"
echo ""
echo "   Then add:"
echo "   CRON_SECRET=$CRON_SECRET"
echo ""

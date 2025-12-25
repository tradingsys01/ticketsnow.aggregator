#!/bin/bash
# Deploy cron jobs to production server
# Usage: ./scripts/deploy-cron.sh [ssh-host]

set -e

# Configuration
SSH_HOST="${1:-prdr}"
REMOTE_APP_DIR="/home/appuser/apps/kids.ticketsnow.co.il"
REMOTE_SCRIPTS_DIR="$REMOTE_APP_DIR/scripts"
LOCAL_SCRIPTS_DIR="./scripts"

echo "Deploying cron jobs to $SSH_HOST..."

# Create remote directories
ssh "$SSH_HOST" "mkdir -p $REMOTE_SCRIPTS_DIR $REMOTE_APP_DIR/logs"

# Copy cron script
echo "Copying cron-sync-events.sh..."
scp "$LOCAL_SCRIPTS_DIR/cron-sync-events.sh" "$SSH_HOST:$REMOTE_SCRIPTS_DIR/cron-sync-events.sh"
ssh "$SSH_HOST" "chmod +x $REMOTE_SCRIPTS_DIR/cron-sync-events.sh"

# Copy crontab template
echo "Copying crontab template..."
scp "$LOCAL_SCRIPTS_DIR/crontab-production.txt" "$SSH_HOST:/tmp/crontab-production.txt"

echo ""
echo "✓ Cron scripts deployed to $REMOTE_SCRIPTS_DIR"
echo ""
echo "Next steps:"
echo "1. SSH to production: ssh $SSH_HOST"
echo "2. Edit crontab template: nano /tmp/crontab-production.txt"
echo "   - Replace CRON_SECRET with actual production secret"
echo "   - Adjust paths if needed (current: $REMOTE_APP_DIR)"
echo "3. Install crontab: crontab /tmp/crontab-production.txt"
echo "4. Verify: crontab -l"
echo ""
echo "Manual test command:"
echo "  SITE_URL=https://kids.ticketsnow.co.il CRON_SECRET=your-secret $REMOTE_SCRIPTS_DIR/cron-sync-events.sh"
echo ""

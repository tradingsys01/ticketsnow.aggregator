#!/bin/bash
# SSL Certificate Expiration Monitor
# Checks all Let's Encrypt certificates and alerts if expiring soon
# Usage: ./check-ssl-expiry.sh [warning_days]

set -e

# Configuration
WARNING_DAYS="${1:-14}"  # Default: warn if expiring within 14 days
CRITICAL_DAYS=7          # Critical if expiring within 7 days
LOG_FILE="/var/log/ssl-expiry-check.log"

# Email settings (optional - set these for email alerts)
EMAIL_TO="${EMAIL_TO:-}"
EMAIL_FROM="${EMAIL_FROM:-ssl-monitor@$(hostname)}"

# Colors for terminal output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Get current timestamp
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "=============================================="
echo "SSL Certificate Expiration Check"
echo "Date: $TIMESTAMP"
echo "Warning threshold: $WARNING_DAYS days"
echo "Critical threshold: $CRITICAL_DAYS days"
echo "=============================================="
echo ""

# Arrays to track status
declare -a EXPIRED_CERTS
declare -a CRITICAL_CERTS
declare -a WARNING_CERTS
declare -a VALID_CERTS

# Function to check a certificate
check_cert() {
    local cert_name="$1"
    local cert_path="/etc/letsencrypt/live/$cert_name/fullchain.pem"

    if [ ! -f "$cert_path" ]; then
        echo -e "${RED}[ERROR]${NC} Certificate not found: $cert_name"
        return
    fi

    # Get expiry date
    expiry_date=$(openssl x509 -enddate -noout -in "$cert_path" 2>/dev/null | cut -d= -f2)
    expiry_epoch=$(date -d "$expiry_date" +%s 2>/dev/null)
    current_epoch=$(date +%s)

    # Calculate days until expiry
    days_left=$(( (expiry_epoch - current_epoch) / 86400 ))

    # Get domains covered by cert
    domains=$(openssl x509 -in "$cert_path" -noout -text 2>/dev/null | grep -A1 "Subject Alternative Name" | tail -1 | sed 's/DNS://g' | tr ',' '\n' | tr -d ' ')

    # Determine status
    if [ $days_left -lt 0 ]; then
        echo -e "${RED}[EXPIRED]${NC} $cert_name - Expired $((-days_left)) days ago"
        EXPIRED_CERTS+=("$cert_name (expired $((-days_left)) days ago)")
    elif [ $days_left -le $CRITICAL_DAYS ]; then
        echo -e "${RED}[CRITICAL]${NC} $cert_name - Expires in $days_left days ($expiry_date)"
        CRITICAL_CERTS+=("$cert_name ($days_left days)")
    elif [ $days_left -le $WARNING_DAYS ]; then
        echo -e "${YELLOW}[WARNING]${NC} $cert_name - Expires in $days_left days ($expiry_date)"
        WARNING_CERTS+=("$cert_name ($days_left days)")
    else
        echo -e "${GREEN}[OK]${NC} $cert_name - Expires in $days_left days ($expiry_date)"
        VALID_CERTS+=("$cert_name ($days_left days)")
    fi
}

# Get all certificates
cert_names=$(ls /etc/letsencrypt/live/ 2>/dev/null | grep -v README)

if [ -z "$cert_names" ]; then
    echo "No certificates found in /etc/letsencrypt/live/"
    exit 0
fi

# Check each certificate
for cert in $cert_names; do
    check_cert "$cert"
done

echo ""
echo "=============================================="
echo "Summary"
echo "=============================================="
echo -e "${GREEN}Valid:${NC}    ${#VALID_CERTS[@]}"
echo -e "${YELLOW}Warning:${NC}  ${#WARNING_CERTS[@]}"
echo -e "${RED}Critical:${NC} ${#CRITICAL_CERTS[@]}"
echo -e "${RED}Expired:${NC}  ${#EXPIRED_CERTS[@]}"
echo ""

# Build alert message if needed
ALERT_NEEDED=false
ALERT_MSG=""

if [ ${#EXPIRED_CERTS[@]} -gt 0 ]; then
    ALERT_NEEDED=true
    ALERT_MSG+="EXPIRED CERTIFICATES:\n"
    for cert in "${EXPIRED_CERTS[@]}"; do
        ALERT_MSG+="  - $cert\n"
    done
    ALERT_MSG+="\n"
fi

if [ ${#CRITICAL_CERTS[@]} -gt 0 ]; then
    ALERT_NEEDED=true
    ALERT_MSG+="CRITICAL (expiring in <$CRITICAL_DAYS days):\n"
    for cert in "${CRITICAL_CERTS[@]}"; do
        ALERT_MSG+="  - $cert\n"
    done
    ALERT_MSG+="\n"
fi

if [ ${#WARNING_CERTS[@]} -gt 0 ]; then
    ALERT_NEEDED=true
    ALERT_MSG+="WARNING (expiring in <$WARNING_DAYS days):\n"
    for cert in "${WARNING_CERTS[@]}"; do
        ALERT_MSG+="  - $cert\n"
    done
    ALERT_MSG+="\n"
fi

# Send email alert if needed and email is configured
if [ "$ALERT_NEEDED" = true ]; then
    echo "=============================================="
    echo -e "${RED}ACTION REQUIRED${NC}"
    echo "=============================================="
    echo -e "$ALERT_MSG"

    echo "Renewal commands:"
    echo ""
    for cert in "${EXPIRED_CERTS[@]}" "${CRITICAL_CERTS[@]}" "${WARNING_CERTS[@]}"; do
        cert_name=$(echo "$cert" | cut -d' ' -f1)
        echo "sudo certbot certonly --manual --preferred-challenges dns \\"
        echo "  -d '*.$cert_name' -d '$cert_name' --force-renewal"
        echo ""
    done

    # Send email if configured
    if [ -n "$EMAIL_TO" ]; then
        echo -e "Subject: [SSL ALERT] Certificate expiration warning - $(hostname)\n\n$ALERT_MSG\n\nRun: check-ssl-expiry.sh for details" | \
            sendmail -f "$EMAIL_FROM" "$EMAIL_TO" 2>/dev/null || \
            echo "Note: Email sending failed (sendmail not configured)"
    fi

    # Log alert
    echo "[$TIMESTAMP] ALERT: ${#EXPIRED_CERTS[@]} expired, ${#CRITICAL_CERTS[@]} critical, ${#WARNING_CERTS[@]} warning" >> "$LOG_FILE" 2>/dev/null || true

    exit 1
else
    echo -e "${GREEN}All certificates are valid.${NC}"
    echo "[$TIMESTAMP] OK: All certificates valid" >> "$LOG_FILE" 2>/dev/null || true
    exit 0
fi

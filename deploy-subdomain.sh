#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  Lansub MES — Subdomain Deployment Script
#  Deploys mes.lansub.com with SSL on Azure VM
#
#  PREREQUISITES:
#    1. DNS A record: mes.lansub.com → 98.70.44.251
#    2. Azure NSG: Ports 80 and 443 open (inbound)
#    3. Run this script as root or with sudo
#
#  USAGE:
#    chmod +x deploy-subdomain.sh
#    sudo ./deploy-subdomain.sh
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

# ── Configuration ────────────────────────────────────────────
DOMAIN="mes.lansub.com"
EMAIL="admin@lansub.com"           # ← Change to your email
PROJECT_DIR="/opt/lansub-mes"      # ← Change if your project is elsewhere
NGINX_CONF="/etc/nginx/sites-available/${DOMAIN}"
CERTBOT_WEBROOT="/var/www/certbot"

echo "═══════════════════════════════════════════════════"
echo "  Lansub MES — Subdomain Deployment"
echo "  Domain: ${DOMAIN}"
echo "═══════════════════════════════════════════════════"

# ── Step 1: Install Nginx (if not installed) ─────────────────
echo ""
echo "▶ Step 1: Installing Nginx..."
if ! command -v nginx &> /dev/null; then
    apt update && apt install -y nginx
    systemctl enable nginx
    systemctl start nginx
    echo "  ✅ Nginx installed and started"
else
    echo "  ✅ Nginx already installed"
fi

# ── Step 2: Install Certbot (if not installed) ───────────────
echo ""
echo "▶ Step 2: Installing Certbot..."
if ! command -v certbot &> /dev/null; then
    apt update && apt install -y certbot python3-certbot-nginx
    echo "  ✅ Certbot installed"
else
    echo "  ✅ Certbot already installed"
fi

# ── Step 3: Create Certbot webroot directory ─────────────────
echo ""
echo "▶ Step 3: Creating certbot webroot..."
mkdir -p "${CERTBOT_WEBROOT}"
echo "  ✅ Created ${CERTBOT_WEBROOT}"

# ── Step 4: Deploy Nginx config (HTTP only first) ────────────
echo ""
echo "▶ Step 4: Deploying Nginx site config (HTTP only for initial cert)..."

cat > "${NGINX_CONF}" <<'NGINX_HTTP'
# Temporary HTTP-only config for Let's Encrypt certificate generation
server {
    listen 80;
    server_name mes.lansub.com;

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Proxy to frontend while waiting for SSL
    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
NGINX_HTTP

# Enable site and remove default if it conflicts
ln -sf "${NGINX_CONF}" /etc/nginx/sites-enabled/
# Remove default site if it listens on port 80 and conflicts
if [ -f /etc/nginx/sites-enabled/default ]; then
    echo "  ⚠️  Removing default Nginx site to avoid port 80 conflict"
    rm -f /etc/nginx/sites-enabled/default
fi

nginx -t && systemctl reload nginx
echo "  ✅ Nginx HTTP config deployed and reloaded"

# ── Step 5: Obtain SSL Certificate ──────────────────────────
echo ""
echo "▶ Step 5: Obtaining SSL certificate from Let's Encrypt..."
echo "  (DNS A record must be active: ${DOMAIN} → $(curl -s ifconfig.me))"
echo ""

certbot --nginx -d "${DOMAIN}" \
    --non-interactive \
    --agree-tos \
    -m "${EMAIL}" \
    --redirect

echo "  ✅ SSL certificate obtained and Nginx auto-configured by Certbot"

# ── Step 6: Deploy full Nginx config with SSL ────────────────
echo ""
echo "▶ Step 6: Deploying full Nginx config with security headers..."

# Copy the production config (Certbot may have already modified, so we use our hardened version)
cp "${PROJECT_DIR}/nginx-host-proxy/mes.lansub.com.conf" "${NGINX_CONF}"

nginx -t && systemctl reload nginx
echo "  ✅ Full SSL + security headers config deployed"

# ── Step 7: Rebuild and restart Docker containers ────────────
echo ""
echo "▶ Step 7: Rebuilding Docker containers with new URLs..."
cd "${PROJECT_DIR}"

docker compose down
docker compose up --build -d

echo "  ✅ Docker containers rebuilt and started"

# ── Step 8: Verify auto-renewal ──────────────────────────────
echo ""
echo "▶ Step 8: Testing SSL auto-renewal..."
certbot renew --dry-run
echo "  ✅ Auto-renewal is working"

# ── Step 9: Verification ────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════"
echo "  ✅ DEPLOYMENT COMPLETE"
echo "═══════════════════════════════════════════════════"
echo ""
echo "  🌐 Dashboard:    https://${DOMAIN}"
echo "  📡 API Health:   https://${DOMAIN}/api/health"
echo "  📄 API Docs:     https://${DOMAIN}/api/docs"
echo ""
echo "  Verify with:"
echo "    curl -I https://${DOMAIN}"
echo "    curl https://${DOMAIN}/api/health"
echo ""
echo "  ⚠️  Optional: Close ports 3002 and 8002 in Azure NSG"
echo "     (traffic now flows through ports 80/443 only)"
echo "═══════════════════════════════════════════════════"

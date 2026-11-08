#!/bin/bash

set -e

CERTS_DIR=".certs"
LOCAL_HOSTNAME=$(hostname)
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}' || echo "")

echo "🔍 Hostname: $LOCAL_HOSTNAME.local"
echo "🔍 IP: $LOCAL_IP"

if ! command -v mkcert &> /dev/null; then
  echo "📦 Installing mkcert..."
  if command -v brew &> /dev/null; then
    brew install mkcert
  elif command -v apt-get &> /dev/null; then
    sudo apt-get install -y mkcert
  elif command -v choco &> /dev/null; then
    choco install mkcert
  else
    echo "❌ Please install mkcert manually: https://github.com/FiloSottile/mkcert"
    exit 1
  fi
fi

if [ ! -f "$(mkcert -CAROOT)/rootCA.pem" ]; then
  echo "🔐 Installing mkcert root CA..."
  mkcert -install
fi

mkdir -p "$CERTS_DIR"

CERT_DOMAINS="localhost 127.0.0.1 $LOCAL_HOSTNAME.local"
[ -n "$LOCAL_IP" ] && CERT_DOMAINS="$CERT_DOMAINS $LOCAL_IP"

echo "📜 Generating certificates for: $CERT_DOMAINS"
mkcert -key-file "$CERTS_DIR/key.pem" -cert-file "$CERTS_DIR/cert.pem" $CERT_DOMAINS

CA_ROOT=$(mkcert -CAROOT)

echo ""
echo "✅ Setup complete!"
echo ""
echo "📱 Install root CA on your device:"
echo "   iOS: AirDrop rootCA.pem → Install → Settings → General → About → Certificate Trust Settings → Enable"
echo "   Android: Settings → Security → Install certificate from storage"
echo ""
echo "🚀 Run: bun run dev:ios"
echo ""

open "$CA_ROOT"

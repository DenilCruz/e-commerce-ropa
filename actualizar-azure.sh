#!/bin/bash
set -e

AZURE_HOST="20.94.194.153"
KEY_PATH="${KEY_PATH:-$HOME/Downloads/aura_key.pem}"

echo "🚀 Sincronizando cambios con Azure VM ($AZURE_HOST - aura.daches.dev)..."

# Opción de clave SSH si existe
SSH_OPT=""
if [ -f "$KEY_PATH" ]; then
  SSH_OPT="-i $KEY_PATH"
fi

# 1. Enviar archivos modificados excluyendo dependencias pesadas y variables locales .env
rsync -avz -e "ssh $SSH_OPT -o StrictHostKeyChecking=no" \
  --exclude='node_modules' --exclude='dist' --exclude='.turbo' --exclude='.pnpm-store' --exclude='.env' --exclude='apps/mobile/android' --exclude='*.apk' \
  ./ azureuser@$AZURE_HOST:/home/azureuser/e-commerce-ropa/

# 2. Compilar y reiniciar en Azure
ssh $SSH_OPT -o StrictHostKeyChecking=no azureuser@$AZURE_HOST "bash -c '
  set -e
  cd /home/azureuser/e-commerce-ropa
  echo \"🔨 Compilando Backend...\"
  pnpm --filter @ecommerce/api build
  echo \"🔨 Compilando Frontend Web...\"
  pnpm --filter @ecommerce/web build
  echo \"🔄 Recargando API con PM2...\"
  cd apps/api && pm2 restart aura-api --update-env
  echo \"🔄 Recargando Nginx...\"
  sudo systemctl reload nginx
  echo \"✅ ¡Servidor actualizado exitosamente en https://aura.daches.dev!\"
'"

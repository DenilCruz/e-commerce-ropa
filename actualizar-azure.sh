#!/bin/bash
set -e

echo "🚀 Sincronizando cambios con Azure VM (52.233.82.87)..."

# 1. Enviar archivos modificados excluyendo dependencias pesadas y variables locales .env
rsync -avz --exclude='node_modules' --exclude='dist' --exclude='.turbo' --exclude='.pnpm-store' --exclude='.env' --exclude='apps/mobile/android' --exclude='*.apk' \
  ./ azureuser@52.233.82.87:/home/azureuser/e-commerce-ropa/

# 2. Compilar y reiniciar en Azure
ssh -F /dev/null -o StrictHostKeyChecking=no azureuser@52.233.82.87 "bash -c '
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
  echo \"✅ ¡Servidor actualizado exitosamente en https://aura-ecommerce.westus2.cloudapp.azure.com!\"
'"

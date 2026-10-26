#!/usr/bin/env bash
# =========================================================================
# SCRIPT DE DESPLIEGUE AUTOMATIZADO EN AZURE UBUNTU VM (SI2)
# =========================================================================
set -e

echo "🚀 Iniciando despliegue de AURA E-Commerce en Azure VM..."

# 1. Actualizar repositorios e instalar dependencias básicas
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl gnupg lsb-release git

# 2. Instalar Docker y Docker Compose si no están instalados
if ! command -v docker &> /dev/null; then
    echo "📦 Instalando Docker oficial..."
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg --yes
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update -y
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    sudo systemctl enable docker
    sudo systemctl start docker
    sudo usermod -aG docker "$USER"
    echo "✅ Docker instalado correctamente."
fi

# 3. Verificar archivo .env
if [ ! -f .env ]; then
    echo "⚙️ Creando archivo .env a partir de .env.production.example..."
    cp .env.production.example .env
    echo "⚠️ Recuerda editar .env con tu IP pública de Azure: nano .env"
fi

# 4. Construir y levantar contenedores en segundo plano
echo "🔨 Compilando y levantando contenedores con Docker Compose..."
sudo docker compose -f docker-compose.prod.yml down --remove-orphans || true
sudo docker compose -f docker-compose.prod.yml up -d --build

# 5. Estado de los contenedores
echo "📊 Estado de los servicios:"
sudo docker compose -f docker-compose.prod.yml ps

IP_PUBLICA=$(curl -s ifconfig.me || hostname -I | awk '{print $1}')
echo ""
echo "========================================================================="
echo "🎉 ¡DESPLIEGUE COMPLETADO CON ÉXITO!"
echo "🌐 Tienda Web:      http://$IP_PUBLICA"
echo "🔌 API Backend:     http://$IP_PUBLICA/api/v1"
echo "📚 Documentación:   http://$IP_PUBLICA/docs"
echo "========================================================================="

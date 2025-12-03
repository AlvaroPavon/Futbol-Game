#!/bin/bash

# Script de actualización automática para Haxball Clone
# Uso: bash update.sh

set -e  # Detener si hay errores

echo "🚀 Iniciando actualización del servidor..."
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para imprimir con color
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# 1. Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ] && [ ! -d "frontend" ]; then
    print_error "Error: No estás en el directorio raíz del proyecto"
    exit 1
fi

print_success "Directorio correcto detectado"

# 2. Crear backup
print_info "Creando backup..."
BACKUP_DIR="../haxball-backup-$(date +%Y%m%d-%H%M%S)"
cp -r . "$BACKUP_DIR"
print_success "Backup creado en: $BACKUP_DIR"

# 3. Detectar si hay git
if [ -d ".git" ]; then
    print_info "Git detectado, descargando cambios..."
    git pull origin main || git pull origin master || {
        print_error "Error al hacer git pull"
        print_info "Intenta: git pull origin [tu-branch]"
        exit 1
    }
    print_success "Código actualizado desde Git"
else
    print_info "Git no detectado, asumiendo actualización manual"
    print_info "Asegúrate de haber copiado los archivos nuevos antes de ejecutar este script"
fi

# 4. Actualizar backend
print_info "Actualizando backend..."
cd backend

if [ -f "requirements.txt" ]; then
    print_info "Instalando dependencias de Python..."
    pip install -r requirements.txt || {
        print_error "Error al instalar dependencias de Python"
        exit 1
    }
    print_success "Dependencias de Python instaladas"
fi

cd ..

# 5. Actualizar frontend
print_info "Actualizando frontend..."
cd frontend

# Limpiar instalación anterior
print_info "Limpiando instalación anterior..."
rm -rf node_modules package-lock.json .next 2>/dev/null || true

# Instalar dependencias
print_info "Instalando dependencias de Node.js..."
npm install --legacy-peer-deps || {
    print_error "Error al instalar dependencias de Node.js"
    exit 1
}
print_success "Dependencias de Node.js instaladas"

# Build del frontend
print_info "Compilando frontend..."
npm run build || {
    print_error "Error al compilar el frontend"
    exit 1
}
print_success "Frontend compilado correctamente"

cd ..

# 6. Reiniciar servicios con PM2
print_info "Reiniciando servicios..."

if command -v pm2 &> /dev/null; then
    print_info "PM2 detectado, reiniciando servicios..."
    
    pm2 restart backend 2>/dev/null || {
        print_info "Backend no está en PM2, intentando iniciarlo..."
        cd backend
        pm2 start server.py --name backend --interpreter python3
        cd ..
    }
    
    print_success "Servicios reiniciados con PM2"
    
    # Mostrar estado
    echo ""
    pm2 status
    
    # Guardar configuración
    pm2 save
    
else
    print_error "PM2 no encontrado"
    print_info "Por favor, reinicia tus servicios manualmente"
fi

# 7. Resumen final
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
print_success "¡Actualización completada! 🎉"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
print_info "Cambios aplicados:"
echo "  • Servidor a 120 FPS"
echo "  • Interpolación en cliente"
echo "  • Animaciones de kick/push"
echo "  • Sistema de rendering adaptativo"
echo ""
print_info "Backup guardado en: $BACKUP_DIR"
echo ""
print_info "Próximos pasos:"
echo "  1. Verifica los logs: pm2 logs backend"
echo "  2. Prueba el juego en tu navegador"
echo "  3. Verifica que los FPS sean más altos"
echo ""
print_success "¡Todo listo! Disfruta del juego más fluido 🎮"

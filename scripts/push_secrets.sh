#!/usr/bin/env bash
set -e

# ==============================================================================
# Push Secrets to PICO 4 Ultra / Android VR headset
# ==============================================================================
# Usage:
#   1. Using .env.secrets file:
#      echo "MINIMAX_API_KEY=your_key" >> .env.secrets
#      echo "MINIMAX_GROUP_ID=your_group_id" >> .env.secrets
#      ./scripts/push_secrets.sh
#
#   2. Using command line flags:
#      ./scripts/push_secrets.sh --minimax-key "sk-..." --group-id "12345"
#
#   3. Using interactive prompt:
#      ./scripts/push_secrets.sh
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env.secrets"
TEMP_JSON="/tmp/spatial_workspace_secrets.json"

MINIMAX_KEY=""
MINIMAX_GROUP=""
OPENAI_KEY=""
DEEPSEEK_KEY=""

# Parse flags if provided
while [[ $# -gt 0 ]]; do
  case $1 in
    --minimax-key)
      MINIMAX_KEY="$2"
      shift 2
      ;;
    --group-id|--minimax-group)
      MINIMAX_GROUP="$2"
      shift 2
      ;;
    --openai-key)
      OPENAI_KEY="$2"
      shift 2
      ;;
    --deepseek-key)
      DEEPSEEK_KEY="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1"
      exit 1
      ;;
  esac
done

# If .env.secrets exists, load from it
if [ -f "$ENV_FILE" ]; then
  echo "📄 Reading keys from $ENV_FILE..."
  while IFS='=' read -r key value || [ -n "$key" ]; do
    key=$(echo "$key" | tr -d ' ' | tr -d '\r')
    value=$(echo "$value" | tr -d '\r' | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
    case "$key" in
      MINIMAX_API_KEY) [ -z "$MINIMAX_KEY" ] && MINIMAX_KEY="$value" ;;
      MINIMAX_GROUP_ID) [ -z "$MINIMAX_GROUP" ] && MINIMAX_GROUP="$value" ;;
      OPENAI_API_KEY) [ -z "$OPENAI_KEY" ] && OPENAI_KEY="$value" ;;
      DEEPSEEK_API_KEY) [ -z "$DEEPSEEK_KEY" ] && DEEPSEEK_KEY="$value" ;;
    esac
  done < "$ENV_FILE"
fi

# If keys are still empty and no flags, create template
if [ -z "$MINIMAX_KEY" ] && [ -z "$OPENAI_KEY" ]; then
  echo "⚠️ No se encontraron secretos en flags ni en .env.secrets."
  echo "💡 Creando plantilla en $ENV_FILE..."
  cat << 'EOF' > "$ENV_FILE"
# Configuración de Secretos para Spatial Workspace VR
# (Este archivo está en .gitignore y nunca se sube a git)
MINIMAX_API_KEY=tu_minimax_api_key_aqui
MINIMAX_GROUP_ID=tu_minimax_group_id_aqui
OPENAI_API_KEY=
DEEPSEEK_API_KEY=
EOF
  echo "✅ Archivo plantilla creado en: $ENV_FILE"
  echo "👉 Edita el archivo con tus API Keys y vuelve a ejecutar ./scripts/push_secrets.sh"
  exit 0
fi

# Build JSON structure
cat << EOF > "$TEMP_JSON"
{
  "provider": 0,
  "model": "speech-02-turbo",
  "voice_id": "moss_audio",
  "api_key": "$MINIMAX_KEY",
  "group_id": "$MINIMAX_GROUP",
  "minimax_api_key": "$MINIMAX_KEY",
  "minimax_group_id": "$MINIMAX_GROUP",
  "openai_api_key": "$OPENAI_KEY",
  "deepseek_api_key": "$DEEPSEEK_KEY",
  "updated_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF

echo "🚀 Verificando dispositivo PICO conectado via ADB..."
DEVICE_COUNT=$(adb devices | grep -v "List" | grep "device" | wc -l | tr -d ' ')

if [ "$DEVICE_COUNT" -eq "0" ]; then
  echo "⚠️ No se detectó ningún dispositivo PICO activo en ADB."
  echo "👉 Conecta o despierta el visor por USB y vuelve a ejecutar este comando."
  echo "📦 El archivo preparado está en: $TEMP_JSON"
  exit 1
fi

echo "📦 Transfiriendo secretos al visor..."
# Push to sdcard root (readable by app)
adb push "$TEMP_JSON" /sdcard/spatial_workspace_secrets.json

# Push directly to app user storage
adb shell mkdir -p /sdcard/Android/data/com.spatialworkspace.pico/files/ 2>/dev/null || true
adb push "$TEMP_JSON" /sdcard/Android/data/com.spatialworkspace.pico/files/live_model_config.json 2>/dev/null || true

echo "✅ ¡Listo! Secretos cargados exitosamente en PICO 4 Ultra."
echo "   • /sdcard/spatial_workspace_secrets.json"
echo "   • user://live_model_config.json"
echo ""
echo "✨ Al abrir la app en el visor, MiniMax y GPT-Live ya estarán autenticados automáticamente."

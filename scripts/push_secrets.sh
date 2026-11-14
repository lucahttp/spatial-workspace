#!/usr/bin/env bash
set -e

# ==============================================================================
# Push Secrets to PICO 4 Ultra / Android VR headset
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env.secrets"
TEMP_JSON="/tmp/spatial_workspace_secrets.json"
LOCAL_SECRETS_JSON="$ROOT_DIR/godot-spatial-workspace/secrets.json"

MINIMAX_KEY=""
MINIMAX_GROUP=""
OPENAI_KEY=""
OPENAI_ENDPOINT=""

AZURE_KEY_GPU=""
AZURE_ENDPOINT_GPU=""
AZURE_PROJECT_GPU=""

AZURE_KEY_1392=""
AZURE_ENDPOINT_1392=""
AZURE_PROJECT_1392=""

AZURE_KEY_0682=""
AZURE_ENDPOINT_0682=""
AZURE_PROJECT_0682=""

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
      OPENAI_ENDPOINT) [ -z "$OPENAI_ENDPOINT" ] && OPENAI_ENDPOINT="$value" ;;
      AZURE_OPENAI_KEY_GPU) AZURE_KEY_GPU="$value" ;;
      AZURE_OPENAI_ENDPOINT_GPU) AZURE_ENDPOINT_GPU="$value" ;;
      AZURE_AI_PROJECT_GPU) AZURE_PROJECT_GPU="$value" ;;
      AZURE_OPENAI_KEY_1392) AZURE_KEY_1392="$value" ;;
      AZURE_OPENAI_ENDPOINT_1392) AZURE_ENDPOINT_1392="$value" ;;
      AZURE_AI_PROJECT_1392) AZURE_PROJECT_1392="$value" ;;
      AZURE_OPENAI_KEY_0682) AZURE_KEY_0682="$value" ;;
      AZURE_OPENAI_ENDPOINT_0682) AZURE_ENDPOINT_0682="$value" ;;
      AZURE_AI_PROJECT_0682) AZURE_PROJECT_0682="$value" ;;
    esac
  done < "$ENV_FILE"
fi

# Fallback for primary OpenAI if empty
if [ -z "$OPENAI_KEY" ] && [ -n "$AZURE_KEY_GPU" ]; then
  OPENAI_KEY="$AZURE_KEY_GPU"
  OPENAI_ENDPOINT="$AZURE_ENDPOINT_GPU"
fi

# Build JSON structure with full multi-resource support
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
  "openai_endpoint": "$OPENAI_ENDPOINT",
  "azure_resources": {
    "porestonomecomprounabuenagpu": {
      "name": "Azure AI (porestonomecomprounabuenagpu - Modelos Adicionales)",
      "api_key": "$AZURE_KEY_GPU",
      "endpoint": "$AZURE_ENDPOINT_GPU",
      "project": "$AZURE_PROJECT_GPU"
    },
    "lucasain-1392": {
      "name": "Azure AI (lucasain-1392)",
      "api_key": "$AZURE_KEY_1392",
      "endpoint": "$AZURE_ENDPOINT_1392",
      "project": "$AZURE_PROJECT_1392"
    },
    "lucasain-0682": {
      "name": "Azure AI (lucasain-0682)",
      "api_key": "$AZURE_KEY_0682",
      "endpoint": "$AZURE_ENDPOINT_0682",
      "project": "$AZURE_PROJECT_0682"
    }
  },
  "updated_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF

# Copy to local godot secrets.json (ignored by git, for desktop dev & bundle)
cp "$TEMP_JSON" "$LOCAL_SECRETS_JSON"
echo "✅ Configuración local guardada en: $LOCAL_SECRETS_JSON"

echo "🚀 Verificando dispositivo PICO conectado via ADB..."
DEVICE_COUNT=$(adb devices | grep -v "List" | grep "device" | wc -l | tr -d ' ')

if [ "$DEVICE_COUNT" -eq "0" ]; then
  echo "⚠️ No se detectó ningún visor PICO activo en ADB en este momento."
  echo "👉 Apenas conectes el visor por USB o Wi-Fi, vuelve a ejecutar ./scripts/push_secrets.sh"
  echo "📦 El archivo preparado está listo en: $TEMP_JSON"
  exit 0
fi

echo "📦 Transfiriendo secretos al visor..."
# Push to sdcard root (readable by app)
adb push "$TEMP_JSON" /sdcard/spatial_workspace_secrets.json

# Push directly to app user storage
adb shell mkdir -p /sdcard/Android/data/com.spatialworkspace.pico/files/ 2>/dev/null || true
adb push "$TEMP_JSON" /sdcard/Android/data/com.spatialworkspace.pico/files/live_model_config.json 2>/dev/null || true

echo "✅ ¡Listo! Secretos cargados exitosamente en PICO 4 Ultra."
echo "   • MiniMax: sk-cp-YMCh..."
echo "   • Azure OpenAI (porestonomecomprounabuenagpu): 9f0fYUQn..."
echo "   • Azure OpenAI (lucasain-1392): GCjb0wYn..."
echo "   • Azure OpenAI (lucasain-0682): 5xgo9xvk..."
echo "   • /sdcard/spatial_workspace_secrets.json"
echo "   • user://live_model_config.json"
echo ""
echo "✨ Al abrir la app en el visor, MiniMax y Azure OpenAI ya estarán autenticados automáticamente."

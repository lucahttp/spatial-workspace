# Godot Spatial Workspace (Native XR)

Reimplementación nativa del **Spatial Workspace** en **Godot Engine 4 (4.5+ / 4.7+)** diseñada con arquitectura de **Core Compartido + Adaptadores de Plataforma** para soporte simultáneo en:
- **Apple Vision Pro** (visionOS nativo vía RealityKit / `apple/plugins-for-godot`).
- **PICO 4 Ultra** (OpenXR Android `arm64-v8a` vía Godot OpenXR Vendors Plugin).
- **Meta Quest 2 / 3 / Pro** (OpenXR Android `arm64-v8a` vía Godot OpenXR Vendors Plugin).

---

## 🏛 Arquitectura: Shared Core + Platform Adapters

```
godot-spatial-workspace/
├── scenes/
│   ├── main.tscn                     # Escena principal con XROrigin3D, Cámaras y Workspace
│   ├── ui/
│   │   ├── code_studio_2d.tscn       # Editor wZed con CodeEdit y syntax highlighting
│   │   ├── web_preview_2d.tscn       # Ventana de navegación y preview
│   │   ├── spatial_panel_3d.tscn     # Ventana 3D flotante (QuadMesh + SubViewport + Handle)
│   │   ├── spatial_affordance_pill.tscn # Cápsula flotante orientada al usuario (billboard)
│   │   └── system_bars.tscn          # Top Bar simplificada y Dock inferior visionOS
│   └── workspace/
│       └── document_carousel_3d.tscn # Carrusel cilíndrico de tarjetas de referencia
├── scripts/
│   ├── xr/
│   │   └── xr_manager.gd             # Detección de runtime (OpenXR vs RealityKit), passthrough AR
│   ├── ui/
│   │   ├── spatial_viewport_bridge.gd# Raycast 3D a eventos 2D (SubViewport.push_input)
│   │   ├── spatial_panel_3d.gd       # Arrastre Grip, manipulación bimanual (escala/rotación)
│   │   ├── spatial_affordance_pill.gd# Lógica de dwell (3s), proximidad (<0.38m) y Grip
│   │   ├── code_studio.gd            # wZed Studio: tabs, ejecución y desacople/acople
│   │   ├── web_preview.gd            # Navegador y sincronización de preview
│   │   └── system_bars.gd            # Control de MR/VR, recentrado y accesos rápidos
│   └── workspace/
│       ├── thinking_orb.gd           # Orbe cognitivo (9 estados, halo y enjambre de partículas)
│       ├── document_carousel_3d.gd   # Arrastre individual o grupal de tarjetas, botón "+"
│       └── workspace.gd              # Coordinador de ventanas espaciales
├── assets/
│   └── themes/
│       └── vaporwave_sunset.tres     # Tema completo con 335 sub-recursos autocontenidos
└── export_presets.cfg                # Presets para PICO 4 Ultra y Apple Vision Pro
```

---

## 🎮 Modelo de Interacción Espacial

1. **Separación Grip vs Trigger**:
   - **Grip (Gatillo lateral / Pellizco medio)**: Manipulación espacial 3D de ventanas y objetos (mover en el plano de arrastre con una mano; escalar y rotar con dos manos simultáneas).
   - **Trigger (Gatillo frontal / Pellizco índice)**: Clics y selección de componentes 2D dentro del `SubViewport`.

2. **Manipulación Bimanual (Two-Handed Manipulation)**:
   - Al agarrar una ventana o tarjeta con ambas manos a la vez (`_bimanual_active`), la distancia entre ambas manos controla la **escala** y el ángulo relativo en el eje Y controla la **rotación**.

3. **Spatial Affordance Pill**:
   - La cápsula flotante informativa aparece solo bajo 3 condiciones:
     1. **Dwell**: El puntero o mirada hace hover continuo durante más de 3 segundos.
     2. **Proximidad**: La mano o controlador se acerca a menos de 0.38 metros del objeto.
     3. **Grip**: En el momento en que se presiona el gatillo lateral para iniciar un arrastre.

4. **Carrusel de Referencias**:
   - Las tarjetas pueden moverse individualmente tirando de ellas con Grip, o moverse como grupo unificado.
   - Al acercar la mano o el puntero, se revela el botón con el símbolo **"+"** para anclar o añadir nuevas tarjetas.

5. **Barra Superior y Dock**:
   - **Top Bar simplificada**: Dos botones principales: `Passthrough MR / VR` (conmuta transparencia de passthrough y sky) y `Ajustes`.
   - **Bottom Dock visionOS**: Acceso rápido flotante a `Inicio` (restablece layout ergonómico), `wZed` (conmuta estudio de código), `Preview` (conmuta navegador), `Fuentes` (conmuta carrusel) y `Voz` (activa estado Listening en el Orbe con audio espacial).

6. **Orbe Cognitivo Interactivo**:
   - Posee colisionador 3D esférico (`SphereShape3D`).
   - **Grip**: Agarre y traslación libre en 6DoF por el espacio.
   - **Trigger**: Clic directo para ciclar entre estados cognitivos (`breathing`, `listening`, `working`, `solving`, `composing`) con retroalimentación sonora procedural (`AudioStreamWAV`).

7. **Flujo Cruzado entre Paneles (Cross-Panel Wiring)**:
   - Al pulsar **"▶ Ejecutar"** en wZed, el código compila en el VFS simulado, muestra la traza en la terminal integrada, pasa el Orbe al estado `solving` (destello esmeralda) y sincroniza el resultado en la ventana de **Web Preview**.
   - Al hacer clic con **Trigger** sobre cualquier tarjeta del carrusel, su contenido se despliega instantáneamente en el panel de **Web Preview**.

---

## 🚀 Instrucciones de Exportación

### 1. PICO 4 Ultra (OpenXR Android)
1. Preset: `PICO 4 Ultra`
2. Genera: `builds/pico/spatial_workspace_pico.apk`
3. Instalar en el visor vía ADB:
   ```bash
   adb install -r builds/pico/spatial_workspace_pico.apk
   ```

### 2. Meta Quest (OpenXR Android)
1. Preset: `Meta Quest`
2. Genera: `builds/quest/spatial_workspace_quest.apk`
3. Instalar en el visor vía ADB:
   ```bash
   adb install -r builds/quest/spatial_workspace_quest.apk
   ```

### 3. Apple Vision Pro (visionOS)
1. Preset: `Apple Vision Pro`
2. Requisitos: macOS con Xcode 16+ y visionOS SDK.
3. Genera el proyecto Xcode en `builds/visionos/SpatialWorkspace.xcodeproj`.
4. Abrir en Xcode:
   ```bash
   open builds/visionos/SpatialWorkspace.xcodeproj
   ```
5. Configurar el Signing & Capabilities con tu cuenta de Apple Developer y desplegar en el visor o simulador de visionOS.

---

## 🤖 GitHub Actions CI/CD (`build-xr.yml`)

El pipeline automatizado en `.github/workflows/build-xr.yml` compila los 3 artefactos en cada push a `feat/godot-native-xr` o `main`:
- **Job `build-android-xr (PICO 4 Ultra)`**: Compila y sube el artefacto `pico4-ultra-apk`.
- **Job `build-android-xr (Meta Quest)`**: Compila y sube el artefacto `meta-quest-apk`.
- **Job `build-visionos (Apple Vision Pro)`**: Exporta y empaqueta el proyecto Xcode listo para compilar/firmar como `visionos-xcode-project`.

También puede dispararse manualmente vía **Workflow Dispatch** seleccionando el target deseado (`all`, `pico`, `quest` o `visionos`).

---

## 🧪 Validación Headless
Para verificar que el proyecto compila, importa y ejecuta sin errores en entornos de CI o terminal:
```bash
godot --headless --path . --quit-after 60
```
- Resultado esperado: `EXIT: 0` con arranque limpio del ciclo de vida de Godot.

# PICO OS — Spatial Workspace XR

Un espacio de trabajo espacial multi-ventana interactivo para la web inmersiva (**WebXR**), optimizado para **Apple Vision Pro** (Safari visionOS 2+), **PICO 4 Ultra** (Passthrough AR), **PICO Neo / Meta Quest** (VR inmersivo) y navegadores de escritorio.

Inspirado en la ergonomía y estética de **Apple Vision OS** y **PICO OS 5**, con un diseño **Flat Design Pastel** (generous whitespace, paleta pastel azul cielo `#e0f2fe`, lavanda `#ede9fe`, menta `#d1fae5`, acentos púrpura `#7c3aed`), física cinemática de **GSAP UI**, efectos perimetrales de **Border Beam**, motor matemático de **Thinking Orbs** de Jakub Antalik, y reconocimiento cinemático/ML de manos con **Transformers.js & ONNX Runtime Web**.

---

## 📲 Descargas Públicas de Builds Nativas XR (APKs & visionOS)

Los binarios nativos compilados con **Godot 4.7.2** se generan y publican automáticamente en los **[Releases Públicos del Repositorio](https://github.com/lucahttp/spatial-workspace/releases/tag/latest)** con el tag `latest` y por versión:

| Plataforma | Formato / Runtime | Enlace de Descarga Pública (Directo) |
| :--- | :--- | :--- |
| **PICO 4 Ultra** | Android APK (arm64 OpenXR) | [⬇️ SpatialWorkspace-Pico4Ultra.apk](https://github.com/lucahttp/spatial-workspace/releases/latest/download/SpatialWorkspace-Pico4Ultra.apk) |
| **Meta Quest 2 / 3 / 3S / Pro** | Android APK (arm64 OpenXR) | [⬇️ SpatialWorkspace-MetaQuest.apk](https://github.com/lucahttp/spatial-workspace/releases/latest/download/SpatialWorkspace-MetaQuest.apk) |
| **Apple Vision Pro** | Xcode Project (RealityKit / visionOS) | [⬇️ SpatialWorkspace-visionOS-Xcode.tar.gz](https://github.com/lucahttp/spatial-workspace/releases/latest/download/SpatialWorkspace-visionOS-Xcode.tar.gz) |

> 💡 **Instalación rápida en visor (ADB):**
> ```bash
> # PICO 4 Ultra
> adb install -r SpatialWorkspace-Pico4Ultra.apk
>
> # Meta Quest 2/3/3S/Pro
> adb install -r SpatialWorkspace-MetaQuest.apk
> ```

---

## 🌟 Nuevas Características y Ergonomía Espacial

### 1. 🖐️ Hand Tracking & Kinemática ML (Transformers.js / ONNX Runtime Web)
* **Arquitectura de modelos locales Hugging Face & Xenova**:
  * Integración de `@huggingface/transformers` y **ONNX Runtime Web** (WebAssembly / SIMD / WebGPU) para análisis de visión y gestos local en el navegador sin dependencias de servidores externos.
  * **Clasificador cinemático de 25 articulaciones WebXR (`classifyHandKinematics`)**:
    * **`pinch`**: Distancia microscópica entre la yema del pulgar y el índice (< 3.5 cm) para clics y selección precisa.
    * **`grip` (puño)**: Factor de flexión palmar de 4 dedos (> 0.68) para tomar y mover objetos tridimensionales de forma natural.
    * **`point` (apuntar)**: Extensión aislada del índice con dedos flexionados para apuntar y previsualizar.
    * **`open`**: Palma abierta y relajada.
  * Botón en el HUD superior **`🖐️ Hand ML`** para verificar y activar el motor ONNX local.

### 2. 🪟 Ventanas Desprendibles y Carrusel Móvil en Grupo
* **Manipulación del carrusel completo**: Toda la estructura en arco de tarjetas posee su propio riel superior de agarre (**`CARRUSEL DE FUENTES`**), permitiendo trasladar y rotar toda la colección de referencias al unísono.
* **Extracción de tarjetas a ventanas libres (*Detached Floating Windows*)**:
  * Al arrastrar cualquier tarjeta del carrusel hacia el espacio abierto (> 0.45 m), o al pulsar **`Extraer Tarjeta`** en su cápsula contextual, la tarjeta se desprende del arco.
  * Se convierte en una **ventana 3D independiente y flotante**, que puedes colocar en cualquier lugar de tu habitación virtual, rotar y leer en paralelo.
  * Cada ventana libre cuenta con la opción de **`Acoplar al Carrusel`** para devolverla a su ranura en cualquier momento, o arrastrarla a **Archivar** o **Basura**.

### 3. 🧠 Mapa Mental (IdeaGraph) y Orbe de Voz 3D Totalmente Móviles
* **Idea & Fuentes 3D**: El cristal central de ideas y su constelación de fuentes ahora cuentan con una píldora táctil inferior y mango espacial `<Handle translate rotate multitouch={true}>`. Puedes colocar tu mapa mental en cualquier rincón del espacio.
* **Orbe de Voz Flotante (`MovableOrb`)**: El orbe cognitivo de partículas ahora es un objeto espacial autónomo con halo táctil. Puedes tomarlo y situarlo flotando junto a tus documentos o sobre tu escritorio virtual.

### 4. 💊 Cápsula Contextual Universal (`SpatialCapsule`) con Auto-Hide
* **Aparición inteligente al apuntar o tocar**: Al pasar el rayo láser o tocar cualquier ventana, tarjeta, mapa de ideas o pedestal, se despliega una elegante cápsula flotante estilo visionOS con opciones:
  * ✋ **Mover / Arrastrar**: Indica zona de agarre cinemático.
  * 👁️ **Mirar a mí (`faceUser`)**: Calcula el vector angular relativo a tu visor/cámara y rota la ventana inmediatamente hacia tu mirada.
  * 🔄 **Girar 15°**: Ajuste de ángulo fino en el plano XZ.
  * ➖ **Minimizar**: Colapsa u oculta temporalmente el objeto.
  * ✕ **Cerrar**: Descarta o elimina el panel.
* **Temporizador de auto-ocultado**: Si no interactúas con la cápsula tras 2.8 segundos, se desvanece suavemente para mantener un campo visual despejado y zen. Si pasas el cursor por encima, el temporizador se pausa para permitirte accionar con calma.

### 5. 🗑️ Bandejas Físicas Móviles y Subtítulos por Presión Prolongada (*Long-Press*)
* **Diseño ultra-minimalista**: Ni la bandeja de **Archivar** ni el tacho de **Basura** muestran rótulos de texto permanentes. La affordance visual la da su diseño físico 3D (bandeja con hojas de papel pastel y cilindro de grafito con aro coral).
* **Revelación por presión mantenida**: Solamente al mantener apuntado o presionado el objeto durante más de 650 ms, se despliega suavemente el subtítulo descriptivo y su cápsula de ajustes.
* **Reubicación libre**: Ambas bandejas son móviles en 3D. Al cambiarlas de lugar, las zonas de drop y las líneas elásticas magnéticas se recalculan automáticamente en base a su nueva posición en tiempo real.

### 6. ⚡ Rayo Destellante con Gatillo Lateral (Grip) y Clic con Gatillo Frontal (Trigger)
* **Grip Button (Gatillo lateral / Squeeze)**:
  * Al mantener presionado el Grip, los controles destellan un **rayo láser animado y brillante** con partículas eléctricas, aro de impacto (*reticle*) y haz luminoso cian/púrpura.
  * Permite agarrar y desplazar objetos espaciales cómodamente.
  * Al soltar el Grip, el rayo se vuelve sutil o invisible para no estorbar la inmersión.
* **Trigger Button (Gatillo frontal / Select)**:
  * Los botones, controles deslizantes y enlaces reaccionan y ejecutan acciones **exclusivamente cuando se presiona el Trigger frontal**, evitando accionamientos involuntarios al apuntar.

### 7. 🚪 Botón de Salida Inmersiva (*Exit Button*)
* **En el Dock espacial**: Botón rojo/rosa esmerilado con icono `LogOut` para finalizar la sesión inmersiva y volver a la navegación plana normal.
* **En el HUD superior**: Botón visible `Salir de XR ✕` mientras una sesión WebXR se encuentre en ejecución.

### 8. 💻 Suite Completa de Pantallas wZed en 3D (Paridad Total con wZed)
* **Adaptación integral de las vistas y módulos de [wZed](https://github.com/ScelarOrg/wZed)**:
  * **📁 Explorador de Proyecto (`ProjectPanel` / `FileTree`)**: Árbol jerárquico de archivos en memoria (`/project`), creación de archivos y carpetas, eliminación, renombramiento e iconos según extensión (`.js`, `.json`, `.css`, `.jsx`).
  * **📝 Editor de Código Multi-Pestaña (`EditorPane` / `CodeEditor` / `TabBar`)**: Pestañas de archivos abiertos, barra de migas de pan (*Breadcrumbs*), números de línea y resaltado sintáctico pastel.
  * **📟 Terminal Interactivo (`TerminalPanel`)**: Transmisión en tiempo real de `stdout` y `stderr`, prompt interactivo `pico-os:~/project$ node index.js`, botones de limpieza y re-ejecución.
  * **🤖 Panel Asistente IA (`AIPanel`)**: Chat con el subagente de desarrollo, sugerencias rápidas, trazabilidad de llamadas a herramientas (`read_file`, `write_file`, `execute_command`) y aplicación de diffs.
  * **🌿 Control de Versiones Git (`GitPanel`)**: Estado de cambios del VFS, indicador de rama (`main`), lista de archivos modificados con insignias de estado y botón para confirmar (*Commit*).
  * **🔍 Búsqueda Global (`SearchPanel`)**: Búsqueda textual y reemplazo transversal en todos los archivos del espacio de trabajo.
  * **⚡ Cliente HTTP / Emisor de Peticiones (`RequestSender`)**: Herramienta de pruebas de API REST integrada en 3D (métodos `GET`, `POST`, `PUT`, `DELETE`), cabeceras y visualizador de respuestas JSON.
  * **📊 Monitor de Rendimiento (`PerfMonitor`)**: Medición de FPS en tiempo real, consumo estimado de memoria, latencia de audio y conteo de nodos del VFS.
  * **🧭 Barra de Estado Espacial (`StatusBar`)**: Indicadores inferiores de rama git, línea/columna activa, codificación UTF-8, estado del runtime Node y estado de conexión IA.

### 9. 🔮 Orbe Táctil & Detección de Wake Word ("Hey Buddy" / "Oye Orbe")
* **Toque directo sobre el Orbe 3D**:
  * Tocar o hacer clic en el Orbe de Pensamiento (Thinking Orb) activa de inmediato la escucha por voz.
  * El orbe transiciona instantáneamente al estado luminoso `'listening'`, emite un tono espacial de confirmación y proyecta una **burbuja de voz flotante 3D** (*Floating Speech Bubble*) sobre él con la transcripción en vivo.
  * Al finalizar la frase o pulsar nuevamente, la consulta se envía a Azure AI Foundry y al subagente de código wZed, reproduciendo la respuesta con síntesis vocal.
* **Integración del Detector de Palabra de Activación con [Hey-Buddy](https://github.com/painebenjamin/hey-buddy/tree/main/src/js)**:
  * Motor híbrido de detección de palabras clave en el navegador:
    * Detección continua de frases de activación: `"Hey Buddy"`, `"Hello Buddy"`, `"Okay Buddy"`, `"Oye Orbe"`, `"Computer"`.
    * Basado en la arquitectura de red neuronal ONNX y Web Audio de **Hey-Buddy** (Benjamin Paine) para detección local en cliente sin enviar audio continuo a la red.
    * Al pronunciar la palabra de activación, el orbe se ilumina, vibra con un destello reactivo y comienza a escuchar el comando del usuario con manos libres.

### 10. ☁️ Despliegue en Microsoft Copilot Managed Runtime (CMR Managed App)
* **Arquitectura de Managed App (`@microsoft/cmr-apps`)**:
  * Configuración oficial mediante [`ms.config.json`](file:///Users/luca/Documents/spatial-workspace/ms.config.json) acorde al esquema de Microsoft Copilot Managed Runtime (`schemas/ms.config.schema.json`).
  * Integración con el plugin de empaquetado para Vite (`@microsoft/cmr-apps-vite-plugin`), permitiendo que la aplicación espacial se despliegue y aloje como una Managed Application en el ecosistema de Microsoft 365 y Copilot con gobernanza y seguridad de nivel empresarial.
  * Comando para despliegue directo:
    ```bash
    npm run deploy:cmr
    ```

### 10. 🎙️ Azure AI Foundry GPT Live & Delegación de Subagente de Código wZed
* **Conexión a Azure AI Foundry**:
  * Compatible con proyectos de Azure AI Foundry y Copilot Managed Runtime mediante variables de entorno seguras (`VITE_AZURE_FOUNDRY_ENDPOINT` y `VITE_AZURE_AI_KEY`).
  * Soporte para sesiones de audio en tiempo real y protocolo de agentes (`invocations_ws` / REST).
* **Arquitectura de Delegación Supervisor-Subagente**:
  * **Agente Supervisor (Orbe de Voz 3D)**: Escucha las instrucciones habladas del usuario en el espacio tridimensional y analiza la intención con GPT Live de Azure Foundry.
  * **Subagente de Código (wZed Agent)**: Cuando el usuario pide crear código, modificar componentes, ejecutar scripts o consultar archivos, el Orbe de Voz delega la tarea al subagente de wZed (`delegate_to_coding_subagent`).
  * **Ejecución y Feedback Visual**: El subagente ejecuta las herramientas en el VFS (`createFile`, `writeFile`, `runFile`), transmite los logs al terminal 3D y despliega el resultado gráfico en la tarjeta de **Previsualización Web**.
  * **Respuesta Cognitiva**: El Orbe adopta estados visuales (`thinking`, `working`, `solving`, `connecting`) y devuelve el reporte consolidado al usuario.

### 11. 👐 Manipulación Bimanual & Affordance Universal Unificada
* **Control Bimanual (Two-Handed Manipulation)**:
  * Al interactuar con ambas manos o controladores simultáneamente, los objetos tridimensionales (paneles, orbe, carrusel, bandejas) calculan la traslación del punto medio, la rotación angular y el escalado/distancia en tiempo real mediante `@react-three/handle` con `multitouch={true}`, `scale={true}`, `rotate={true}` y `translate={true}`.
* **Affordance Universal Unificada (`useSpatialAffordance`)**:
  * Las cápsulas y ayudas visuales de movimiento ya no abarrotan permanentemente la pantalla.
  * Aparecen únicamente bajo tres condiciones intuitivas idénticas en todos los objetos 3D:
    1. **Hover sostenido (> 3 segundos)**: Apuntar fijamente al objeto durante 3s revela suavemente la barra de agarre y la píldora `MOVER`.
    2. **Gatillo lateral (Grip/Squeeze)**: Al apretar el gatillo lateral del controlador o cerrar el puño con seguimiento de manos.
    3. **Proximidad física (< 0.42 m)**: Al acercar la mano o el visor al objeto en el espacio tridimensional.
* **HUD Superior Simplificado (2 Botones)**:
  * Rediseñado a exactamente 2 botones ergonómicos:
    1. `VR / Passthrough MR`: Entrada directa al modo inmersivo correspondiente.
    2. `⚙️ Configuración`: Abre una ventana modal de cristal visionOS unificada con ajustes de Azure AI Foundry, Wake Word ("Hey Buddy"), Orbe de pensamiento, Hand ML y herramientas de recentrado.
* **Desacople y Acople Dinámico de Pantallas wZed**:
  * Las sub-vistas del estudio de código (**Terminal**, **Explorador VFS**, **Asistente IA**) pueden desacoplarse del panel principal hacia ventanas 3D flotantes independientes mediante botones de interfaz o por comando de voz con GPT Live (*"desacopla el terminal"*, *"acopla el explorador"*).
* **Bandeja de Documentos con Botón Proactivo `(+)` & Dock Depurado**:
  * La bandeja de archivo muestra dinámicamente un botón resplandeciente `(+)` al acercar el puntero o la mano para crear o añadir tarjetas al vuelo.
  * El dock inferior unifica el control de visibilidad de ventanas espaciales minimizando el desorden visual.

---

## 📚 Librerías, Referencias y Ejemplos Utilizados

1. **[Microsoft Copilot Managed Runtime (microsoft/Copilot-Managed-Runtime)](https://github.com/microsoft/Copilot-Managed-Runtime)**:
   * **SDK y Esquemas de Managed Apps**: Configuración `ms.config.json` y empaquetado para despliegue en entornos gobernados de Copilot Managed Runtime.

2. **[Hey-Buddy (painebenjamin/hey-buddy)](https://github.com/painebenjamin/hey-buddy)**:
   * **Detector de Wake Words en Navegador**: Modelos ONNX y arquitectura de extracción de audio en Web Audio para detección de frases de activación como "Hey Buddy", "Hello Buddy" y palabras clave personalizadas en tiempo real sin dependencias externas.

3. **[Azure AI Foundry (Microsoft)](https://ai.azure.com/)**:
   * **GPT Live & Invocations Protocol**: Servicios de agentes de voz en tiempo real con delegación jerárquica a subagentes de desarrollo.

3. **[wZed (ScelarOrg/wZed)](https://github.com/ScelarOrg/wZed)**:
   * **Arquitectura de WebIDE en cliente**: Conceptos de Nodepod, VFS (/project), ejecución de código y terminal interactivo integrados sin romper el pipeline de renderizado 3D de WebXR.
   * **Herramientas de Agente IA (`src/lib/ai-sdk.ts`)**: Esquema de llamadas de herramientas (`read_file`, `write_file`, `list_directory`) para manipulación programática de archivos desde el orbe espacial.

2. **[Libraries.dev](https://libraries.dev/)**:
   * **Thinking Orbs** (*Jakub Antalik & Alexandr Brinza*): Modelo matemático de 9 estados cognitivos (`thinking-orbs`), implementado en el HUD 2D y en un enjambre de partículas 3D WebGL con líneas de conexión vectoriales (`connecting`).
   * **Border Beam**: Iluminación perimetral animada sobre bordes de vidrio esmerilado en HUD y ventana emergente de Spotlight.
   * **Voice Ring / Voice Glow**: Halo reactivo a la voz en tiempo real con Web Audio API.
   * **Magnetic UI**: Tensión elástica y tethers conectores al arrastrar elementos a las bandejas.

2. **[GSAP UI](https://gsap.com/ui/)**:
   * Entrada dimensional elástica con `back.out(1.5)` en modales y cápsulas.
   * Amortiguación cinemática por fotograma con `delta * 7` para auto-centrado del carrusel y retorno de objetos.

3. **Ecosistema WebXR, Three.js & React**:
   * **[Three.js](https://threejs.org/)** & **[@react-three/fiber](https://r3f.docs.pmnd.rs/)**: Motor WebGL/WebXR.
   * **[@react-three/xr](https://pmndrs.github.io/xr/)**: Soporte nativo para sesiones `immersive-vr` (Apple Vision Pro, Meta Quest, PICO Neo) y `immersive-ar` (PICO 4 Ultra Passthrough), gestión de mandos y seguimiento de manos.
   * **[@react-three/uikit](https://uikit.pmnd.rs/)** & **[@react-three/uikit-lucide](https://uikit.pmnd.rs/)**: Maquetación 3D Flexbox con fuentes MSDF e iconografía vectorial.
   * **[@react-three/handle](https://github.com/pmndrs/handle)**: Sistema de traslación y rotación espacial bimanual (`translate rotate multitouch`).
   * **[@huggingface/transformers](https://huggingface.co/docs/transformers.js)**: Modelos locales ONNX Web en navegador basados en los desarrollos de Xenova para inferencia de manos y gestos en WebAssembly.

---

## 🚀 Despliegue en GitHub Pages

Cada commit en `main` se valida y despliega automáticamente a producción mediante GitHub Actions (`.github/workflows/deploy.yml`):
* **Demo en vivo**: [https://lucahttp.github.io/spatial-workspace/](https://lucahttp.github.io/spatial-workspace/)

---

## 🛠️ Desarrollo Local

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo en red local (accesible desde tu visor o teléfono)
npm run dev
```

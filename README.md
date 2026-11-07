# PICO OS — Spatial Workspace XR

Un espacio de trabajo espacial multi-ventana interactivo para la web inmersiva (**WebXR**), optimizado para **Apple Vision Pro** (Safari visionOS 2+), **PICO 4 Ultra** (Passthrough AR), **PICO Neo / Meta Quest** (VR inmersivo) y navegadores de escritorio.

Inspirado en la ergonomía y estética de **Apple Vision OS** y **PICO OS 5**, con un diseño **Flat Design Pastel** (generous whitespace, paleta pastel azul cielo `#e0f2fe`, lavanda `#ede9fe`, menta `#d1fae5`, acentos púrpura `#7c3aed`), física cinemática de **GSAP UI**, efectos perimetrales de **Border Beam**, motor matemático de **Thinking Orbs** de Jakub Antalik, y reconocimiento cinemático/ML de manos con **Transformers.js & ONNX Runtime Web**.

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

### 8. 💻 Estudio de Código Espacial & Terminal en Navegador (Inspirado en wZed)
* **Adaptación de la arquitectura de [wZed](https://github.com/ScelarOrg/wZed)**:
  * Integramos la lógica de ejecución en cliente, sistema de archivos virtual (**VFS**) y streaming de terminal de wZed adaptados al entorno 3D espacial de **WebXR**:
    * **Sistema de Archivos Virtual (`/project/...`)**: Árbol de archivos en memoria con persistencia de instantáneas (*snapshots*), soporte para crear, editar y eliminar archivos de código (`index.js`, `shader.js`, `package.json`, `card.jsx`).
    * **Plantillas de Proyecto**: Plantilla de servidor/script Node.js simulado, generador de visualizaciones espaciales 3D, y algoritmos matemáticos en tiempo real.
    * **Motor de Ejecución en Navegador**: Ejecuta código JavaScript/Node en un entorno seguro en el cliente, capturando transmisiones de `console.log`, `console.info`, `console.warn` y errores en tiempo real.
    * **Terminal Espacial 3D**: Visor de terminal tridimensional con salida coloreada (estilo pastel ANSI), timestamp de ejecución, botón **`▶ Ejecutar`** y limpieza de buffer.
    * **Sincronización con Web Preview**: Las salidas y componentes generados se reflejan directamente en la tarjeta tridimensional de **Previsualización Web**.
    * **Puente de Herramientas IA (wZed AI SDK)**: Implementación del conjunto de herramientas de wZed (`read_file`, `write_file`, `list_directory`, `execute_command`) enlazado al Orbe Cognitivo y comandos de voz.
    * **Ventana 3D Móvil**: Integrada con la cápsula contextual (`SpatialCapsule`), permitiendo orientarla hacia el usuario (`Mirar a mí`), rotarla y reposicionarla libremente en la sala virtual.

---

## 📚 Librerías, Referencias y Ejemplos Utilizados

1. **[wZed (ScelarOrg/wZed)](https://github.com/ScelarOrg/wZed)**:
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

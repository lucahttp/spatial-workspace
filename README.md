# PICO OS — Spatial Workspace XR

Un espacio de trabajo espacial multi-ventana interactivo para la web inmersiva (**WebXR**), optimizado para **PICO 4 Ultra** (Passthrough AR), **PICO Neo / Meta Quest** (VR inmersivo) y navegadores de escritorio.

Inspirado en la estética de **visionOS** y **PICO OS 5**, con física cinemática de **GSAP UI**, efectos perimetrales de **Border Beam** y el motor matemático de **Thinking Orbs** de Jakub Antalik.

---

## 🌟 Características Principales

* **Orbe de Voz 3D Cognitivo**:
  * Motor matemático de partículas en 3D (`thinking-orbs`) evaluando los 9 estados en tiempo real (`breathing`, `listening`, `searching`, `working`, `solving`, `connecting`, `weaving`, `composing`, `shaping`).
  * Conexiones vectoriales dinámicas en 3D para el estado `connecting`.
  * *Voice Ring / Voice Glow* reactivo a la amplitud del micrófono.
* **Ventanas de Cristal Líquido (*Liquid Frosted Glass*)**:
  * Borde superior con reflejo especular (*specular glint*).
  * Halos volumétricos y bloom atmosférico con mezcla aditiva.
  * Encabezados con *traffic lights* interactivos de visionOS y barra de agarre inferior (*grab handle*).
* **Carrusel Curvo Ergonómico**:
  * Distribución angular en arco que respeta el cono de confort visual PICO (±33.5° horizontal).
  * Deslizamiento cinemático con resortes y controles de navegación esmerilados `<` y `>`.
* **Dock Espacial Flotante**:
  * Barra de herramientas inferior con halo ambiental y retroalimentación táctil de elevación al apuntar con punteros o mandos.
* **Bandejas 3D de Archivar y Descartar**:
  * Bandeja de documentos verdes con borde esmeralda (*Archivar*) y tacho de titanio oscuro con aro de coral (*Basura*).
  * Línea de tensión elástica magnética al arrastrar tarjetas hacia las bandejas.
* **Navegador Espacial / Web Preview**:
  * Vista previa de documentos con barra de direcciones segura, píldora de lectura y etiquetas de fuentes interconectadas en el mapa de ideas.
* **Microinteracciones GSAP & Border Beam**:
  * Perímetros de luz animados en el HUD superior y la ventana modal de *+ Spotlight*.
  * Transición de apertura con desaceleración elástica `back.out(1.5)`.

---

## 🚀 Despliegue en GitHub Pages

Este proyecto incluye un flujo de integración y despliegue continuo con GitHub Actions (`.github/workflows/deploy.yml`). Cada `push` a la rama `main` construye y publica automáticamente la aplicación en GitHub Pages.

---

## 🛠️ Desarrollo Local

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo con acceso en red local (para visores)
npm run dev

# Compilar para producción
npm run build

# Previsualizar compilación
npm run preview
```

---

## 👓 Probar en Visores XR (PICO / Quest / Wolvic)

1. Abre el navegador del visor (PICO Browser o Wolvic).
2. Ingresa a la URL de GitHub Pages (o a tu IP local si estás en desarrollo: `http://<tu-ip>:5173/`).
3. Haz clic en **Passthrough AR (Pico 4 Ultra)** o **VR (Pico Neo)** en la barra superior.
4. Interactúa con las tarjetas mediante raycasting o seguimiento de manos (*hand tracking*).

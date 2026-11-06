# PICO OS — Spatial Workspace XR

Un espacio de trabajo espacial multi-ventana interactivo para la web inmersiva (**WebXR**), optimizado para **PICO 4 Ultra** (Passthrough AR), **PICO Neo / Meta Quest** (VR inmersivo) y navegadores de escritorio.

Inspirado en la estética de **Apple Vision OS** y **PICO OS 5**, con un diseño **Flat Design Pastel** (generous whitespace, paleta pastel azul cielo `#e0f2fe`, lavanda `#ede9fe`, menta `#d1fae5`, acentos púrpura `#7c3aed`), física cinemática de **GSAP UI**, efectos perimetrales de **Border Beam** y el motor matemático de **Thinking Orbs** de Jakub Antalik.

---

## 🌟 Características Principales

* **Estética Flat Design Pastel & Apple Vision OS**:
  * Principios de diseño visual limpio: el espacio en blanco guía la atención del usuario, cada elemento tiene un propósito claro y se evitan detalles innecesarios.
  * Tarjetas con esquinas suaves redondeadas, barra de acento cian/violeta y tipografía de alto contraste legible en 3D.
  * Sombras de profundidad realistas (visionOS depth shadows) en lugar de brillos cegadores o saturación excesiva.
* **Orbe de Voz 3D Cognitivo**:
  * Motor matemático de partículas en 3D (`thinking-orbs`) evaluando los 9 estados en tiempo real (`breathing`, `listening`, `searching`, `working`, `solving`, `connecting`, `weaving`, `composing`, `shaping`).
  * Conexiones vectoriales dinámicas en 3D para el estado `connecting`.
  * *Voice Ring / Voice Glow* reactivo a la amplitud del micrófono.
* **Ventanas de Cristal Líquido (*Liquid Frosted Glass*)**:
  * Borde superior con reflejo especular (*specular glint*).
  * Encabezados con *traffic lights* interactivos de visionOS y barra de agarre inferior (*grab handle*).
* **Carrusel Curvo Ergonómico**:
  * Distribución angular en arco que respeta el cono de confort visual PICO (±33.5° horizontal).
  * Tarjetas pasteles con botón de favorito interactivo (corazón púrpura `#7c3aed`), subrayado de acento y botón píldora sólido de acción principal.
  * Controles de ventana discretos integrados en la barra de arrastre (minimizar/archivar y cerrar/descartar).
  * Deslizamiento cinemático con resortes y controles de navegación esmerilados `<` y `>`.
* **Dock Espacial Flotante**:
  * Barra de herramientas inferior inspirada en la navegación visionOS: iconos contorneados limpios (Inicio, Favoritos, Agenda, Voz), botón circular flotante `+` en violeta pastel y píldora `Centrar`.
* **Navegador Espacial / Web Preview**:
  * Vista previa editorial con barra de direcciones segura, selector de favorito, calificación interactiva de 5 estrellas, control deslizante (*reading progress slider*) interactivo con thumb violeta y etiquetas de fuentes interconectadas.
* **Bandejas 3D Físicas de Archivar y Descartar**:
  * Plinto minimalista de hojas documentales apiladas en verde pastel (*Archivar*) y cilindro mate de grafito con aro coral (*Basura*).
  * Soporte de arrastre espacial con física y detección de colisión.
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

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

## 📚 Librerías, Referencias y Ejemplos Utilizados

Para la concepción, diseño y construcción de este workspace espacial se integraron las siguientes tecnologías, librerías y patrones de diseño:

### 1. UI Effects & Models for AI Interfaces ([Libraries.dev](https://libraries.dev/))
* **[Thinking Orbs](https://libraries.dev/orbs)** (*creado por Jakub Antalik con ayuda de Alexandr Brinza*):
  * **9 estados cognitivos animados a mano**: `breathing`, `listening`, `searching`, `working`, `solving`, `connecting`, `weaving`, `composing` y `shaping`.
  * **Integración dual 2D/3D**:
    * **HUD 2D**: Componente React `<ThinkingOrb state={orb} size={20} theme="dark" />` que muestra el estado mental activo del agente en tiempo real.
    * **Espacio 3D WebGL**: Mapeo tridimensional en Three.js con nube de partículas matemáticas animadas (`points`), órbitas dinámicas y líneas vectoriales interconectadas en tiempo real para el estado `connecting`.
* **[Border Beam](https://libraries.dev/)**:
  * Efecto de borde luminoso perimetral viajero sobre cápsulas de vidrio esmerilado. Utilizado en la píldora superior del HUD (`colorVariant="ocean"`) y en la ventana emergente de Spotlight (`colorVariant="forest"`).
* **Conceptos espaciales adaptados de Libraries.dev**:
  * **Voice Ring / Voice Glow**: Ondas de pulso visual reactivas a la amplitud vocal capturada mediante el micrófono.
  * **Magnetic UI**: Tensión física y acoplamiento elástico al aproximar tarjetas a las bandejas inferiores de *Archivar* y *Basura*.

### 2. Animación Cinemática & Físicas ([GSAP UI](https://gsap.com/ui/))
* **Curvas elásticas de movimiento**: Uso de `gsap.fromTo` con flexibilización `back.out(1.5)` para la entrada dimensional de ventanas modales y paneles espaciales.
* **Interpolación temporal suave (lerp)**: Cálculo cinemático por fotograma (`delta * 7`) para la navegación angular en arco del carrusel, la elevación de tarjetas en hover y la amortiguación del retorno elástico tras el arrastre.

### 3. Principios de Diseño: Flat Design Pastel & Apple Vision OS
* **Bocetos conceptuales en libreta**:
  * **Boceto 1**: Disposición del orbe cognitivo a la izquierda (con transcripción debajo) y gran ventana de navegación/previsualización web a la derecha.
  * **Boceto 2**: Carrusel curvo de documentos en el plano medio, atajo *+ Spotlight* para añadir Google Docs / búsquedas, mapa de constelación de *Idea y Fuentes*, y pedestales físicos inferiores para *Archivar* y *Basura*.
* **Guía de Estilo Flat Design Pastel**:
  * *Paleta cromática*: Azul cielo suave (`#e0f2fe`), lavanda tenue (`#ede9fe`), menta fresca (`#d1fae5`), ámbar pastel (`#fef3c7`), combinados con acentos sólidos en púrpura (`#7c3aed`) y cian espacial (`#0ea5e9`).
  * *Tipografía y contraste*: Texto en grafito/pizarra oscura (`#0f172a`, `#334155`) sobre las tarjetas pastel para máxima legibilidad óptica en entornos XR, con barras de subrayado de acento para guiar la atención.
  * *Elementos interactivos*:
    * **Toggle de Favorito**: Corazón púrpura interactivo (`HeartIcon`) en la esquina superior de cada tarjeta y en la barra de URL del navegador.
    * **Calificación interactiva**: Componente de 5 estrellas con selección al vuelo.
    * **Reading Progress Slider**: Barra de progreso de lectura con cursor circular púrpura y doble pista.
    * **Dock Flotante**: Barra de herramientas con iconos contorneados (`HouseIcon`, `BookmarkIcon`, `CalendarIcon`, `MicIcon`), botón circular flotante `+` en `#7c3aed` y píldora `Centrar` con lápiz.
    * **Sombras de profundidad visionOS**: Planos de oclusión suave (`opacity={0.32}`) que anclan visualmente las tarjetas en el espacio tridimensional sin recurrir a brillos saturados invasivos.

### 4. Ecosistema WebXR, Three.js & React
* **[Three.js](https://threejs.org/)** & **[@react-three/fiber](https://r3f.docs.pmnd.rs/)**: Motor de renderizado WebGL/WebXR con pipelines de sombreado suave, transparencia alpha y buffer de dibujo persistente.
* **[@react-three/xr](https://pmndrs.github.io/xr/)**: Gestión avanzada de sesiones inmersivas WebXR para `immersive-ar` (Passthrough en PICO 4 Ultra) y `immersive-vr` (PICO Neo y Meta Quest) con seguimiento de manos (*hand tracking*).
* **[@react-three/uikit](https://uikit.pmnd.rs/)** & **[@react-three/uikit-lucide](https://uikit.pmnd.rs/)**: Motor de maquetación Flexbox en espacio tridimensional con renderizado de texto mediante MSDF (Signed Distance Fields) e iconografía vectorial espacial.
* **[@react-three/handle](https://github.com/pmndrs/handle)**: Sistema de manipuladores y gizmos espaciales para mover ventanas y tarjetas mediante rayos de puntero o dedos en seguimiento de manos.
* **[@iwer/extension-bridge](https://www.npmjs.com/package/@iwer/extension-bridge)** & **[@iwer/sem](https://www.npmjs.com/package/@iwer/sem)**: Emulación y depuración de entornos WebXR para pruebas precisas desde navegadores de escritorio.

### 5. Estado Global y Audio Reactivo
* **[Zustand](https://github.com/pmndrs/zustand)**: Store reactivo y desacoplado para gestionar tarjetas, filtros del dock, estado del orbe, documentos archivados/descartados, ratings y progreso de lectura.
* **Web Audio API (`AudioContext` + `AnalyserNode`)**: Monitoreo en vivo de la frecuencia y amplitud del micrófono para modular el orbe cognitivo en modo escucha.

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

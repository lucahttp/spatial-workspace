/**
 * VisionOS & PICO OS 5 inspired spatial design tokens.
 * Minimalist, ultra-clean frosted glass with precise optical hierarchy.
 */

export const color = {
  // Deep spatial void & studio ambient
  bg: '#070b16',
  voidDepth: '#030509',
  surfaceStudio: 'rgba(15, 23, 42, 0.65)',

  // Glass surfaces (layered translucency inspired by VisionOS & Libraries.dev)
  glassPanel: 'rgba(10, 16, 30, 0.82)',
  glassPanelDeep: 'rgba(6, 10, 20, 0.92)',
  glassPanelHeader: 'rgba(18, 28, 48, 0.88)',
  glassCard: 'rgba(13, 20, 36, 0.85)',
  glassCardActive: 'rgba(20, 34, 60, 0.94)',
  glassCardHover: 'rgba(26, 42, 72, 0.92)',
  glassCardSpotlight: 'rgba(8, 28, 22, 0.92)',
  glassDock: 'rgba(9, 14, 26, 0.88)',
  glassUrlBar: 'rgba(3, 7, 18, 0.80)',

  // Specular Hairlines & Border Beams
  borderSubtle: 'rgba(255, 255, 255, 0.14)',
  borderSpecular: 'rgba(255, 255, 255, 0.45)', // Crisp top refraction glint
  borderHairline: 'rgba(255, 255, 255, 0.20)',
  borderHover: 'rgba(255, 255, 255, 0.35)',
  borderActive: '#38bdf8',                     // Electric Cyan Beam
  borderSpotlight: '#34d399',                  // Emerald Jade Beam
  borderGlow: 'rgba(56, 189, 248, 0.35)',

  // Typography (aliases for compatibility)
  text: '#ffffff',
  textPrimary: '#ffffff',
  textSecondary: '#cbd5e1',
  textDim: '#94a3b8',
  textMuted: '#64748b',
  textFaint: '#475569',

  // Semantic Accents
  accent: '#38bdf8',       // Electric Cyan / Voice / Primary
  accentDim: '#0284c7',    // Deep Sky Blue
  accentGlow: 'rgba(56, 189, 248, 0.40)',

  success: '#34d399',      // Jade Emerald / Archive
  successDim: '#059669',   // Forest Jade
  successGlow: 'rgba(52, 211, 153, 0.40)',

  danger: '#fb7185',       // Soft Coral Rose / Trash
  dangerDim: '#e11d48',    // Deep Crimson
  dangerGlow: 'rgba(251, 113, 133, 0.40)',

  idea: '#fbbf24',         // Warm Amber / Idea node
  ideaDim: '#d97706',      // Golden Ochre
  ideaGlow: 'rgba(251, 191, 36, 0.45)',

  purple: '#c084fc',       // Synth Violet / Research
  purpleDim: '#9333ea',    // Royal Purple
  purpleGlow: 'rgba(192, 132, 252, 0.40)',
} as const

/**
 * Ergonomic spatial layout in metres authored from eye level (0, 1.30, 0).
 * Conforms to PICO comfort cone (+/-33.5 deg horizontal, +/-20 vertical).
 */
export const layout = {
  // Center: Curved Carousel (Boceto 2)
  carouselY: 1.25,
  cardW: 0.30,
  cardH: 0.42,

  // Right: Large Web / Doc Preview Window angled ergonomically towards viewer (Boceto 1)
  previewX: 1.18,
  previewY: 1.25,
  previewZ: -1.36,
  previewRotY: -0.38, // -22 deg inward tilt
  previewW: 0.76,
  previewH: 0.54,

  // Left: Voice Orb + Transcript Column angled ergonomically towards viewer (Boceto 1)
  leftX: -1.18,
  leftY: 1.22,
  leftZ: -1.36,
  leftRotY: 0.38, // +22 deg inward tilt
  leftW: 0.46,
  leftH: 0.38,
  orbY: 1.50,
  orbZ: -1.32,

  // Top Left: Idea & Sources Constellation (Boceto 2)
  graphX: -1.05,
  graphY: 1.70,
  graphZ: -1.42,

  // Lower Desk Level: Archivar (Left) & Basura (Right) Pedestals (Boceto 2)
  padX: 0.38,
  padY: 0.74,
  padZ: -1.12,

  // Bottom Base: Floating Glass Launcher Dock
  dockY: 0.54,
  dockZ: -0.92,
  dockW: 0.72,
} as const

export const type = {
  hero: 22,
  title: 16,
  section: 14,
  body: 11,
  caption: 10,
  micro: 9,
} as const

export const radius = {
  window: 24,
  card: 18,
  dock: 24,
  button: 10,
  pill: 999,
} as const

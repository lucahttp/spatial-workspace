/**
 * VisionOS & PICO OS 5 inspired spatial design tokens.
 * Minimalist, ultra-clean frosted glass with precise optical hierarchy.
 */

export const color = {
  // Deep spatial void & studio ambient
  bg: '#070b16',
  voidDepth: '#030509',
  surfaceStudio: 'rgba(15, 23, 42, 0.65)',

  // VisionOS frosted glass surfaces
  glassPanel: 'rgba(15, 23, 42, 0.72)',
  glassPanelDeep: 'rgba(10, 16, 30, 0.85)',
  glassPanelHeader: 'rgba(255, 255, 255, 0.08)',
  glassDock: 'rgba(15, 23, 42, 0.80)',
  glassUrlBar: 'rgba(255, 255, 255, 0.10)',

  // Flat Pastel Card Surfaces (User references: uploaded_media_2 & uploaded_media_3)
  glassCard: '#e0f2fe',            // Soft pastel sky blue
  glassCardHover: '#dbeafe',       // Slightly deeper pastel sky
  glassCardActive: '#bae6fd',      // Active pastel cyan
  glassCardSpotlight: '#ede9fe',   // Soft pastel lavender / purple
  glassCardMint: '#d1fae5',        // Soft pastel mint

  // Text colors for Pastel cards (high contrast & legibility)
  cardTextPrimary: '#0f172a',      // Dark slate primary text
  cardTextSecondary: '#334155',    // Slate secondary text
  cardTextDim: '#64748b',          // Muted slate
  cardTextFaint: '#94a3b8',

  // Specular Hairlines & Crisp Outlines
  borderSubtle: 'rgba(255, 255, 255, 0.22)',
  borderSpecular: 'rgba(255, 255, 255, 0.65)',
  borderHairline: 'rgba(255, 255, 255, 0.35)',
  borderCard: 'rgba(255, 255, 255, 0.75)',
  borderHover: '#38bdf8',
  borderActive: '#0284c7',
  borderSpotlight: '#7c3aed',
  borderGlow: 'rgba(56, 189, 248, 0.25)',

  // General Spatial Typography
  text: '#ffffff',
  textPrimary: '#ffffff',
  textSecondary: '#cbd5e1',
  textDim: '#94a3b8',
  textMuted: '#64748b',
  textFaint: '#475569',

  // Flat & Pastel Accents
  accent: '#0ea5e9',               // Flat Sky Blue (Button in uploaded_media_3)
  accentDim: '#0284c7',            // Deep Sky Blue
  accentGlow: 'rgba(14, 165, 233, 0.30)',

  purple: '#7c3aed',               // Flat Purple / Heart / Dock + (uploaded_media_2)
  purpleLight: '#ede9fe',          // Pastel lavender
  purpleDim: '#6d28d9',
  purpleGlow: 'rgba(124, 58, 237, 0.30)',

  success: '#10b981',              // Flat Emerald / Mint
  successLight: '#d1fae5',
  successDim: '#059669',
  successGlow: 'rgba(16, 185, 129, 0.30)',

  danger: '#f43f5e',               // Flat Coral Rose / Trash
  dangerLight: '#ffe4e6',
  dangerDim: '#e11d48',
  dangerGlow: 'rgba(244, 63, 94, 0.30)',

  idea: '#f59e0b',                 // Warm Amber / Star rating
  ideaLight: '#fef3c7',
  ideaDim: '#d97706',
  ideaGlow: 'rgba(245, 158, 11, 0.30)',
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
  dockW: 0.88,
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

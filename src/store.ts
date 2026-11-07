import { create } from 'zustand'
import { playArchiveSound, playClickSound, playSpotlightSound, playTrashSound } from './sound'
import { layout } from './theme'

export type OrbState =
  | 'breathing'
  | 'listening'
  | 'searching'
  | 'working'
  | 'solving'
  | 'connecting'
  | 'weaving'
  | 'composing'
  | 'shaping'

export type Card = {
  id: string
  badge: string
  title: string
  url: string
  summary: string
  /** true for the "+ Spotlight" seed card */
  isSpotlight?: boolean
  favorite?: boolean
  rating?: number
  readProgress?: number
  /** When detached, card floats independently in 3D space outside carousel */
  detached?: boolean
  position?: [number, number, number]
  rotation?: [number, number, number]
}

export type Source = {
  id: string
  title: string
  badge: string
  url: string
}

export type Droplet = {
  id: string
  start: [number, number, number]
  end: [number, number, number]
}

export type Mode = 'carousel' | 'focus'

type Workspace = {
  cards: Card[]
  selectedId: string | null
  sources: Source[]
  orb: OrbState
  transcript: string[]
  mode: Mode
  /** panel id -> hidden */
  hidden: Record<string, boolean>
  /** last action, surfaced in the status line */
  status: string
  /** bumped to ask the workspace to re-anchor at eye height */
  recenterTick: number
  /** active animated droplets travelling to IdeaGraph */
  droplets: Droplet[]

  /** Spatial transforms for movable groups & objects */
  carouselPosition: [number, number, number]
  carouselRotation: [number, number, number]
  graphPosition: [number, number, number]
  graphRotation: [number, number, number]
  orbPosition: [number, number, number]
  archivePosition: [number, number, number]
  trashPosition: [number, number, number]
  isGripActive: boolean

  /** Voice interaction & Hey-Buddy wake word state */
  voiceListening: boolean
  voiceTranscript: string
  voiceResponse: string | null
  wakeWordEnabled: boolean

  select: (id: string) => void
  toggleFavorite: (id: string) => void
  setRating: (id: string, rating: number) => void
  setProgress: (id: string, progress: number) => void
  spawnSpotlight: (custom?: { title: string; summary: string; badge: string; url: string }) => void
  archive: (id: string, startPos?: [number, number, number]) => void
  discard: (id: string) => void
  detachCard: (id: string, position?: [number, number, number]) => void
  reattachCard: (id: string) => void
  updateCardTransform: (id: string, pos: [number, number, number], rot?: [number, number, number]) => void
  setCarouselTransform: (pos: [number, number, number], rot?: [number, number, number]) => void
  setGraphTransform: (pos: [number, number, number], rot?: [number, number, number]) => void
  setOrbPosition: (pos: [number, number, number]) => void
  setArchivePosition: (pos: [number, number, number]) => void
  setTrashPosition: (pos: [number, number, number]) => void
  setIsGripActive: (active: boolean) => void
  setVoiceListening: (v: boolean) => void
  setVoiceTranscript: (t: string) => void
  setVoiceResponse: (r: string | null) => void
  setWakeWordEnabled: (v: boolean) => void
  removeDroplet: (id: string) => void
  setOrb: (s: OrbState) => void
  setTranscript: (lines: string[]) => void
  setStatus: (s: string) => void
  toggleMode: (m: Mode) => void
  toggleHidden: (id: string) => void
  showAll: () => void
  recenter: () => void
}

const SEED: Card[] = [
  {
    id: 'spotlight',
    badge: 'SPOTLIGHT',
    title: '+ Nueva búsqueda',
    url: 'spotlight://new',
    summary: 'Buscar, crear un Google Doc o abrir una fuente nueva.',
    isSpotlight: true,
  },
  {
    id: 'doc-spatial',
    badge: 'GOOGLE DOC',
    title: 'Diseño Spatial UI en Pico',
    url: 'https://docs.google.com/spatial-pico-spec',
    summary: 'Especificación de ventanas con barrita inferior, snap magnético y grafo de ideas.',
    favorite: true,
    rating: 5,
    readProgress: 65,
  },
  {
    id: 'web-wolvic',
    badge: 'WEB',
    title: 'Wolvic & WebXR Layers',
    url: 'https://wolvic.com/webxr-layers',
    summary: 'Integración de navegador espacial multi-ventana y puente nativo SystemBridge.',
    favorite: false,
    rating: 4,
    readProgress: 40,
  },
  {
    id: 'note-xr',
    badge: 'RESEARCH PAPER',
    title: 'Spatial Ergonomics 2026',
    url: 'https://arxiv.org/abs/spatial-ux-2026',
    summary: 'Cono de confort visual de 33.5 grados, anti-fatiga cervical y físicas magnéticas.',
    favorite: true,
    rating: 5,
    readProgress: 85,
  },
]

export const useWorkspace = create<Workspace>((set, get) => ({
  cards: SEED,
  selectedId: SEED[1].id,
  sources: [
    {
      id: 'src-seed',
      title: 'Arquitectura WebXR Pico',
      badge: 'DOC',
      url: 'https://developer.picoxr.com/webxr',
    },
  ],
  orb: 'breathing',
  transcript: ['Asistente espacial listo. Apuntá a una tarjeta o hablale al Orbe.'],
  mode: 'carousel',
  hidden: {},
  status: 'Apuntá a una tarjeta, al dock o arrastrá a las bandejas',
  recenterTick: 0,
  droplets: [],
  carouselPosition: [0, 0, 0],
  carouselRotation: [0, 0, 0],
  graphPosition: [layout.graphX, layout.graphY, layout.graphZ],
  graphRotation: [0, 0, 0],
  orbPosition: [layout.leftX, layout.orbY, layout.orbZ],
  archivePosition: [-layout.padX, layout.padY, layout.padZ],
  trashPosition: [layout.padX, layout.padY, layout.padZ],
  isGripActive: false,
  voiceListening: false,
  voiceTranscript: '',
  voiceResponse: null,
  wakeWordEnabled: true,

  select: (id) => {
    playClickSound()
    set({ selectedId: id, mode: 'focus' })
    const card = get().cards.find((c) => c.id === id)
    if (card && !card.isSpotlight) {
      set({
        orb: 'working',
        transcript: [`Leyendo: ${card.title}`, `URL: ${card.url}`, 'Listo para archivar en Idea o descartar.'],
      })
      setTimeout(() => set({ orb: 'breathing' }), 2000)
    }
  },

  toggleFavorite: (id) => {
    playClickSound()
    set({
      cards: get().cards.map((c) => (c.id === id ? { ...c, favorite: !c.favorite } : c)),
    })
  },

  setRating: (id, rating) => {
    playClickSound()
    set({
      cards: get().cards.map((c) => (c.id === id ? { ...c, rating } : c)),
    })
  },

  setProgress: (id, progress) => {
    set({
      cards: get().cards.map((c) => (c.id === id ? { ...c, readProgress: progress } : c)),
    })
  },

  spawnSpotlight: (custom) => {
    playSpotlightSound()
    const n = get().cards.length + 1
    const card: Card = custom
      ? {
          id: `custom-${Date.now()}`,
          badge: custom.badge || 'SPOTLIGHT',
          title: custom.title,
          url: custom.url || `spotlight://doc-${n}`,
          summary: custom.summary,
        }
      : {
          id: `gen-${Date.now()}`,
          badge: `SPOTLIGHT #${n}`,
          title: `Fuente XR #${n}: Spatial UI`,
          url: `https://docs.google.com/xr-note-${n}`,
          summary: 'Documento generado desde Spotlight con soporte de arrastre y archivo directo.',
        }
    set({
      cards: [...get().cards, card],
      selectedId: card.id,
      orb: 'searching',
      status: `Nueva tarjeta: ${card.title}`,
      transcript: [`Buscando fuentes para "${card.title}"…`, 'Tarjeta añadida al Carrusel de cosas.'],
    })
    setTimeout(() => set({ orb: 'composing' }), 900)
    setTimeout(() => set({ orb: 'breathing' }), 2600)
  },

  archive: (id, startPos) => {
    const card = get().cards.find((c) => c.id === id)
    if (!card || card.isSpotlight) return
    playArchiveSound()

    const dropStart: [number, number, number] = startPos || [-layout.padX, layout.padY, layout.padZ]
    const dropEnd: [number, number, number] = [layout.graphX, layout.graphY, layout.graphZ]
    const newDroplet: Droplet = {
      id: `drop-${Date.now()}`,
      start: dropStart,
      end: dropEnd,
    }

    set({
      cards: get().cards.filter((c) => c.id !== id),
      sources: [...get().sources, { id: card.id, title: card.title, badge: card.badge, url: card.url }],
      orb: 'connecting',
      status: `Archivado en Idea: ${card.title}`,
      transcript: [`"${card.title}" sumado al grafo de Idea y Fuentes.`, 'Nodo conectado con éxito.'],
      droplets: [...get().droplets, newDroplet],
    })

    setTimeout(() => set({ orb: 'weaving' }), 500)
    setTimeout(() => set({ orb: 'breathing' }), 2200)
  },

  discard: (id) => {
    const card = get().cards.find((c) => c.id === id)
    if (!card || card.isSpotlight) return
    playTrashSound()
    set({
      cards: get().cards.filter((c) => c.id !== id),
      orb: 'shaping',
      status: `Descartado a Basura: ${card.title}`,
      transcript: [`Tarjeta descartada: "${card.title}".`],
    })
    setTimeout(() => set({ orb: 'breathing' }), 1400)
  },

  detachCard: (id, position) => {
    playClickSound()
    const card = get().cards.find((c) => c.id === id)
    if (!card) return
    const defaultPos: [number, number, number] = position || [0, layout.carouselY + 0.1, -0.9]
    set({
      cards: get().cards.map((c) =>
        c.id === id ? { ...c, detached: true, position: defaultPos, rotation: [0, 0, 0] } : c
      ),
      status: `Tarjeta desprendida: ${card.title} (flotante)`,
      transcript: [`"${card.title}" extraída del carrusel. Puedes moverla libremente.`],
    })
  },

  reattachCard: (id) => {
    playClickSound()
    const card = get().cards.find((c) => c.id === id)
    if (!card) return
    set({
      cards: get().cards.map((c) =>
        c.id === id ? { ...c, detached: false, position: undefined, rotation: undefined } : c
      ),
      status: `Tarjeta re-acoplada al carrusel: ${card.title}`,
      transcript: [`"${card.title}" devuelta al Carrusel de fuentes.`],
    })
  },

  updateCardTransform: (id, pos, rot) => {
    set({
      cards: get().cards.map((c) =>
        c.id === id ? { ...c, position: pos, rotation: rot || c.rotation } : c
      ),
    })
  },

  setCarouselTransform: (carouselPosition, carouselRotation) => {
    set({
      carouselPosition,
      carouselRotation: carouselRotation || get().carouselRotation,
    })
  },

  setGraphTransform: (graphPosition, graphRotation) => {
    set({
      graphPosition,
      graphRotation: graphRotation || get().graphRotation,
    })
  },

  setOrbPosition: (orbPosition) => set({ orbPosition }),
  setArchivePosition: (archivePosition) => set({ archivePosition }),
  setTrashPosition: (trashPosition) => set({ trashPosition }),
  setIsGripActive: (isGripActive) => set({ isGripActive }),
  setVoiceListening: (voiceListening) => set({ voiceListening }),
  setVoiceTranscript: (voiceTranscript) => set({ voiceTranscript }),
  setVoiceResponse: (voiceResponse) => set({ voiceResponse }),
  setWakeWordEnabled: (wakeWordEnabled) => set({ wakeWordEnabled }),

  removeDroplet: (id) => {
    set({ droplets: get().droplets.filter((d) => d.id !== id) })
  },

  setOrb: (orb) => set({ orb }),
  setTranscript: (transcript) => set({ transcript }),
  setStatus: (status) => set({ status }),
  recenter: () => set({ recenterTick: get().recenterTick + 1 }),
  toggleMode: (mode) => set({ mode }),
  toggleHidden: (id) => set({ hidden: { ...get().hidden, [id]: !get().hidden[id] } }),
  showAll: () => set({ hidden: {} }),
}))

import { Root } from '@react-three/uikit'
import { inter } from '@pmndrs/msdfonts/inter'
import { ComponentProps } from 'react'

export const FONT_FAMILY = 'inter'

export const APP_FONT_FAMILIES = {
  inter: {
    light: inter.light,
    normal: inter.medium,
    medium: inter.medium,
    'semi-bold': inter['semi-bold'],
    bold: inter.bold,
    400: inter.medium,
    500: inter.medium,
    600: inter['semi-bold'],
    700: inter.bold,
  },
}

export function FontProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

/** Local font for troika/drei <Text>. */
export const DREI_FONT = '/fonts/Roboto-Regular.ttf'

/**
 * Normalizes text to ensure all glyphs exist in the standard MSDF atlas,
 * preventing missing glyph warnings and dropped letters in Spanish.
 */
export function cleanText(str: string | undefined | null): string {
  if (!str) return ''
  return str
    .replace(/[áäàâ]/gi, (c) => (c === 'Á' ? 'A' : 'a'))
    .replace(/[éëèê]/gi, (c) => (c === 'É' ? 'E' : 'e'))
    .replace(/[íïìî]/gi, (c) => (c === 'Í' ? 'I' : 'i'))
    .replace(/[óöòô]/gi, (c) => (c === 'Ó' ? 'O' : 'o'))
    .replace(/[úüùû]/gi, (c) => (c === 'Ú' ? 'U' : 'u'))
    .replace(/[ñ]/g, 'n')
    .replace(/[Ñ]/g, 'N')
    .replace(/[—–]/g, '-')
    .replace(/[·•]/g, '>')
    .replace(/[«»“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[×]/g, 'x')
    .replace(/[¿¡]/g, '')
}

export function UiRoot(props: ComponentProps<typeof Root>) {
  return (
    <Root
      fontFamily={FONT_FAMILY}
      fontFamilies={APP_FONT_FAMILIES as never}
      {...props}
    />
  )
}

import { Container, Text } from '@react-three/uikit'
import {
  BookOpenIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  LockIcon,
  RotateCwIcon,
  ShareIcon,
  SparklesIcon,
} from '@react-three/uikit-lucide'
import { useWorkspace } from '../store'
import { color, layout, radius, type as typeScale } from '../theme'
import { Panel } from './Panel'
import { cleanText } from './Ui'

export function Preview() {
  const cards = useWorkspace((s) => s.cards)
  const selectedId = useWorkspace((s) => s.selectedId)
  const select = useWorkspace((s) => s.select)
  const selected = cards.find((c) => c.id === selectedId) ?? cards[0]
  const sources = useWorkspace((s) => s.sources)

  return (
    <Panel
      title="Web Preview"
      subtitle="Navegador Espacial"
      accent={color.accent}
      width={layout.previewW}
      height={layout.previewH}
      position={[layout.previewX, layout.previewY, layout.previewZ]}
      rotation={[0, layout.previewRotY, 0]}
    >
      {selected ? (
        <Container flexDirection="column" width="100%" flexGrow={1}>
          {/* Top Browser Bar: Navigation chevrons + URL capsule + Reader actions */}
          <Container
            width="100%"
            height={34}
            flexDirection="row"
            alignItems="center"
            justifyContent="space-between"
            paddingLeft={8}
            paddingRight={8}
            backgroundColor={color.glassUrlBar}
            borderColor={color.borderSubtle}
            borderTopWidth={1}
            borderBottomWidth={1}
            borderLeftWidth={1}
            borderRightWidth={1}
            borderTopLeftRadius={radius.button}
            borderTopRightRadius={radius.button}
            borderBottomLeftRadius={radius.button}
            borderBottomRightRadius={radius.button}
            flexShrink={0}
            marginBottom={14}
          >
            {/* Back / Forward chevrons */}
            <Container flexDirection="row" alignItems="center" gapColumn={4}>
              <Container
                width={22}
                height={22}
                alignItems="center"
                justifyContent="center"
                backgroundColor="rgba(255,255,255,0.06)"
                borderTopLeftRadius={6}
                borderTopRightRadius={6}
                borderBottomLeftRadius={6}
                borderBottomRightRadius={6}
              >
                <ChevronLeftIcon width={12} color={color.textDim} />
              </Container>
              <Container
                width={22}
                height={22}
                alignItems="center"
                justifyContent="center"
                backgroundColor="rgba(255,255,255,0.06)"
                borderTopLeftRadius={6}
                borderTopRightRadius={6}
                borderBottomLeftRadius={6}
                borderBottomRightRadius={6}
              >
                <ChevronRightIcon width={12} color={color.textDim} />
              </Container>
            </Container>

            {/* URL Search / Address Pill */}
            <Container
              flexDirection="row"
              alignItems="center"
              justifyContent="center"
              gapColumn={6}
              paddingLeft={12}
              paddingRight={12}
              height={24}
              backgroundColor="rgba(0,0,0,0.4)"
              borderTopLeftRadius={12}
              borderTopRightRadius={12}
              borderBottomLeftRadius={12}
              borderBottomRightRadius={12}
              flexGrow={1}
              marginLeft={8}
              marginRight={8}
            >
              <LockIcon width={10} color={color.success} />
              <Text fontSize={10} color={color.accent} fontWeight={500}>
                {cleanText(selected.url)}
              </Text>
            </Container>

            {/* Quick Actions */}
            <Container flexDirection="row" alignItems="center" gapColumn={6}>
              <RotateCwIcon width={12} color={color.textDim} />
              <BookOpenIcon width={12} color={color.accent} />
              <ShareIcon width={12} color={color.textDim} />
            </Container>
          </Container>

          {/* Document Content View */}
          <Container
            flexDirection="column"
            width="100%"
            flexGrow={1}
            paddingLeft={4}
            paddingRight={4}
            gapRow={8}
          >
            {/* Meta badge row */}
            <Container flexDirection="row" alignItems="center" gapColumn={8}>
              <Container
                flexDirection="row"
                alignItems="center"
                gapColumn={4}
                paddingLeft={8}
                paddingRight={8}
                paddingTop={3}
                paddingBottom={3}
                backgroundColor={selected.isSpotlight ? 'rgba(52,211,153,0.18)' : 'rgba(56,189,248,0.15)'}
                borderColor={selected.isSpotlight ? color.success : color.accent}
                borderTopWidth={1}
                borderBottomWidth={1}
                borderLeftWidth={1}
                borderRightWidth={1}
                borderTopLeftRadius={999}
                borderTopRightRadius={999}
                borderBottomLeftRadius={999}
                borderBottomRightRadius={999}
              >
                <SparklesIcon width={10} color={selected.isSpotlight ? color.success : color.accent} />
                <Text
                  fontSize={typeScale.micro}
                  fontWeight={700}
                  color={selected.isSpotlight ? color.success : color.accent}
                  letterSpacing={0.5}
                >
                  {cleanText(selected.badge)}
                </Text>
              </Container>

              <Text fontSize={typeScale.micro} color={color.textDim}>
                {cleanText('Documento verificado · Tiempo de lectura: 4 min')}
              </Text>
            </Container>

            {/* Document Title */}
            <Text fontSize={typeScale.title} fontWeight={700} color={color.textPrimary} lineHeight={1.25}>
              {cleanText(selected.title)}
            </Text>

            {/* Callout quote box */}
            <Container
              width="100%"
              paddingLeft={12}
              paddingRight={12}
              paddingTop={8}
              paddingBottom={8}
              backgroundColor="rgba(255,255,255,0.04)"
              borderColor={color.accent}
              borderLeftWidth={3}
              borderTopRightRadius={8}
              borderBottomRightRadius={8}
              marginTop={2}
              marginBottom={2}
            >
              <Text fontSize={typeScale.body} color={color.textSecondary} lineHeight={1.35}>
                {cleanText(selected.summary)}
              </Text>
            </Container>

            {/* Additional editorial synthesis context */}
            <Container flexDirection="column" gapRow={4} marginTop={4}>
              <Text fontSize={typeScale.caption} fontWeight={600} color={color.textPrimary}>
                {cleanText('Puntos Clave y Metadatos:')}
              </Text>
              <Text fontSize={typeScale.caption} color={color.textDim} lineHeight={1.3}>
                {cleanText('> Arquitectura espacial optimizada para visores PICO 4 Ultra y PICO Neo.')}
              </Text>
              <Text fontSize={typeScale.caption} color={color.textDim} lineHeight={1.3}>
                {cleanText('> Diseno con glassmorphism nativo, profundidad optica y audio sintetico.')}
              </Text>
            </Container>

            {/* Constellation Archived Sources Linkage */}
            {sources.length > 0 && (
              <Container
                flexDirection="column"
                marginTop={10}
                paddingTop={8}
                borderColor="rgba(255,255,255,0.1)"
                borderTopWidth={1}
                gapRow={6}
              >
                <Container flexDirection="row" alignItems="center" gapColumn={6}>
                  <Text fontSize={typeScale.caption} fontWeight={700} color={color.idea} letterSpacing={0.5}>
                    {cleanText('FUENTES CONECTADAS EN EL MAPA')}
                  </Text>
                  <Text fontSize={typeScale.micro} color={color.textDim}>
                    {`(${sources.length})`}
                  </Text>
                </Container>

                <Container flexDirection="row" flexWrap="wrap" gapRow={4} gapColumn={6}>
                  {sources.map((s) => (
                    <Container
                      key={s.id}
                      cursor="pointer"
                      flexDirection="row"
                      alignItems="center"
                      gapColumn={4}
                      paddingLeft={8}
                      paddingRight={8}
                      paddingTop={4}
                      paddingBottom={4}
                      backgroundColor="rgba(251,191,36,0.12)"
                      borderColor="rgba(251,191,36,0.4)"
                      borderTopWidth={1}
                      borderBottomWidth={1}
                      borderLeftWidth={1}
                      borderRightWidth={1}
                      borderTopLeftRadius={999}
                      borderTopRightRadius={999}
                      borderBottomLeftRadius={999}
                      borderBottomRightRadius={999}
                      onClick={() => select(s.id)}
                    >
                      <ExternalLinkIcon width={10} color={color.idea} />
                      <Text fontSize={typeScale.micro} color={color.idea} fontWeight={600}>
                        {cleanText(s.title.slice(0, 24))}
                      </Text>
                    </Container>
                  ))}
                </Container>
              </Container>
            )}
          </Container>
        </Container>
      ) : (
        <Container flexDirection="column" alignItems="center" justifyContent="center" width="100%" flexGrow={1}>
          <Text fontSize={typeScale.body} color={color.textDim}>
            {cleanText('Selecciona una tarjeta del carrusel para previsualizar')}
          </Text>
        </Container>
      )}
    </Panel>
  )
}

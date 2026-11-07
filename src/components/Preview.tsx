import { Container, Text } from '@react-three/uikit'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  HeartIcon,
  LockIcon,
  RotateCwIcon,
  ShareIcon,
  SparklesIcon,
  StarIcon,
} from '@react-three/uikit-lucide'
import { useState, useEffect } from 'react'
import { spatialRuntime } from '../services/spatialRuntime'
import { useWorkspace } from '../store'
import { color, layout, radius, type as typeScale } from '../theme'
import { Panel } from './Panel'
import { cleanText } from './Ui'

function StarButton({
  active,
  onClick,
}: {
  active: boolean
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <Container
      cursor="pointer"
      width={24}
      height={24}
      borderTopLeftRadius={6}
      borderTopRightRadius={6}
      borderBottomLeftRadius={6}
      borderBottomRightRadius={6}
      backgroundColor={hovered ? 'rgba(255,255,255,0.14)' : 'transparent'}
      alignItems="center"
      justifyContent="center"
      onClick={onClick}
      onHoverChange={setHovered}
    >
      <StarIcon
        width={14}
        color={active || hovered ? color.idea : 'rgba(255,255,255,0.25)'}
      />
    </Container>
  )
}

function ReadingProgressSlider({
  progress,
  onChange,
}: {
  progress: number
  onChange: (newProgress: number) => void
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <Container
      cursor="pointer"
      flexDirection="row"
      alignItems="center"
      width="100%"
      height={28}
      paddingLeft={2}
      paddingRight={2}
      onClick={() => {
        const nextP = progress >= 100 ? 25 : progress + 25
        onChange(nextP)
      }}
      onHoverChange={setHovered}
    >
      {/* Active Track */}
      <Container
        width={`${progress}%`}
        height={6}
        borderTopLeftRadius={3}
        borderBottomLeftRadius={3}
        backgroundColor={hovered ? '#8b5cf6' : color.purple}
      />
      {/* Circular Thumb */}
      <Container
        width={hovered ? 18 : 14}
        height={hovered ? 18 : 14}
        borderTopLeftRadius={9}
        borderTopRightRadius={9}
        borderBottomLeftRadius={9}
        borderBottomRightRadius={9}
        backgroundColor={hovered ? '#a78bfa' : color.purple}
        borderColor="#ffffff"
        borderTopWidth={1.5}
        borderBottomWidth={1.5}
        borderLeftWidth={1.5}
        borderRightWidth={1.5}
      />
      {/* Inactive Track */}
      <Container
        flexGrow={1}
        height={6}
        borderTopRightRadius={3}
        borderBottomRightRadius={3}
        backgroundColor={hovered ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.22)'}
      />
    </Container>
  )
}

export function Preview() {
  const cards = useWorkspace((s) => s.cards)
  const selectedId = useWorkspace((s) => s.selectedId)
  const select = useWorkspace((s) => s.select)
  const toggleFavorite = useWorkspace((s) => s.toggleFavorite)
  const setRating = useWorkspace((s) => s.setRating)
  const setProgress = useWorkspace((s) => s.setProgress)
  const selected = cards.find((c) => c.id === selectedId) ?? cards[0]
  const sources = useWorkspace((s) => s.sources)

  const progress = selected?.readProgress ?? 65
  const rating = selected?.rating ?? 5

  const [favHovered, setFavHovered] = useState(false)
  const [reloadHovered, setReloadHovered] = useState(false)
  const [shareHovered, setShareHovered] = useState(false)
  const [runtimePreview, setRuntimePreview] = useState<string | null>(null)

  useEffect(() => {
    return spatialRuntime.onPreview((html) => {
      setRuntimePreview(html)
    })
  }, [])

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
          {/* Top Browser Bar: Navigation + URL Capsule + Favorite + Share */}
          <Container
            width="100%"
            height={36}
            flexDirection="row"
            alignItems="center"
            justifyContent="space-between"
            paddingLeft={10}
            paddingRight={10}
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
            marginBottom={12}
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
              height={26}
              backgroundColor="rgba(0,0,0,0.35)"
              borderColor="rgba(255,255,255,0.12)"
              borderTopWidth={1}
              borderBottomWidth={1}
              borderLeftWidth={1}
              borderRightWidth={1}
              borderTopLeftRadius={13}
              borderTopRightRadius={13}
              borderBottomLeftRadius={13}
              borderBottomRightRadius={13}
              flexGrow={1}
              marginLeft={8}
              marginRight={8}
            >
              <LockIcon width={10} color={color.success} />
              <Text fontSize={10} color={color.accent} fontWeight={600}>
                {cleanText(runtimePreview ? 'http://localhost:3000/__preview__/' : selected.url)}
              </Text>
            </Container>

            {/* Quick Actions & Favorite Heart Toggle (User reference: uploaded_media_2) */}
            <Container flexDirection="row" alignItems="center" gapColumn={6}>
              <Container
                cursor="pointer"
                width={28}
                height={28}
                borderTopLeftRadius={14}
                borderTopRightRadius={14}
                borderBottomLeftRadius={14}
                borderBottomRightRadius={14}
                backgroundColor={
                  selected.favorite
                    ? 'rgba(124, 58, 237, 0.28)'
                    : favHovered
                    ? 'rgba(255,255,255,0.16)'
                    : 'rgba(255,255,255,0.06)'
                }
                borderColor={selected.favorite ? color.purple : 'rgba(255,255,255,0.15)'}
                borderTopWidth={1}
                borderBottomWidth={1}
                borderLeftWidth={1}
                borderRightWidth={1}
                alignItems="center"
                justifyContent="center"
                onClick={() => toggleFavorite(selected.id)}
                onHoverChange={setFavHovered}
              >
                <HeartIcon width={14} color={selected.favorite ? color.purple : color.textDim} />
              </Container>

              <Container
                cursor="pointer"
                width={28}
                height={28}
                borderTopLeftRadius={14}
                borderTopRightRadius={14}
                borderBottomLeftRadius={14}
                borderBottomRightRadius={14}
                backgroundColor={reloadHovered ? 'rgba(255,255,255,0.14)' : 'transparent'}
                alignItems="center"
                justifyContent="center"
                onHoverChange={setReloadHovered}
              >
                <RotateCwIcon width={13} color={reloadHovered ? color.textPrimary : color.textDim} />
              </Container>

              <Container
                cursor="pointer"
                width={28}
                height={28}
                borderTopLeftRadius={14}
                borderTopRightRadius={14}
                borderBottomLeftRadius={14}
                borderBottomRightRadius={14}
                backgroundColor={shareHovered ? 'rgba(255,255,255,0.14)' : 'transparent'}
                alignItems="center"
                justifyContent="center"
                onHoverChange={setShareHovered}
              >
                <ShareIcon width={13} color={shareHovered ? color.textPrimary : color.textDim} />
              </Container>
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
            {/* Meta badge row + 5-Star Rating (User reference: uploaded_media_2) */}
            <Container flexDirection="row" alignItems="center" justifyContent="space-between" width="100%">
              <Container flexDirection="row" alignItems="center" gapColumn={8}>
                <Container
                  flexDirection="row"
                  alignItems="center"
                  gapColumn={4}
                  paddingLeft={8}
                  paddingRight={8}
                  paddingTop={3}
                  paddingBottom={3}
                  backgroundColor={selected.isSpotlight ? 'rgba(124,58,237,0.18)' : 'rgba(14,165,233,0.18)'}
                  borderColor={selected.isSpotlight ? color.purple : color.accent}
                  borderTopWidth={1}
                  borderBottomWidth={1}
                  borderLeftWidth={1}
                  borderRightWidth={1}
                  borderTopLeftRadius={999}
                  borderTopRightRadius={999}
                  borderBottomLeftRadius={999}
                  borderBottomRightRadius={999}
                >
                  <SparklesIcon width={10} color={selected.isSpotlight ? color.purple : color.accent} />
                  <Text
                    fontSize={typeScale.micro}
                    fontWeight={700}
                    color={selected.isSpotlight ? color.purple : color.accent}
                    letterSpacing={0.5}
                  >
                    {cleanText(selected.badge)}
                  </Text>
                </Container>
                <Text fontSize={typeScale.micro} color={color.textDim}>
                  {cleanText('Lectura recomendada · 4 min')}
                </Text>
              </Container>

              {/* 5-Star Rating Bar (User reference: uploaded_media_2) */}
              <Container flexDirection="row" alignItems="center" gapColumn={2}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <StarButton
                    key={star}
                    active={star <= rating}
                    onClick={() => setRating(selected.id, star)}
                  />
                ))}
              </Container>
            </Container>

            {/* Live Runtime Preview Banner (wZed Output) */}
            {runtimePreview ? (
              <Container
                flexDirection="column"
                width="100%"
                padding={10}
                borderTopLeftRadius={8}
                borderTopRightRadius={8}
                borderBottomLeftRadius={8}
                borderBottomRightRadius={8}
                backgroundColor="rgba(124, 58, 237, 0.16)"
                borderColor={color.purple}
                borderTopWidth={1.5}
                borderBottomWidth={1}
                borderLeftWidth={1}
                borderRightWidth={1}
                gapRow={6}
                marginTop={2}
                marginBottom={4}
              >
                <Container flexDirection="row" justifyContent="space-between" alignItems="center" width="100%">
                  <Container flexDirection="row" alignItems="center" gapColumn={6}>
                    <SparklesIcon width={12} color={color.purple} />
                    <Text fontSize={10} fontWeight={700} color={color.purple}>
                      {cleanText('⚡ SALIDA LIVE WZED PREVIEW')}
                    </Text>
                  </Container>
                  <Container
                    cursor="pointer"
                    paddingLeft={8}
                    paddingRight={8}
                    height={20}
                    borderTopLeftRadius={4}
                    borderTopRightRadius={4}
                    borderBottomLeftRadius={4}
                    borderBottomRightRadius={4}
                    backgroundColor="rgba(255,255,255,0.12)"
                    onClick={() => setRuntimePreview(null)}
                  >
                    <Text fontSize={9} color={color.textDim}>
                      {cleanText('Volver a doc')}
                    </Text>
                  </Container>
                </Container>
                <Text fontSize={11} color={color.textPrimary} lineHeight={1.35}>
                  {cleanText(runtimePreview.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())}
                </Text>
              </Container>
            ) : null}

            {/* Document Title */}
            <Text fontSize={typeScale.title} fontWeight={700} color={color.textPrimary} lineHeight={1.25}>
              {cleanText(selected.title)}
            </Text>

            {/* Reading Progress Slider (User reference: uploaded_media_2) */}
            <Container flexDirection="column" gapRow={2} width="100%" marginTop={2} marginBottom={4}>
              <Container flexDirection="row" justifyContent="space-between" width="100%">
                <Text fontSize={typeScale.micro} color={color.textDim} fontWeight={600}>
                  {cleanText('PROGRESO DE LECTURA')}
                </Text>
                <Text fontSize={typeScale.micro} color={color.purple} fontWeight={700}>
                  {`${progress}%`}
                </Text>
              </Container>

              <ReadingProgressSlider
                progress={progress}
                onChange={(p) => setProgress(selected.id, p)}
              />
            </Container>

            {/* Summary Box */}
            <Container
              width="100%"
              paddingLeft={12}
              paddingRight={12}
              paddingTop={8}
              paddingBottom={8}
              backgroundColor="rgba(255,255,255,0.05)"
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

            {/* Editorial Takeaways */}
            <Container flexDirection="column" gapRow={4} marginTop={2}>
              <Text fontSize={typeScale.caption} fontWeight={600} color={color.textPrimary}>
                {cleanText('Puntos Clave:')}
              </Text>
              <Text fontSize={typeScale.caption} color={color.textDim} lineHeight={1.3}>
                {cleanText('> Arquitectura espacial optimizada para visores PICO 4 Ultra y PICO Neo.')}
              </Text>
              <Text fontSize={typeScale.caption} color={color.textDim} lineHeight={1.3}>
                {cleanText('> Diseño flat pastel con ergonomía visual y físicas elásticas GSAP.')}
              </Text>
            </Container>

            {/* Constellation Sources Linkage */}
            {sources.length > 0 && (
              <Container
                flexDirection="column"
                marginTop={6}
                paddingTop={6}
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
                      backgroundColor="rgba(245,158,11,0.14)"
                      borderColor="rgba(245,158,11,0.4)"
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

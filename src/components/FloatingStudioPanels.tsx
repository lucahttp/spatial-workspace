import { Container, Text } from '@react-three/uikit'
import {
  ExternalLinkIcon,
  FileCodeIcon,
  PlayIcon,
  Trash2Icon,
} from '@react-three/uikit-lucide'
import { useState } from 'react'
import { useWorkspace } from '../store'
import { spatialRuntime } from '../services/spatialRuntime'
import { vfs } from '../services/vfs'
import { azureFoundryVoice } from '../services/azureFoundryVoice'
import { color } from '../theme'
import { Panel } from './Panel'
import { cleanText } from './Ui'

export function FloatingTerminalPanel() {
  const dockView = useWorkspace((s) => s.dockView)
  const viewPos = useWorkspace((s) => s.viewPositions.terminal) || [0.65, -0.15, -1.05]
  const logs = spatialRuntime.getLogs()

  const handleRun = async () => {
    await spatialRuntime.runFile('/project/index.js')
  }

  return (
    <Panel
      title="💻 TERMINAL FLOTANTE (WZED)"
      subtitle="Consola interactiva desacoplada del IDE"
      accent="#34d399"
      width={0.62}
      height={0.44}
      position={viewPos}
      onClose={() => dockView('terminal')}
    >
      <Container flexDirection="column" width="100%" height="100%" padding={8} gapRow={6}>
        {/* Header Bar with Re-Dock Button */}
        <Container flexDirection="row" justifyContent="space-between" alignItems="center" width="100%">
          <Text fontSize={9} color={color.textDim}>
            {cleanText('TERMINAL DESACOPLADA')}
          </Text>
          <Container
            cursor="pointer"
            flexDirection="row"
            alignItems="center"
            gapColumn={4}
            paddingLeft={8}
            paddingRight={8}
            height={20}
            borderRadius={6}
            backgroundColor="rgba(52, 211, 153, 0.15)"
            borderColor="#34d399"
            borderTopWidth={1}
            borderBottomWidth={1}
            borderLeftWidth={1}
            borderRightWidth={1}
            onClick={() => dockView('terminal')}
          >
            <ExternalLinkIcon width={10} color="#34d399" />
            <Text fontSize={9} fontWeight={700} color="#34d399">
              {cleanText('Acoplar')}
            </Text>
          </Container>
        </Container>

        {/* Log rows */}
        <Container
          flexDirection="column"
          flexGrow={1}
          width="100%"
          overflow="hidden"
          backgroundColor="rgba(0, 0, 0, 0.45)"
          borderRadius={6}
          padding={6}
          gapRow={4}
        >
          {logs.slice(-8).map((l) => (
            <Text
              key={l.id}
              fontSize={9}
              color={l.type === 'error' ? '#f87171' : l.type === 'system' ? '#38bdf8' : '#e2e8f0'}
              lineHeight={1.3}
            >
              {cleanText(`> ${l.text}`)}
            </Text>
          ))}
        </Container>

        {/* Quick run pills */}
        <Container flexDirection="row" gapColumn={6} alignItems="center">
          <Container
            cursor="pointer"
            paddingLeft={8}
            paddingRight={8}
            height={22}
            borderRadius={6}
            backgroundColor="rgba(52, 211, 153, 0.2)"
            alignItems="center"
            justifyContent="center"
            onClick={handleRun}
          >
            <Text fontSize={9} fontWeight={700} color="#34d399">
              {cleanText('▶ index.js')}
            </Text>
          </Container>
          <Container
            cursor="pointer"
            paddingLeft={8}
            paddingRight={8}
            height={22}
            borderRadius={6}
            backgroundColor="rgba(255, 255, 255, 0.08)"
            alignItems="center"
            justifyContent="center"
            onClick={() => spatialRuntime.clear()}
          >
            <Trash2Icon width={10} color={color.textDim} />
          </Container>
        </Container>
      </Container>
    </Panel>
  )
}

export function FloatingExplorerPanel() {
  const dockView = useWorkspace((s) => s.dockView)
  const viewPos = useWorkspace((s) => s.viewPositions.explorer) || [-0.68, 0.22, -1.15]
  const files = vfs.getFilePaths()

  return (
    <Panel
      title="📁 EXPLORADOR FLOTANTE (VFS)"
      subtitle="Arbol de archivos desacoplado"
      accent="#38bdf8"
      width={0.48}
      height={0.46}
      position={viewPos}
      onClose={() => dockView('explorer')}
    >
      <Container flexDirection="column" width="100%" height="100%" padding={8} gapRow={6}>
        <Container flexDirection="row" justifyContent="space-between" alignItems="center" width="100%">
          <Text fontSize={9} color={color.textDim}>
            {cleanText(`${files.length} ARCHIVOS EN MEMORIA`)}
          </Text>
          <Container
            cursor="pointer"
            flexDirection="row"
            alignItems="center"
            gapColumn={4}
            paddingLeft={8}
            paddingRight={8}
            height={20}
            borderRadius={6}
            backgroundColor="rgba(56, 189, 248, 0.15)"
            borderColor="#38bdf8"
            borderTopWidth={1}
            borderBottomWidth={1}
            borderLeftWidth={1}
            borderRightWidth={1}
            onClick={() => dockView('explorer')}
          >
            <ExternalLinkIcon width={10} color="#38bdf8" />
            <Text fontSize={9} fontWeight={700} color="#38bdf8">
              {cleanText('Acoplar')}
            </Text>
          </Container>
        </Container>

        <Container flexDirection="column" flexGrow={1} gapRow={4} overflow="hidden">
          {files.map((p) => {
            const name = p.replace('/project/', '')
            return (
              <Container
                key={p}
                cursor="pointer"
                flexDirection="row"
                alignItems="center"
                justifyContent="space-between"
                padding={6}
                borderRadius={6}
                backgroundColor="rgba(255, 255, 255, 0.05)"
                onClick={() => spatialRuntime.runFile(p)}
              >
                <Container flexDirection="row" alignItems="center" gapColumn={6}>
                  <FileCodeIcon width={12} color="#38bdf8" />
                  <Text fontSize={10} color="#ffffff">
                    {cleanText(name)}
                  </Text>
                </Container>
                <PlayIcon width={10} color={color.textDim} />
              </Container>
            )
          })}
        </Container>
      </Container>
    </Panel>
  )
}

export function FloatingAiPanel() {
  const dockView = useWorkspace((s) => s.dockView)
  const viewPos = useWorkspace((s) => s.viewPositions.ai) || [0.72, 0.28, -1.18]
  const [inputMsg, setInputMsg] = useState('')
  const [history, setHistory] = useState([
    { role: 'ai', text: 'Subagente wZed conectado a Azure Foundry. ¿Que deseas crear?' },
  ])

  const handleSend = async () => {
    if (!inputMsg.trim()) return
    const q = inputMsg.trim()
    setInputMsg('')
    setHistory((prev) => [...prev, { role: 'user', text: q }])
    const res = await azureFoundryVoice.handleVoiceCommand(q)
    setHistory((prev) => [...prev, { role: 'ai', text: res }])
  }

  return (
    <Panel
      title="🤖 ASISTENTE IA FLOTANTE"
      subtitle="wZed Subagent + Azure Foundry"
      accent="#c084fc"
      width={0.52}
      height={0.48}
      position={viewPos}
      onClose={() => dockView('ai')}
    >
      <Container flexDirection="column" width="100%" height="100%" padding={8} gapRow={6}>
        <Container flexDirection="row" justifyContent="space-between" alignItems="center" width="100%">
          <Text fontSize={9} color={color.textDim}>
            {cleanText('CHAT ASISTENTE ESPACIAL')}
          </Text>
          <Container
            cursor="pointer"
            flexDirection="row"
            alignItems="center"
            gapColumn={4}
            paddingLeft={8}
            paddingRight={8}
            height={20}
            borderRadius={6}
            backgroundColor="rgba(192, 132, 252, 0.15)"
            borderColor="#c084fc"
            borderTopWidth={1}
            borderBottomWidth={1}
            borderLeftWidth={1}
            borderRightWidth={1}
            onClick={() => dockView('ai')}
          >
            <ExternalLinkIcon width={10} color="#c084fc" />
            <Text fontSize={9} fontWeight={700} color="#c084fc">
              {cleanText('Acoplar')}
            </Text>
          </Container>
        </Container>

        {/* Chat History */}
        <Container
          flexDirection="column"
          flexGrow={1}
          overflow="hidden"
          padding={6}
          gapRow={6}
          backgroundColor="rgba(0,0,0,0.4)"
          borderRadius={6}
        >
          {history.slice(-4).map((m, idx) => (
            <Container
              key={idx}
              padding={6}
              borderRadius={6}
              backgroundColor={m.role === 'user' ? 'rgba(124, 58, 237, 0.25)' : 'rgba(255, 255, 255, 0.06)'}
            >
              <Text fontSize={9} color={m.role === 'user' ? '#c084fc' : '#e2e8f0'} lineHeight={1.3}>
                {cleanText(`${m.role === 'user' ? 'Tú: ' : 'wZed: '}${m.text}`)}
              </Text>
            </Container>
          ))}
        </Container>

        {/* Quick prompt */}
        <Container flexDirection="row" gapColumn={6}>
          <Container
            cursor="pointer"
            padding={6}
            borderRadius={6}
            backgroundColor="rgba(192, 132, 252, 0.2)"
            onClick={() => handleSend()}
          >
            <Text fontSize={9} fontWeight={700} color="#c084fc">
              {cleanText('✨ Generar Módulo')}
            </Text>
          </Container>
        </Container>
      </Container>
    </Panel>
  )
}

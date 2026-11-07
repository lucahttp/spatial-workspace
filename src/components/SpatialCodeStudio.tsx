import { Container, Text } from '@react-three/uikit'
import {
  CodeIcon,
  FileCodeIcon,
  FolderIcon,
  PlayIcon,
  RotateCwIcon,
  TerminalIcon,
  Trash2Icon,
} from '@react-three/uikit-lucide'
import { useEffect, useState } from 'react'
import { LogLine, spatialRuntime } from '../services/spatialRuntime'
import { vfs } from '../services/vfs'
import { color } from '../theme'
import { Panel } from './Panel'
import { cleanText } from './Ui'

interface FileTabProps {
  name: string
  active: boolean
  onClick: () => void
}

function FileTab({ name, active, onClick }: FileTabProps) {
  const [hovered, setHovered] = useState(false)
  return (
    <Container
      cursor="pointer"
      flexDirection="row"
      alignItems="center"
      gapColumn={5}
      paddingLeft={10}
      paddingRight={10}
      height={28}
      borderTopLeftRadius={8}
      borderTopRightRadius={8}
      borderBottomLeftRadius={8}
      borderBottomRightRadius={8}
      backgroundColor={
        active
          ? 'rgba(124, 58, 237, 0.22)'
          : hovered
          ? 'rgba(255, 255, 255, 0.12)'
          : 'rgba(255, 255, 255, 0.04)'
      }
      borderColor={active ? color.purple : 'rgba(255, 255, 255, 0.08)'}
      borderTopWidth={1}
      borderBottomWidth={1}
      borderLeftWidth={1}
      borderRightWidth={1}
      onClick={onClick}
      onHoverChange={setHovered}
    >
      <FileCodeIcon width={12} color={active ? color.purple : color.textDim} />
      <Text
        fontSize={11}
        fontWeight={active ? 700 : 500}
        color={active ? color.textPrimary : color.textDim}
      >
        {cleanText(name)}
      </Text>
    </Container>
  )
}

function TerminalRow({ line }: { line: LogLine }) {
  const getBadgeColor = () => {
    switch (line.type) {
      case 'error':
        return '#f87171'
      case 'warn':
        return '#fbbf24'
      case 'info':
        return '#38bdf8'
      case 'command':
        return '#a78bfa'
      case 'system':
        return '#34d399'
      default:
        return '#cbd5e1'
    }
  }

  return (
    <Container flexDirection="row" gapColumn={8} alignItems="flex-start" width="100%">
      <Text fontSize={9} color="rgba(255,255,255,0.30)" fontWeight={500}>
        {cleanText(line.timestamp)}
      </Text>
      <Text fontSize={9} fontWeight={700} color={getBadgeColor()}>
        {cleanText(`[${line.type.toUpperCase()}]`)}
      </Text>
      <Text fontSize={10} color={getBadgeColor()} lineHeight={1.3} flexGrow={1}>
        {cleanText(line.text)}
      </Text>
    </Container>
  )
}

export function SpatialCodeStudio({
  position = [0.0, 1.82, -1.35],
  onClose,
}: {
  position?: [number, number, number]
  onClose?: () => void
}) {
  const [activeFile, setActiveFile] = useState('/project/index.js')
  const [files, setFiles] = useState<string[]>([])
  const [fileContent, setFileContent] = useState('')
  const [mode, setMode] = useState<'editor' | 'terminal'>('editor')
  const [logs, setLogs] = useState<LogLine[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [runHovered, setRunHovered] = useState(false)

  useEffect(() => {
    const update = () => {
      const list = vfs.getFilePaths()
      setFiles(list)
      const content = vfs.readFile(activeFile) ?? ''
      setFileContent(content)
    }
    update()
    return vfs.subscribe(update)
  }, [activeFile])

  useEffect(() => {
    return spatialRuntime.subscribe((newLogs) => {
      setLogs([...newLogs])
    })
  }, [])

  const handleRun = async () => {
    setIsRunning(true)
    setMode('terminal')
    await spatialRuntime.runFile(activeFile)
    setIsRunning(false)
  }

  const handleReset = () => {
    vfs.resetToTemplate()
    spatialRuntime.clear()
  }

  // Pre-formatted syntax lines for 3D viewer
  const codeLines = fileContent.split('\n').slice(0, 18)

  return (
    <Panel
      title="💻 ESTUDIO DE CÓDIGO (WZED VFS)"
      subtitle="Entorno Node en navegador y streaming de terminal"
      accent={color.purple}
      width={0.86}
      height={0.52}
      position={position}
      onClose={onClose}
    >
      <Container flexDirection="column" width="100%" height="100%" padding={14} gapRow={10}>
        {/* Top Control Bar: File Tabs, Mode Toggle, and Run Button */}
        <Container
          flexDirection="row"
          alignItems="center"
          justifyContent="space-between"
          width="100%"
          height={34}
        >
          {/* File Tabs */}
          <Container flexDirection="row" alignItems="center" gapColumn={6}>
            {files.map((path) => {
              const name = path.replace('/project/', '')
              return (
                <FileTab
                  key={path}
                  name={name}
                  active={activeFile === path}
                  onClick={() => {
                    setActiveFile(path)
                    const content = vfs.readFile(path) ?? ''
                    setFileContent(content)
                  }}
                />
              )
            })}
          </Container>

          {/* Action Buttons: Mode & Run */}
          <Container flexDirection="row" alignItems="center" gapColumn={8}>
            {/* View Mode Toggle */}
            <Container
              cursor="pointer"
              flexDirection="row"
              alignItems="center"
              gapColumn={4}
              paddingLeft={8}
              paddingRight={8}
              height={28}
              borderTopLeftRadius={6}
              borderTopRightRadius={6}
              borderBottomLeftRadius={6}
              borderBottomRightRadius={6}
              backgroundColor="rgba(255,255,255,0.08)"
              borderColor="rgba(255,255,255,0.12)"
              borderTopWidth={1}
              borderBottomWidth={1}
              borderLeftWidth={1}
              borderRightWidth={1}
              onClick={() => setMode(mode === 'editor' ? 'terminal' : 'editor')}
            >
              {mode === 'editor' ? (
                <>
                  <TerminalIcon width={12} color={color.textDim} />
                  <Text fontSize={10} fontWeight={600} color={color.textDim}>
                    {cleanText('Ver Terminal')}
                  </Text>
                </>
              ) : (
                <>
                  <CodeIcon width={12} color={color.textDim} />
                  <Text fontSize={10} fontWeight={600} color={color.textDim}>
                    {cleanText('Ver Código')}
                  </Text>
                </>
              )}
            </Container>

            {/* Run Button */}
            <Container
              cursor="pointer"
              flexDirection="row"
              alignItems="center"
              gapColumn={6}
              paddingLeft={12}
              paddingRight={12}
              height={30}
              borderTopLeftRadius={15}
              borderTopRightRadius={15}
              borderBottomLeftRadius={15}
              borderBottomRightRadius={15}
              backgroundColor={runHovered ? color.purpleDim : color.purple}
              borderColor="rgba(255,255,255,0.35)"
              borderTopWidth={1.5}
              borderBottomWidth={1}
              borderLeftWidth={1}
              borderRightWidth={1}
              onClick={handleRun}
              onHoverChange={setRunHovered}
            >
              <PlayIcon width={12} color="#ffffff" />
              <Text fontSize={11} fontWeight={700} color="#ffffff">
                {cleanText(isRunning ? 'Ejecutando...' : '▶ Ejecutar')}
              </Text>
            </Container>
          </Container>
        </Container>

        {/* Studio Content Area */}
        {mode === 'editor' ? (
          <Container
            flexDirection="row"
            width="100%"
            flexGrow={1}
            backgroundColor="rgba(0, 0, 0, 0.45)"
            borderColor="rgba(255, 255, 255, 0.10)"
            borderTopWidth={1}
            borderBottomWidth={1}
            borderLeftWidth={1}
            borderRightWidth={1}
            borderTopLeftRadius={10}
            borderTopRightRadius={10}
            borderBottomLeftRadius={10}
            borderBottomRightRadius={10}
            overflow="hidden"
          >
            {/* Sidebar: File Tree */}
            <Container
              flexDirection="column"
              width={140}
              height="100%"
              padding={10}
              gapRow={6}
              backgroundColor="rgba(0, 0, 0, 0.25)"
              borderColor="rgba(255, 255, 255, 0.08)"
              borderRightWidth={1}
            >
              <Container flexDirection="row" alignItems="center" gapColumn={5} marginBottom={4}>
                <FolderIcon width={12} color={color.accent} />
                <Text fontSize={10} fontWeight={700} color={color.accent}>
                  {cleanText('/project')}
                </Text>
              </Container>

              {files.map((p) => {
                const isSel = p === activeFile
                return (
                  <Container
                    key={p}
                    cursor="pointer"
                    padding={4}
                    borderTopLeftRadius={4}
                    borderTopRightRadius={4}
                    borderBottomLeftRadius={4}
                    borderBottomRightRadius={4}
                    backgroundColor={isSel ? 'rgba(124,58,237,0.25)' : 'transparent'}
                    onClick={() => setActiveFile(p)}
                  >
                    <Text
                      fontSize={10}
                      fontWeight={isSel ? 700 : 400}
                      color={isSel ? '#ffffff' : color.textDim}
                    >
                      {cleanText(p.replace('/project/', ''))}
                    </Text>
                  </Container>
                )
              })}

              <Container flexGrow={1} />
              <Container
                cursor="pointer"
                flexDirection="row"
                alignItems="center"
                gapColumn={4}
                padding={4}
                onClick={handleReset}
              >
                <RotateCwIcon width={10} color={color.textDim} />
                <Text fontSize={9} color={color.textDim}>
                  {cleanText('Reset plantillas')}
                </Text>
              </Container>
            </Container>

            {/* Code Viewer Area with Line Numbers */}
            <Container
              flexDirection="column"
              flexGrow={1}
              height="100%"
              padding={10}
              gapRow={3}
              overflow="hidden"
            >
              {codeLines.map((line, idx) => (
                <Container key={idx} flexDirection="row" gapColumn={8} alignItems="center">
                  <Text fontSize={9} color="rgba(255,255,255,0.25)" width={20}>
                    {cleanText(String(idx + 1))}
                  </Text>
                  <Text
                    fontSize={10}
                    color={
                      line.startsWith('//')
                        ? '#94a3b8'
                        : line.includes('console.')
                        ? '#38bdf8'
                        : line.includes('return')
                        ? '#c084fc'
                        : line.includes('const') || line.includes('let')
                        ? '#f472b6'
                        : '#e2e8f0'
                    }
                    fontWeight={line.includes('console.') || line.includes('return') ? 600 : 400}
                  >
                    {cleanText(line || ' ')}
                  </Text>
                </Container>
              ))}
            </Container>
          </Container>
        ) : (
          /* Terminal Stream View */
          <Container
            flexDirection="column"
            width="100%"
            flexGrow={1}
            backgroundColor="rgba(0, 0, 0, 0.65)"
            borderColor="rgba(255, 255, 255, 0.12)"
            borderTopWidth={1}
            borderBottomWidth={1}
            borderLeftWidth={1}
            borderRightWidth={1}
            borderTopLeftRadius={10}
            borderTopRightRadius={10}
            borderBottomLeftRadius={10}
            borderBottomRightRadius={10}
            padding={12}
            gapRow={6}
            overflow="hidden"
          >
            {/* Terminal Top Info */}
            <Container
              flexDirection="row"
              justifyContent="space-between"
              alignItems="center"
              width="100%"
              paddingBottom={6}
              borderColor="rgba(255,255,255,0.08)"
              borderBottomWidth={1}
            >
              <Text fontSize={10} fontWeight={700} color={color.accent}>
                {cleanText('TERMINAL wZED · STDOUT & STDERR')}
              </Text>
              <Container
                cursor="pointer"
                flexDirection="row"
                alignItems="center"
                gapColumn={4}
                paddingLeft={6}
                paddingRight={6}
                height={20}
                backgroundColor="rgba(255,255,255,0.08)"
                borderTopLeftRadius={4}
                borderTopRightRadius={4}
                borderBottomLeftRadius={4}
                borderBottomRightRadius={4}
                onClick={() => spatialRuntime.clear()}
              >
                <Trash2Icon width={10} color={color.textDim} />
                <Text fontSize={9} color={color.textDim}>
                  {cleanText('Limpiar')}
                </Text>
              </Container>
            </Container>

            {/* Terminal Lines Stream */}
            <Container flexDirection="column" gapRow={4} flexGrow={1} overflow="hidden">
              {logs.slice(-9).map((l) => (
                <TerminalRow key={l.id} line={l} />
              ))}
            </Container>

            {/* Terminal Bottom Prompt Bar */}
            <Container
              flexDirection="row"
              alignItems="center"
              gapColumn={6}
              paddingTop={6}
              borderColor="rgba(255,255,255,0.08)"
              borderTopWidth={1}
            >
              <Text fontSize={10} fontWeight={700} color={color.success}>
                {cleanText('pico-os:~/project$')}
              </Text>
              <Text fontSize={10} color={color.textPrimary}>
                {cleanText(`node ${activeFile.replace('/project/', '')}`)}
              </Text>
              <Container flexGrow={1} />
              <Container
                cursor="pointer"
                paddingLeft={8}
                paddingRight={8}
                height={22}
                borderTopLeftRadius={11}
                borderTopRightRadius={11}
                borderBottomLeftRadius={11}
                borderBottomRightRadius={11}
                backgroundColor="rgba(14, 165, 233, 0.18)"
                borderColor={color.accent}
                borderTopWidth={1}
                borderBottomWidth={1}
                borderLeftWidth={1}
                borderRightWidth={1}
                alignItems="center"
                justifyContent="center"
                onClick={handleRun}
              >
                <Text fontSize={9} fontWeight={600} color={color.accent}>
                  {cleanText('Re-ejecutar')}
                </Text>
              </Container>
            </Container>
          </Container>
        )}
      </Container>
    </Panel>
  )
}

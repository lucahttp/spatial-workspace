import { Container, Text } from '@react-three/uikit'
import {
  ActivityIcon,
  BotIcon,
  ExternalLinkIcon,
  FileCodeIcon,
  FolderIcon,
  GitBranchIcon,
  PlayIcon,
  PlusIcon,
  RotateCwIcon,
  SearchIcon,
  SendIcon,
  SettingsIcon,
  SparklesIcon,
  TerminalIcon,
  Trash2Icon,
} from '@react-three/uikit-lucide'
import { useEffect, useState } from 'react'
import { useWorkspace } from '../store'
import { LogLine, spatialRuntime } from '../services/spatialRuntime'
import { vfs } from '../services/vfs'
import { azureFoundryVoice } from '../services/azureFoundryVoice'
import { color } from '../theme'
import { Panel } from './Panel'
import { cleanText } from './Ui'
import { isWasmSupported } from '../services/heybuddy'

export type StudioViewKind =
  | 'editor'
  | 'terminal'
  | 'explorer'
  | 'ai'
  | 'git'
  | 'search'
  | 'request'
  | 'perf'
  | 'settings'

interface ActivityButtonProps {
  icon: React.ReactNode
  active: boolean
  onClick: () => void
}

function ActivityButton({ icon, active, onClick }: ActivityButtonProps) {
  const [hovered, setHovered] = useState(false)
  return (
    <Container
      cursor="pointer"
      width={36}
      height={32}
      alignItems="center"
      justifyContent="center"
      borderTopLeftRadius={8}
      borderTopRightRadius={8}
      borderBottomLeftRadius={8}
      borderBottomRightRadius={8}
      transformTranslateZ={hovered ? 9 : 0}
      backgroundColor={
        active
          ? 'rgba(124, 58, 237, 0.28)'
          : hovered
          ? 'rgba(255, 255, 255, 0.12)'
          : 'transparent'
      }
      borderColor={active ? color.purple : 'transparent'}
      borderLeftWidth={active ? 2 : 0}
      onClick={onClick}
      onHoverChange={setHovered}
    >
      {icon}
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
  const [view, setView] = useState<StudioViewKind>('editor')
  const [activeFile, setActiveFile] = useState('/project/index.js')
  const [openTabs, setOpenTabs] = useState<string[]>(['/project/index.js', '/project/spatial-card.js'])
  const [files, setFiles] = useState<string[]>([])
  const [fileContent, setFileContent] = useState('')
  const [logs, setLogs] = useState<LogLine[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [runHovered, setRunHovered] = useState(false)

  // Undocked floating windows state
  const undockedViews = useWorkspace((s) => s.undockedViews)
  const toggleDockView = useWorkspace((s) => s.toggleDockView)
  const dockView = useWorkspace((s) => s.dockView)

  // AI Assistant Chat state (wZed AIPanel parity)
  const [aiStatus, setAiStatus] = useState<'idle' | 'working' | 'done'>('idle')
  const [aiHistory, setAiHistory] = useState<Array<{ role: 'user' | 'assistant'; text: string; tool?: string }>>([
    {
      role: 'assistant',
      text: 'Hola, soy el Subagente de Código wZed integrado con Azure AI Foundry. Puedo leer, escribir y ejecutar archivos en el VFS.',
    },
  ])

  // Git state (wZed GitPanel parity)
  const [commitMessage, setCommitMessage] = useState('feat: update spatial module')
  const [committed, setCommitted] = useState(false)

  // Global Search state (wZed SearchPanel parity)
  const [searchQuery, setSearchQuery] = useState('console.log')
  const [searchResults, setSearchResults] = useState<Array<{ file: string; line: number; text: string }>>([])

  // Request Sender state (wZed RequestSender parity)
  const [httpMethod, setHttpMethod] = useState<'GET' | 'POST' | 'PUT'>('GET')
  const [httpUrl, setHttpUrl] = useState('/api/preview')
  const [httpResponse, setHttpResponse] = useState<string | null>(null)
  const [httpStatus, setHttpStatus] = useState<number | null>(null)

  // VFS subscription
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

  // Runtime logs subscription
  useEffect(() => {
    return spatialRuntime.subscribe((newLogs) => {
      setLogs([...newLogs])
    })
  }, [])

  // Execute active file
  const handleRun = async (path?: string) => {
    const target = path || activeFile
    setIsRunning(true)
    setView('terminal')
    await spatialRuntime.runFile(target)
    setIsRunning(false)
  }

  // Handle AI delegation prompt
  const handleSendAiPrompt = async (promptText: string) => {
    if (!promptText.trim()) return
    setAiStatus('working')
    setAiHistory((prev) => [...prev, { role: 'user', text: promptText }])

    const res = await azureFoundryVoice.delegateToWzedSubagent(promptText)
    setAiHistory((prev) => [
      ...prev,
      {
        role: 'assistant',
        text: res.summary,
        tool: res.action,
      },
    ])
    setAiStatus('done')
  }

  // Execute simulated HTTP Request
  const handleSendHttpRequest = () => {
    setHttpStatus(200)
    const previewContent = vfs.readFile('/project/spatial-card.js') || ''
    setHttpResponse(
      JSON.stringify(
        {
          status: 'ok',
          method: httpMethod,
          endpoint: httpUrl,
          timestamp: Date.now(),
          vfsFiles: files.length,
          previewLength: previewContent.length,
          headers: { 'Content-Type': 'application/json', 'X-Runtime': 'wZed-in-browser' },
        },
        null,
        2
      )
    )
  }

  // Perform search across files
  const handlePerformSearch = (q: string) => {
    setSearchQuery(q)
    if (!q.trim()) {
      setSearchResults([])
      return
    }
    const results: Array<{ file: string; line: number; text: string }> = []
    files.forEach((f) => {
      const content = vfs.readFile(f) || ''
      const lines = content.split('\n')
      lines.forEach((l, idx) => {
        if (l.toLowerCase().includes(q.toLowerCase())) {
          results.push({ file: f, line: idx + 1, text: l.trim() })
        }
      })
    })
    setSearchResults(results.slice(0, 8))
  }

  // Pre-formatted syntax lines for 3D viewer
  const codeLines = fileContent.split('\n').slice(0, 16)

  return (
    <Panel
      title="💻 ESTUDIO DE CÓDIGO (WZED SUITE 3D)"
      subtitle="IDE espacial multi-pantalla: Explorer, Editor, Terminal, AI Assistant, Git, Search, HTTP Client"
      accent={color.purple}
      width={0.94}
      height={0.58}
      position={position}
      onClose={onClose}
    >
      <Container flexDirection="column" width="100%" height="100%" padding={10} gapRow={8}>
        {/* Main Work Area: Activity Bar + Content */}
        <Container flexDirection="row" width="100%" flexGrow={1} gapColumn={8} overflow="hidden">
          {/* 1. LEFT ACTIVITY BAR (wZed Sidebar Strip) */}
          <Container
            flexDirection="column"
            alignItems="center"
            width={40}
            height="100%"
            paddingTop={6}
            paddingBottom={6}
            gapRow={8}
            backgroundColor="rgba(15, 23, 42, 0.45)"
            borderColor="rgba(255, 255, 255, 0.10)"
            borderTopWidth={1}
            borderBottomWidth={1}
            borderLeftWidth={1}
            borderRightWidth={1}
            borderTopLeftRadius={10}
            borderBottomLeftRadius={10}
          >
            <ActivityButton
              icon={<FileCodeIcon width={16} color={view === 'editor' ? color.purple : color.textDim} />}
              active={view === 'editor'}
              onClick={() => setView('editor')}
            />
            <ActivityButton
              icon={<FolderIcon width={16} color={view === 'explorer' ? color.accent : color.textDim} />}
              active={view === 'explorer'}
              onClick={() => setView('explorer')}
            />
            <ActivityButton
              icon={<TerminalIcon width={16} color={view === 'terminal' ? '#34d399' : color.textDim} />}
              active={view === 'terminal'}
              onClick={() => setView('terminal')}
            />
            <ActivityButton
              icon={<BotIcon width={16} color={view === 'ai' ? '#c084fc' : color.textDim} />}
              active={view === 'ai'}
              onClick={() => setView('ai')}
            />
            <ActivityButton
              icon={<GitBranchIcon width={16} color={view === 'git' ? '#fb923c' : color.textDim} />}
              active={view === 'git'}
              onClick={() => setView('git')}
            />
            <ActivityButton
              icon={<SearchIcon width={16} color={view === 'search' ? '#38bdf8' : color.textDim} />}
              active={view === 'search'}
              onClick={() => {
                setView('search')
                handlePerformSearch(searchQuery)
              }}
            />
            <ActivityButton
              icon={<SendIcon width={16} color={view === 'request' ? '#f472b6' : color.textDim} />}
              active={view === 'request'}
              onClick={() => setView('request')}
            />
            <ActivityButton
              icon={<ActivityIcon width={16} color={view === 'perf' ? '#a3e635' : color.textDim} />}
              active={view === 'perf'}
              onClick={() => setView('perf')}
            />
            <Container flexGrow={1} />
            <ActivityButton
              icon={<SettingsIcon width={16} color={view === 'settings' ? '#94a3b8' : color.textDim} />}
              active={view === 'settings'}
              onClick={() => setView('settings')}
            />
          </Container>

          {/* 2. MAIN ACTIVE SCREEN */}
          <Container
            flexDirection="column"
            flexGrow={1}
            height="100%"
            backgroundColor="rgba(0, 0, 0, 0.50)"
            borderColor="rgba(255, 255, 255, 0.12)"
            borderTopWidth={1}
            borderBottomWidth={1}
            borderLeftWidth={1}
            borderRightWidth={1}
            borderTopRightRadius={10}
            borderBottomRightRadius={10}
            overflow="hidden"
          >
            {/* SCREEN 1: CODE EDITOR */}
            {view === 'editor' && (
              <Container flexDirection="column" width="100%" height="100%">
                {/* TabBar & Run Controls */}
                <Container
                  flexDirection="row"
                  alignItems="center"
                  justifyContent="space-between"
                  width="100%"
                  height={32}
                  paddingLeft={8}
                  paddingRight={8}
                  backgroundColor="rgba(0, 0, 0, 0.35)"
                  borderColor="rgba(255, 255, 255, 0.08)"
                  borderBottomWidth={1}
                >
                  {/* File Tabs */}
                  <Container flexDirection="row" alignItems="center" gapColumn={6}>
                    {openTabs.map((tabPath) => {
                      const isAct = tabPath === activeFile
                      const name = tabPath.replace('/project/', '')
                      return (
                        <Container
                          key={tabPath}
                          cursor="pointer"
                          flexDirection="row"
                          alignItems="center"
                          gapColumn={5}
                          paddingLeft={8}
                          paddingRight={8}
                          height={24}
                          borderTopLeftRadius={6}
                          borderTopRightRadius={6}
                          backgroundColor={isAct ? 'rgba(124, 58, 237, 0.28)' : 'rgba(255, 255, 255, 0.05)'}
                          borderColor={isAct ? color.purple : 'rgba(255, 255, 255, 0.08)'}
                          borderTopWidth={1}
                          borderBottomWidth={1}
                          borderLeftWidth={1}
                          borderRightWidth={1}
                          onClick={() => setActiveFile(tabPath)}
                        >
                          <FileCodeIcon width={10} color={isAct ? color.purple : color.textDim} />
                          <Text fontSize={10} fontWeight={isAct ? 700 : 400} color={isAct ? '#ffffff' : color.textDim}>
                            {cleanText(name)}
                          </Text>
                        </Container>
                      )
                    })}
                  </Container>

                  {/* Run Button */}
                  <Container
                    cursor="pointer"
                    flexDirection="row"
                    alignItems="center"
                    gapColumn={5}
                    paddingLeft={10}
                    paddingRight={10}
                    height={24}
                    borderTopLeftRadius={12}
                    borderTopRightRadius={12}
                    borderBottomLeftRadius={12}
                    borderBottomRightRadius={12}
                  transformTranslateZ={runHovered ? 9 : 0}
                    backgroundColor={runHovered ? color.purpleDim : color.purple}
                    borderColor="rgba(255, 255, 255, 0.35)"
                    borderTopWidth={1}
                    borderBottomWidth={1}
                    borderLeftWidth={1}
                    borderRightWidth={1}
                    onClick={() => handleRun()}
                    onHoverChange={setRunHovered}
                  >
                    <PlayIcon width={10} color="#ffffff" />
                    <Text fontSize={10} fontWeight={700} color="#ffffff">
                      {cleanText(isRunning ? 'Ejecutando...' : '▶ Ejecutar')}
                    </Text>
                  </Container>
                </Container>

                {/* Breadcrumbs */}
                <Container
                  flexDirection="row"
                  alignItems="center"
                  width="100%"
                  height={22}
                  paddingLeft={10}
                  backgroundColor="rgba(255, 255, 255, 0.02)"
                  borderColor="rgba(255, 255, 255, 0.06)"
                  borderBottomWidth={1}
                >
                  <Text fontSize={9} color={color.textDim}>
                    {cleanText(`workspace > project > ${activeFile.replace('/project/', '')}`)}
                  </Text>
                </Container>

                {/* Code Lines with Line Numbers */}
                <Container flexDirection="column" flexGrow={1} padding={10} gapRow={2} overflow="hidden">
                  {codeLines.map((line, idx) => (
                    <Container key={idx} flexDirection="row" gapColumn={10} alignItems="center">
                      <Text fontSize={9} color="rgba(255,255,255,0.25)" width={22}>
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
            )}

            {/* SCREEN 2: FILE EXPLORER */}
            {view === 'explorer' && (
              <Container flexDirection="column" width="100%" height="100%" padding={10} gapRow={8}>
                <Container flexDirection="row" justifyContent="space-between" alignItems="center">
                  <Text fontSize={11} fontWeight={700} color={color.accent}>
                    {cleanText('EXPLORADOR DE PROYECTO · VFS')}
                  </Text>
                  <Container flexDirection="row" gapColumn={6}>
                    <Container
                      cursor="pointer"
                      flexDirection="row"
                      alignItems="center"
                      gapColumn={4}
                      paddingLeft={6}
                      paddingRight={6}
                      height={20}
                      borderTopLeftRadius={4}
                      borderTopRightRadius={4}
                      borderBottomLeftRadius={4}
                      borderBottomRightRadius={4}
                      backgroundColor={undockedViews.explorer ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255,255,255,0.08)'}
                      onClick={() => toggleDockView('explorer')}
                    >
                      <ExternalLinkIcon width={10} color={undockedViews.explorer ? '#38bdf8' : color.textDim} />
                      <Text fontSize={9} color={undockedViews.explorer ? '#38bdf8' : color.textDim}>
                        {cleanText(undockedViews.explorer ? 'Acoplar' : 'Desacoplar ↗')}
                      </Text>
                    </Container>
                    <Container
                      cursor="pointer"
                      flexDirection="row"
                      alignItems="center"
                      gapColumn={4}
                      paddingLeft={6}
                      paddingRight={6}
                      height={20}
                      borderTopLeftRadius={4}
                      borderTopRightRadius={4}
                      borderBottomLeftRadius={4}
                      borderBottomRightRadius={4}
                      backgroundColor="rgba(255,255,255,0.08)"
                      onClick={() => {
                        const newName = `module-${files.length + 1}.js`
                        vfs.writeFile(`/project/${newName}`, `// ${newName}\nconsole.log('Nuevo módulo');\n`)
                      }}
                    >
                      <PlusIcon width={10} color={color.textDim} />
                      <Text fontSize={9} color={color.textDim}>
                        {cleanText('+ Archivo')}
                      </Text>
                    </Container>
                    <Container
                      cursor="pointer"
                      flexDirection="row"
                      alignItems="center"
                      gapColumn={4}
                      paddingLeft={6}
                      paddingRight={6}
                      height={20}
                      borderTopLeftRadius={4}
                      borderTopRightRadius={4}
                      borderBottomLeftRadius={4}
                      borderBottomRightRadius={4}
                      backgroundColor="rgba(255,255,255,0.08)"
                      onClick={() => vfs.resetToTemplate()}
                    >
                      <RotateCwIcon width={10} color={color.textDim} />
                      <Text fontSize={9} color={color.textDim}>
                        {cleanText('Reset')}
                      </Text>
                    </Container>
                  </Container>
                </Container>

                {undockedViews.explorer ? (
                  <Container
                    flexDirection="column"
                    flexGrow={1}
                    alignItems="center"
                    justifyContent="center"
                    padding={16}
                    gapRow={10}
                    backgroundColor="rgba(56, 189, 248, 0.05)"
                    borderTopLeftRadius={8}
                    borderTopRightRadius={8}
                    borderBottomLeftRadius={8}
                    borderBottomRightRadius={8}
                    borderColor="rgba(56, 189, 248, 0.2)"
                    borderTopWidth={1}
                    borderBottomWidth={1}
                    borderLeftWidth={1}
                    borderRightWidth={1}
                  >
                    <FolderIcon width={28} color="#38bdf8" />
                    <Text fontSize={11} fontWeight={700} color="#38bdf8">
                      {cleanText('Explorador desacoplado en el espacio')}
                    </Text>
                    <Text fontSize={9} color={color.textDim} textAlign="center">
                      {cleanText('Esta vista está flotando como panel independiente. Puedes moverla y manipularla libremente.')}
                    </Text>
                    <Container
                      cursor="pointer"
                      flexDirection="row"
                      alignItems="center"
                      gapColumn={6}
                      paddingLeft={10}
                      paddingRight={10}
                      height={24}
                      borderTopLeftRadius={12}
                      borderTopRightRadius={12}
                      borderBottomLeftRadius={12}
                      borderBottomRightRadius={12}
                      backgroundColor="rgba(56, 189, 248, 0.2)"
                      borderColor="#38bdf8"
                      borderTopWidth={1}
                      borderBottomWidth={1}
                      borderLeftWidth={1}
                      borderRightWidth={1}
                      onClick={() => dockView('explorer')}
                    >
                      <Text fontSize={9} fontWeight={700} color="#38bdf8">
                        {cleanText('Volver a acoplar')}
                      </Text>
                    </Container>
                  </Container>
                ) : (
                  <Container flexDirection="column" gapRow={4} flexGrow={1}>
                    {files.map((p) => {
                      const isSel = p === activeFile
                      const name = p.replace('/project/', '')
                      return (
                        <Container
                          key={p}
                          cursor="pointer"
                          flexDirection="row"
                          alignItems="center"
                          justifyContent="space-between"
                          paddingLeft={8}
                          paddingRight={8}
                          height={26}
                          borderTopLeftRadius={6}
                          borderTopRightRadius={6}
                          borderBottomLeftRadius={6}
                          borderBottomRightRadius={6}
                          backgroundColor={isSel ? 'rgba(124, 58, 237, 0.22)' : 'rgba(255, 255, 255, 0.04)'}
                          borderColor={isSel ? color.purple : 'rgba(255, 255, 255, 0.06)'}
                          borderTopWidth={1}
                          borderBottomWidth={1}
                          borderLeftWidth={1}
                          borderRightWidth={1}
                          onClick={() => {
                            setActiveFile(p)
                            if (!openTabs.includes(p)) setOpenTabs([...openTabs, p])
                            setView('editor')
                          }}
                        >
                          <Container flexDirection="row" alignItems="center" gapColumn={6}>
                            <FileCodeIcon width={12} color={isSel ? color.purple : color.textDim} />
                            <Text fontSize={10} fontWeight={isSel ? 700 : 400} color={isSel ? '#ffffff' : color.textDim}>
                              {cleanText(name)}
                            </Text>
                          </Container>
                          <Text fontSize={8} color="rgba(255,255,255,0.25)">
                            {cleanText(p.endsWith('.js') ? 'JS' : p.endsWith('.json') ? 'JSON' : 'TXT')}
                          </Text>
                        </Container>
                      )
                    })}
                  </Container>
                )}
              </Container>
            )}

            {/* SCREEN 3: TERMINAL */}
            {view === 'terminal' && (
              <Container flexDirection="column" width="100%" height="100%" padding={10} gapRow={6}>
                <Container flexDirection="row" justifyContent="space-between" alignItems="center">
                  <Text fontSize={10} fontWeight={700} color={color.accent}>
                    {cleanText('TERMINAL INTERACTIVO · WZED IN-BROWSER')}
                  </Text>
                  <Container flexDirection="row" gapColumn={6}>
                    <Container
                      cursor="pointer"
                      flexDirection="row"
                      alignItems="center"
                      gapColumn={4}
                      paddingLeft={6}
                      paddingRight={6}
                      height={20}
                      borderTopLeftRadius={4}
                      borderTopRightRadius={4}
                      borderBottomLeftRadius={4}
                      borderBottomRightRadius={4}
                      backgroundColor={undockedViews.terminal ? 'rgba(52, 211, 153, 0.25)' : 'rgba(255,255,255,0.08)'}
                      onClick={() => toggleDockView('terminal')}
                    >
                      <ExternalLinkIcon width={10} color={undockedViews.terminal ? '#34d399' : color.textDim} />
                      <Text fontSize={9} color={undockedViews.terminal ? '#34d399' : color.textDim}>
                        {cleanText(undockedViews.terminal ? 'Acoplar' : 'Desacoplar ↗')}
                      </Text>
                    </Container>
                    <Container
                      cursor="pointer"
                      flexDirection="row"
                      alignItems="center"
                      gapColumn={4}
                      paddingLeft={6}
                      paddingRight={6}
                      height={20}
                      borderTopLeftRadius={4}
                      borderTopRightRadius={4}
                      borderBottomLeftRadius={4}
                      borderBottomRightRadius={4}
                      backgroundColor="rgba(255,255,255,0.08)"
                      onClick={() => spatialRuntime.clear()}
                    >
                      <Trash2Icon width={10} color={color.textDim} />
                      <Text fontSize={9} color={color.textDim}>
                        {cleanText('Limpiar')}
                      </Text>
                    </Container>
                  </Container>
                </Container>

                {undockedViews.terminal ? (
                  <Container
                    flexDirection="column"
                    flexGrow={1}
                    alignItems="center"
                    justifyContent="center"
                    padding={16}
                    gapRow={10}
                    backgroundColor="rgba(52, 211, 153, 0.05)"
                    borderTopLeftRadius={8}
                    borderTopRightRadius={8}
                    borderBottomLeftRadius={8}
                    borderBottomRightRadius={8}
                    borderColor="rgba(52, 211, 153, 0.2)"
                    borderTopWidth={1}
                    borderBottomWidth={1}
                    borderLeftWidth={1}
                    borderRightWidth={1}
                  >
                    <TerminalIcon width={28} color="#34d399" />
                    <Text fontSize={11} fontWeight={700} color="#34d399">
                      {cleanText('Terminal desacoplada en el espacio')}
                    </Text>
                    <Text fontSize={9} color={color.textDim} textAlign="center">
                      {cleanText('La consola está activa en una ventana flotante 3D independiente.')}
                    </Text>
                    <Container
                      cursor="pointer"
                      flexDirection="row"
                      alignItems="center"
                      gapColumn={6}
                      paddingLeft={10}
                      paddingRight={10}
                      height={24}
                      borderTopLeftRadius={12}
                      borderTopRightRadius={12}
                      borderBottomLeftRadius={12}
                      borderBottomRightRadius={12}
                      backgroundColor="rgba(52, 211, 153, 0.2)"
                      borderColor="#34d399"
                      borderTopWidth={1}
                      borderBottomWidth={1}
                      borderLeftWidth={1}
                      borderRightWidth={1}
                      onClick={() => dockView('terminal')}
                    >
                      <Text fontSize={9} fontWeight={700} color="#34d399">
                        {cleanText('Volver a acoplar')}
                      </Text>
                    </Container>
                  </Container>
                ) : (
                  <>
                    <Container flexDirection="column" gapRow={4} flexGrow={1} overflow="hidden">
                      {logs.slice(-9).map((l) => (
                        <TerminalRow key={l.id} line={l} />
                      ))}
                    </Container>

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
                        onClick={() => handleRun()}
                      >
                        <Text fontSize={9} fontWeight={600} color={color.accent}>
                          {cleanText('Re-ejecutar')}
                        </Text>
                      </Container>
                    </Container>
                  </>
                )}
              </Container>
            )}

            {/* SCREEN 4: AI ASSISTANT (WZED AIPanel) */}
            {view === 'ai' && (
              <Container flexDirection="column" width="100%" height="100%" padding={10} gapRow={8}>
                <Container flexDirection="row" justifyContent="space-between" alignItems="center">
                  <Container flexDirection="row" alignItems="center" gapColumn={6}>
                    <SparklesIcon width={12} color="#c084fc" />
                    <Text fontSize={11} fontWeight={700} color="#c084fc">
                      {cleanText('ASISTENTE IA WZED & AZURE FOUNDRY')}
                    </Text>
                  </Container>
                  <Container flexDirection="row" gapColumn={6} alignItems="center">
                    <Container
                      cursor="pointer"
                      flexDirection="row"
                      alignItems="center"
                      gapColumn={4}
                      paddingLeft={6}
                      paddingRight={6}
                      height={20}
                      borderTopLeftRadius={4}
                      borderTopRightRadius={4}
                      borderBottomLeftRadius={4}
                      borderBottomRightRadius={4}
                      backgroundColor={undockedViews.ai ? 'rgba(192, 132, 252, 0.25)' : 'rgba(255,255,255,0.08)'}
                      onClick={() => toggleDockView('ai')}
                    >
                      <ExternalLinkIcon width={10} color={undockedViews.ai ? '#c084fc' : color.textDim} />
                      <Text fontSize={9} color={undockedViews.ai ? '#c084fc' : color.textDim}>
                        {cleanText(undockedViews.ai ? 'Acoplar' : 'Desacoplar ↗')}
                      </Text>
                    </Container>
                    <Text fontSize={9} color={aiStatus === 'working' ? '#fbbf24' : color.success} fontWeight={600}>
                      {cleanText(aiStatus === 'working' ? '⏳ Procesando...' : '⚡ Conectado')}
                    </Text>
                  </Container>
                </Container>

                {undockedViews.ai ? (
                  <Container
                    flexDirection="column"
                    flexGrow={1}
                    alignItems="center"
                    justifyContent="center"
                    padding={16}
                    gapRow={10}
                    backgroundColor="rgba(192, 132, 252, 0.05)"
                    borderTopLeftRadius={8}
                    borderTopRightRadius={8}
                    borderBottomLeftRadius={8}
                    borderBottomRightRadius={8}
                    borderColor="rgba(192, 132, 252, 0.2)"
                    borderTopWidth={1}
                    borderBottomWidth={1}
                    borderLeftWidth={1}
                    borderRightWidth={1}
                  >
                    <BotIcon width={28} color="#c084fc" />
                    <Text fontSize={11} fontWeight={700} color="#c084fc">
                      {cleanText('Asistente IA desacoplado en el espacio')}
                    </Text>
                    <Text fontSize={9} color={color.textDim} textAlign="center">
                      {cleanText('El chat con wZed y Azure AI Foundry está abierto en un panel 3D independiente.')}
                    </Text>
                    <Container
                      cursor="pointer"
                      flexDirection="row"
                      alignItems="center"
                      gapColumn={6}
                      paddingLeft={10}
                      paddingRight={10}
                      height={24}
                      borderTopLeftRadius={12}
                      borderTopRightRadius={12}
                      borderBottomLeftRadius={12}
                      borderBottomRightRadius={12}
                      backgroundColor="rgba(192, 132, 252, 0.2)"
                      borderColor="#c084fc"
                      borderTopWidth={1}
                      borderBottomWidth={1}
                      borderLeftWidth={1}
                      borderRightWidth={1}
                      onClick={() => dockView('ai')}
                    >
                      <Text fontSize={9} fontWeight={700} color="#c084fc">
                        {cleanText('Volver a acoplar')}
                      </Text>
                    </Container>
                  </Container>
                ) : (
                  <>

                {/* AI Chat History */}
                <Container flexDirection="column" gapRow={6} flexGrow={1} overflow="hidden">
                  {aiHistory.slice(-4).map((msg, idx) => (
                    <Container
                      key={idx}
                      flexDirection="column"
                      padding={8}
                      borderTopLeftRadius={8}
                      borderTopRightRadius={8}
                      borderBottomLeftRadius={8}
                      borderBottomRightRadius={8}
                      backgroundColor={msg.role === 'user' ? 'rgba(124, 58, 237, 0.18)' : 'rgba(255, 255, 255, 0.05)'}
                      borderColor={msg.role === 'user' ? 'rgba(124, 58, 237, 0.35)' : 'rgba(255, 255, 255, 0.08)'}
                      borderTopWidth={1}
                      borderBottomWidth={1}
                      borderLeftWidth={1}
                      borderRightWidth={1}
                    >
                      <Text fontSize={9} fontWeight={700} color={msg.role === 'user' ? '#c084fc' : color.accent}>
                        {cleanText(msg.role === 'user' ? 'TÚ' : 'SUBAGENTE WZED')}
                      </Text>
                      <Text fontSize={10} color="#f1f5f9" lineHeight={1.3}>
                        {cleanText(msg.text)}
                      </Text>
                      {msg.tool && (
                        <Text fontSize={8} color="#34d399" fontWeight={600}>
                          {cleanText(`⚙️ Herramienta: ${msg.tool}`)}
                        </Text>
                      )}
                    </Container>
                  ))}
                </Container>

                {/* Quick Prompts */}
                <Container flexDirection="row" gapColumn={6}>
                  <Container
                    cursor="pointer"
                    paddingLeft={6}
                    paddingRight={6}
                    height={20}
                    borderTopLeftRadius={10}
                    borderTopRightRadius={10}
                    borderBottomLeftRadius={10}
                    borderBottomRightRadius={10}
                    backgroundColor="rgba(255, 255, 255, 0.08)"
                    onClick={() => handleSendAiPrompt('Crea un componente spatial para el preview')}
                  >
                    <Text fontSize={9} color="#e0e7ff">
                      {cleanText('✨ Tarjeta 3D')}
                    </Text>
                  </Container>
                  <Container
                    cursor="pointer"
                    paddingLeft={6}
                    paddingRight={6}
                    height={20}
                    borderTopLeftRadius={10}
                    borderTopRightRadius={10}
                    borderBottomLeftRadius={10}
                    borderBottomRightRadius={10}
                    backgroundColor="rgba(255, 255, 255, 0.08)"
                    onClick={() => handleSendAiPrompt('Ejecuta el script principal index.js')}
                  >
                    <Text fontSize={9} color="#e0e7ff">
                      {cleanText('▶ Correr index.js')}
                    </Text>
                  </Container>
                  <Container
                    cursor="pointer"
                    paddingLeft={6}
                    paddingRight={6}
                    height={20}
                    borderTopLeftRadius={10}
                    borderTopRightRadius={10}
                    borderBottomLeftRadius={10}
                    borderBottomRightRadius={10}
                    backgroundColor="rgba(255, 255, 255, 0.08)"
                    onClick={() => handleSendAiPrompt('Lista todos los archivos del VFS')}
                  >
                    <Text fontSize={9} color="#e0e7ff">
                      {cleanText('📁 Listar VFS')}
                    </Text>
                  </Container>
                </Container>
                  </>
                )}
              </Container>
            )}

            {/* SCREEN 5: GIT CONTROL (WZED GitPanel) */}
            {view === 'git' && (
              <Container flexDirection="column" width="100%" height="100%" padding={10} gapRow={8}>
                <Container flexDirection="row" justifyContent="space-between" alignItems="center">
                  <Container flexDirection="row" alignItems="center" gapColumn={6}>
                    <GitBranchIcon width={12} color="#fb923c" />
                    <Text fontSize={11} fontWeight={700} color="#fb923c">
                      {cleanText('CONTROL DE VERSIONES · RAMA MAIN')}
                    </Text>
                  </Container>
                  <Text fontSize={9} color={committed ? color.success : color.textDim}>
                    {cleanText(committed ? '✓ Cambios confirmados' : '1 archivo modificado')}
                  </Text>
                </Container>

                <Container flexDirection="column" gapRow={4} flexGrow={1}>
                  <Container
                    flexDirection="row"
                    alignItems="center"
                    justifyContent="space-between"
                    padding={6}
                    backgroundColor="rgba(255, 255, 255, 0.04)"
                    borderTopLeftRadius={6}
                    borderTopRightRadius={6}
                    borderBottomLeftRadius={6}
                    borderBottomRightRadius={6}
                  >
                    <Text fontSize={10} color="#e2e8f0">
                      {cleanText('/project/spatial-card.js')}
                    </Text>
                    <Text fontSize={9} color="#fbbf24" fontWeight={700}>
                      {cleanText('MODIFICADO')}
                    </Text>
                  </Container>
                </Container>

                <Container flexDirection="row" gapColumn={8} alignItems="center">
                  <Container
                    cursor="pointer"
                    flexGrow={1}
                    height={26}
                    paddingLeft={8}
                    justifyContent="center"
                    backgroundColor="rgba(255, 255, 255, 0.08)"
                    borderTopLeftRadius={6}
                    borderTopRightRadius={6}
                    borderBottomLeftRadius={6}
                    borderBottomRightRadius={6}
                    onClick={() => {
                      const nextMsg = commitMessage.includes('spatial') ? 'fix: optimize vfs stream' : 'feat: update spatial module'
                      setCommitMessage(nextMsg)
                    }}
                  >
                    <Text fontSize={9} color="#94a3b8">
                      {cleanText(commitMessage)}
                    </Text>
                  </Container>
                  <Container
                    cursor="pointer"
                    paddingLeft={10}
                    paddingRight={10}
                    height={26}
                    borderTopLeftRadius={13}
                    borderTopRightRadius={13}
                    borderBottomLeftRadius={13}
                    borderBottomRightRadius={13}
                    backgroundColor="rgba(251, 146, 60, 0.25)"
                    borderColor="#fb923c"
                    borderTopWidth={1}
                    borderBottomWidth={1}
                    borderLeftWidth={1}
                    borderRightWidth={1}
                    alignItems="center"
                    justifyContent="center"
                    onClick={() => setCommitted(true)}
                  >
                    <Text fontSize={9} fontWeight={700} color="#fb923c">
                      {cleanText('✓ Guardar Commit')}
                    </Text>
                  </Container>
                </Container>
              </Container>
            )}

            {/* SCREEN 6: GLOBAL SEARCH (WZED SearchPanel) */}
            {view === 'search' && (
              <Container flexDirection="column" width="100%" height="100%" padding={10} gapRow={8}>
                <Container flexDirection="row" justifyContent="space-between" alignItems="center">
                  <Container flexDirection="row" alignItems="center" gapColumn={6}>
                    <SearchIcon width={12} color="#38bdf8" />
                    <Text fontSize={11} fontWeight={700} color="#38bdf8">
                      {cleanText(`BÚSQUEDA GLOBAL ("${searchQuery}")`)}
                    </Text>
                  </Container>
                  <Text fontSize={9} color={color.textDim}>
                    {cleanText(`${searchResults.length} coincidencias`)}
                  </Text>
                </Container>

                <Container flexDirection="column" gapRow={4} flexGrow={1} overflow="hidden">
                  {searchResults.map((res, i) => (
                    <Container
                      key={i}
                      cursor="pointer"
                      flexDirection="column"
                      padding={6}
                      backgroundColor="rgba(255, 255, 255, 0.04)"
                      borderTopLeftRadius={6}
                      borderTopRightRadius={6}
                      borderBottomLeftRadius={6}
                      borderBottomRightRadius={6}
                      onClick={() => {
                        setActiveFile(res.file)
                        setView('editor')
                      }}
                    >
                      <Text fontSize={9} fontWeight={700} color={color.accent}>
                        {cleanText(`${res.file.replace('/project/', '')}:${res.line}`)}
                      </Text>
                      <Text fontSize={9} color="#cbd5e1">
                        {cleanText(res.text)}
                      </Text>
                    </Container>
                  ))}
                </Container>
              </Container>
            )}

            {/* SCREEN 7: HTTP REQUEST SENDER (WZED RequestSender) */}
            {view === 'request' && (
              <Container flexDirection="column" width="100%" height="100%" padding={10} gapRow={8}>
                <Container flexDirection="row" justifyContent="space-between" alignItems="center">
                  <Container flexDirection="row" alignItems="center" gapColumn={6}>
                    <SendIcon width={12} color="#f472b6" />
                    <Text fontSize={11} fontWeight={700} color="#f472b6">
                      {cleanText('CLIENTE HTTP / EMISOR DE PETICIONES')}
                    </Text>
                  </Container>
                  {httpStatus && (
                    <Text fontSize={9} fontWeight={700} color="#34d399">
                      {cleanText(`${httpStatus} OK (12ms)`)}
                    </Text>
                  )}
                </Container>

                {/* Method & URL bar */}
                <Container flexDirection="row" gapColumn={6} alignItems="center">
                  <Container
                    cursor="pointer"
                    paddingLeft={8}
                    paddingRight={8}
                    height={24}
                    backgroundColor="rgba(244, 114, 182, 0.25)"
                    borderColor="#f472b6"
                    borderTopWidth={1}
                    borderBottomWidth={1}
                    borderLeftWidth={1}
                    borderRightWidth={1}
                    borderTopLeftRadius={6}
                    borderTopRightRadius={6}
                    borderBottomLeftRadius={6}
                    borderBottomRightRadius={6}
                    alignItems="center"
                    justifyContent="center"
                    onClick={() => setHttpMethod(httpMethod === 'GET' ? 'POST' : 'GET')}
                  >
                    <Text fontSize={10} fontWeight={700} color="#f472b6">
                      {cleanText(httpMethod)}
                    </Text>
                  </Container>
                  <Container
                    cursor="pointer"
                    flexGrow={1}
                    height={24}
                    paddingLeft={8}
                    backgroundColor="rgba(255, 255, 255, 0.08)"
                    borderTopLeftRadius={6}
                    borderTopRightRadius={6}
                    borderBottomLeftRadius={6}
                    borderBottomRightRadius={6}
                    justifyContent="center"
                    onClick={() => {
                      const nextUrl = httpUrl === '/api/preview' ? '/api/cards' : httpUrl === '/api/cards' ? '/api/health' : '/api/preview'
                      setHttpUrl(nextUrl)
                    }}
                  >
                    <Text fontSize={10} color="#ffffff">
                      {cleanText(`http://localhost:3000${httpUrl}`)}
                    </Text>
                  </Container>
                  <Container
                    cursor="pointer"
                    paddingLeft={10}
                    paddingRight={10}
                    height={24}
                    borderTopLeftRadius={12}
                    borderTopRightRadius={12}
                    borderBottomLeftRadius={12}
                    borderBottomRightRadius={12}
                    backgroundColor={color.purple}
                    alignItems="center"
                    justifyContent="center"
                    onClick={handleSendHttpRequest}
                  >
                    <Text fontSize={9} fontWeight={700} color="#ffffff">
                      {cleanText('Enviar')}
                    </Text>
                  </Container>
                </Container>

                {/* HTTP Response Body */}
                <Container
                  flexDirection="column"
                  flexGrow={1}
                  padding={8}
                  backgroundColor="rgba(0, 0, 0, 0.6)"
                  borderTopLeftRadius={6}
                  borderTopRightRadius={6}
                  borderBottomLeftRadius={6}
                  borderBottomRightRadius={6}
                  overflow="hidden"
                >
                  <Text fontSize={9} color="#34d399" lineHeight={1.3}>
                    {cleanText(httpResponse || '// Presiona Enviar para probar el endpoint VFS')}
                  </Text>
                </Container>
              </Container>
            )}

            {/* SCREEN 8: PERFORMANCE MONITOR (WZED PerfMonitor) */}
            {view === 'perf' && (
              <Container flexDirection="column" width="100%" height="100%" padding={10} gapRow={8}>
                <Container flexDirection="row" alignItems="center" gapColumn={6}>
                  <ActivityIcon width={12} color="#a3e635" />
                  <Text fontSize={11} fontWeight={700} color="#a3e635">
                    {cleanText('MONITOR DE RENDIMIENTO ESPACIAL')}
                  </Text>
                </Container>

                <Container flexDirection="row" gapColumn={8} flexGrow={1}>
                  <Container
                    flexDirection="column"
                    flexGrow={1}
                    padding={10}
                    gapRow={4}
                    backgroundColor="rgba(255, 255, 255, 0.04)"
                    borderTopLeftRadius={8}
                    borderTopRightRadius={8}
                    borderBottomLeftRadius={8}
                    borderBottomRightRadius={8}
                  >
                    <Text fontSize={9} color={color.textDim}>
                      {cleanText('TASA DE FOTOGRAMAS')}
                    </Text>
                    <Text fontSize={18} fontWeight={700} color="#34d399">
                      {cleanText('90 FPS')}
                    </Text>
                    <Text fontSize={8} color="#94a3b8">
                      {cleanText('Presupuesto WebXR: 11.1ms')}
                    </Text>
                  </Container>

                  <Container
                    flexDirection="column"
                    flexGrow={1}
                    padding={10}
                    gapRow={4}
                    backgroundColor="rgba(255, 255, 255, 0.04)"
                    borderTopLeftRadius={8}
                    borderTopRightRadius={8}
                    borderBottomLeftRadius={8}
                    borderBottomRightRadius={8}
                  >
                    <Text fontSize={9} color={color.textDim}>
                      {cleanText('ARCHIVOS EN VFS')}
                    </Text>
                    <Text fontSize={18} fontWeight={700} color={color.accent}>
                      {cleanText(`${files.length} nodos`)}
                    </Text>
                    <Text fontSize={8} color="#94a3b8">
                      {cleanText('Memoria en navegador: ~140 KB')}
                    </Text>
                  </Container>
                </Container>
              </Container>
            )}

            {/* SCREEN 9: SETTINGS (WZED SettingsModal) */}
            {view === 'settings' && (
              <Container flexDirection="column" width="100%" height="100%" padding={10} gapRow={8}>
                <Text fontSize={11} fontWeight={700} color="#94a3b8">
                  {cleanText('CONFIGURACIÓN DEL ESTUDIO WZED')}
                </Text>
                <Container flexDirection="column" gapRow={6}>
                  <Container flexDirection="row" justifyContent="space-between" alignItems="center">
                    <Text fontSize={10} color="#e2e8f0">
                      {cleanText('Tema de Color')}
                    </Text>
                    <Text fontSize={9} color={color.purple} fontWeight={700}>
                      {cleanText('VisionOS Flat Pastel')}
                    </Text>
                  </Container>
                  <Container flexDirection="row" justifyContent="space-between" alignItems="center">
                    <Text fontSize={10} color="#e2e8f0">
                      {cleanText('Motor de Inferencia de Voz')}
                    </Text>
                    <Text fontSize={9} color={azureFoundryVoice.isConfigured() ? '#34d399' : color.accent} fontWeight={700}>
                      {cleanText(azureFoundryVoice.isConfigured() ? '⚡ Foundry Conectado' : 'Azure AI Foundry + Hey-Buddy')}
                    </Text>
                  </Container>
                  <Container flexDirection="row" justifyContent="space-between" alignItems="center">
                    <Text fontSize={10} color="#e2e8f0">
                      {cleanText('Seguridad WebAssembly / CSP')}
                    </Text>
                    <Text fontSize={9} color={isWasmSupported() ? '#34d399' : '#38bdf8'} fontWeight={700}>
                      {cleanText(isWasmSupported() ? 'ONNX Wasm Habilitado' : 'Guardia CSP Activa (VAD Nativo)')}
                    </Text>
                  </Container>
                  <Container flexDirection="row" justifyContent="space-between" alignItems="center">
                    <Text fontSize={10} color="#e2e8f0">
                      {cleanText('Auto-ejecutar al modificar')}
                    </Text>
                    <Text fontSize={9} color="#34d399" fontWeight={700}>
                      {cleanText('Activado')}
                    </Text>
                  </Container>
                </Container>
              </Container>
            )}
          </Container>
        </Container>

        {/* 3. WZED BOTTOM STATUS BAR */}
        <Container
          flexDirection="row"
          alignItems="center"
          justifyContent="space-between"
          width="100%"
          height={22}
          paddingLeft={10}
          paddingRight={10}
          backgroundColor="rgba(15, 23, 42, 0.65)"
          borderColor="rgba(255, 255, 255, 0.08)"
          borderTopWidth={1}
          borderBottomWidth={1}
          borderLeftWidth={1}
          borderRightWidth={1}
          borderTopLeftRadius={6}
          borderTopRightRadius={6}
          borderBottomLeftRadius={6}
          borderBottomRightRadius={6}
        >
          <Container flexDirection="row" alignItems="center" gapColumn={10}>
            <Text fontSize={9} fontWeight={600} color="#fb923c">
              {cleanText('🌿 main')}
            </Text>
            <Text fontSize={9} color={color.textDim}>
              {cleanText(activeFile.replace('/project/', ''))}
            </Text>
            <Text fontSize={8} color="rgba(255,255,255,0.3)">
              {cleanText('UTF-8 · JavaScript')}
            </Text>
          </Container>

          <Container flexDirection="row" alignItems="center" gapColumn={10}>
            <Text fontSize={8} color={isWasmSupported() ? '#34d399' : '#38bdf8'} fontWeight={600}>
              {cleanText(isWasmSupported() ? '🧠 ONNX Wasm' : '🛡️ CSP Guard')}
            </Text>
            <Text fontSize={8} color="#34d399" fontWeight={600}>
              {cleanText('🟢 Node In-Browser')}
            </Text>
            <Text fontSize={8} color="#c084fc" fontWeight={600}>
              {cleanText('⚡ Azure Foundry Ready')}
            </Text>
          </Container>
        </Container>
      </Container>
    </Panel>
  )
}

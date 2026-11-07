/**
 * Virtual File System (VFS) inspired by wZed (ScelarOrg/wZed)
 * Provides in-browser /project file hierarchy, snapshot persistence,
 * and starter templates without requiring a remote server.
 */

export interface FileEntry {
  name: string
  path: string
  type: 'file' | 'folder'
  content?: string
  children?: FileEntry[]
}

const STORAGE_KEY = 'spatial_workspace_vfs_v1'

const SPATIAL_TEMPLATE: Record<string, string> = {
  '/project/package.json': JSON.stringify(
    {
      name: 'spatial-code-studio',
      version: '1.0.0',
      description: 'wZed-powered in-browser runtime for spatial workspace',
      main: 'index.js',
    },
    null,
    2,
  ),
  '/project/index.js': `// ✨ Spatial In-Browser Runner (wZed Logic)
console.log('⚡ Initializing Spatial Workspace Script...');

const anchors = [
  { name: 'Vision Anchor', x: 0.0, y: 1.25, z: -1.25, color: '#e0f2fe' },
  { name: 'Mind Map Orb', x: -0.72, y: 1.45, z: -1.15, color: '#ede9fe' },
  { name: 'Web Preview', x: 0.88, y: 1.25, z: -1.22, color: '#d1fae5' },
];

console.log(\`📦 Created \${anchors.length} spatial reference nodes in 3D scene.\`);
anchors.forEach((a, i) => {
  console.log(\`  [\${i + 1}] \${a.name} -> pos: (\${a.x}, \${a.y}, \${a.z})\`);
});

console.log('🎉 Execution completed successfully!');
return { ok: true, nodeCount: anchors.length, anchors };
`,
  '/project/spatial-card.js': `// 🎨 Generates DOM / HTML preview for Web Preview Card
console.log('Rendering Spatial Card Widget...');

const html = \`
  <div style="font-family: system-ui, sans-serif; padding: 1.2rem; color: #1e293b;">
    <h2 style="color: #7c3aed; margin-top: 0;">VisionOS Pastel Card</h2>
    <p style="font-size: 13px; color: #475569;">
      Compilado en el navegador con el motor VFS de <strong>wZed</strong>.
    </p>
    <div style="display: flex; gap: 8px; margin-top: 12px;">
      <span style="background: #e0f2fe; padding: 4px 10px; border-radius: 99px; font-size: 11px; font-weight: 600; color: #0284c7;">WebXR</span>
      <span style="background: #ede9fe; padding: 4px 10px; border-radius: 99px; font-size: 11px; font-weight: 600; color: #7c3aed;">Hand Kinematics</span>
      <span style="background: #d1fae5; padding: 4px 10px; border-radius: 99px; font-size: 11px; font-weight: 600; color: #059669;">Spatial UI</span>
    </div>
  </div>
\`;

console.log('✅ HTML markup generated.');
return html;
`,
  '/project/server.js': `// 🚀 Mock Node.js / Express Server (wZed Architecture)
console.log('🌐 [HTTP] Starting mock server on port 3000...');

const routes = {
  '/': { status: 200, message: 'Spatial Workspace API Online' },
  '/api/health': { status: 200, uptime: '100%', vfs: 'active' },
};

console.log('📡 [HTTP] Routes registered:');
Object.keys(routes).forEach(route => console.log(\`   GET \${route}\`));
console.log('✅ [HTTP] Listening on http://localhost:3000');

return routes['/api/health'];
`,
}

class VirtualFileSystem {
  private files: Map<string, string> = new Map()
  private listeners: Set<() => void> = new Set()

  constructor() {
    this.init()
  }

  private init() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (typeof parsed === 'object' && parsed !== null) {
          Object.entries(parsed).forEach(([path, content]) => {
            if (typeof content === 'string') this.files.set(path, content)
          })
          if (this.files.size > 0) return
        }
      }
    } catch {
      // ignore storage failure
    }
    this.resetToTemplate(SPATIAL_TEMPLATE)
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  private notify() {
    this.saveSnapshot()
    this.listeners.forEach((cb) => cb())
  }

  public saveSnapshot() {
    try {
      const obj: Record<string, string> = {}
      for (const [path, content] of this.files.entries()) {
        obj[path] = content
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(obj))
    } catch (e) {
      console.warn('VFS save snapshot failed:', e)
    }
  }

  public resetToTemplate(template: Record<string, string> = SPATIAL_TEMPLATE) {
    this.files.clear()
    Object.entries(template).forEach(([path, content]) => {
      this.files.set(path, content)
    })
    this.notify()
  }

  public getFiles(): Record<string, string> {
    const obj: Record<string, string> = {}
    for (const [path, content] of this.files.entries()) {
      obj[path] = content
    }
    return obj
  }

  public getFilePaths(): string[] {
    return Array.from(this.files.keys()).sort()
  }

  public readFile(path: string): string | undefined {
    return this.files.get(path)
  }

  public writeFile(path: string, content: string) {
    this.files.set(path, content)
    this.notify()
  }

  public deleteFile(path: string) {
    if (this.files.delete(path)) {
      this.notify()
    }
  }

  public createFile(path: string, content = '') {
    const normalized = path.startsWith('/project') ? path : `/project/${path.replace(/^\//, '')}`
    this.files.set(normalized, content)
    this.notify()
  }

  public listDirectory(dirPath = '/project'): FileEntry[] {
    const normDir = dirPath.endsWith('/') ? dirPath.slice(0, -1) : dirPath
    const entries: FileEntry[] = []

    for (const [filePath, content] of this.files.entries()) {
      if (filePath.startsWith(normDir + '/')) {
        const sub = filePath.slice(normDir.length + 1)
        const parts = sub.split('/')
        const name = parts[0]
        if (parts.length === 1) {
          entries.push({
            name,
            path: filePath,
            type: 'file',
            content,
          })
        }
      }
    }
    return entries.sort((a, b) => a.name.localeCompare(b.name))
  }
}

export const vfs = new VirtualFileSystem()

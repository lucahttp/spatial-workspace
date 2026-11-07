/**
 * AI Coding Tool Bridge
 * Adopts tool execution schema from wZed (src/lib/ai-sdk.ts)
 * Enables programmatic workspace manipulation from voice commands or AI agents.
 */

import { vfs } from './vfs'
import { spatialRuntime } from './spatialRuntime'

export interface ToolDef {
  name: string
  description: string
  parameters: Record<string, unknown>
}

export const WZED_TOOLS: ToolDef[] = [
  {
    name: 'read_file',
    description: 'Read the contents of a file in the virtual filesystem (/project).',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to file (e.g. /project/index.js)' },
      },
      required: ['path'],
    },
  },
  {
    name: 'write_file',
    description: 'Create or overwrite a file in the virtual filesystem (/project).',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to file' },
        content: { type: 'string', description: 'File text content' },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'list_directory',
    description: 'List all files in the virtual filesystem.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Directory path (default /project)' },
      },
    },
  },
  {
    name: 'execute_command',
    description: 'Execute a terminal command or script in the spatial runtime.',
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Command to run (e.g. node index.js or ls)' },
      },
      required: ['command'],
    },
  },
]

export async function executeWzedTool(
  toolName: string,
  args: Record<string, unknown>,
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    switch (toolName) {
      case 'read_file': {
        const path = String(args.path)
        const content = vfs.readFile(path)
        if (content === undefined) return { success: false, error: `File not found: ${path}` }
        return { success: true, data: content }
      }
      case 'write_file': {
        const path = String(args.path)
        const content = String(args.content ?? '')
        vfs.writeFile(path, content)
        return { success: true, data: { path, bytes: content.length } }
      }
      case 'list_directory': {
        const path = String(args.path || '/project')
        const entries = vfs.listDirectory(path)
        return { success: true, data: entries }
      }
      case 'execute_command': {
        const cmd = String(args.command)
        await spatialRuntime.execCommand(cmd)
        return { success: true, data: { executed: cmd } }
      }
      default:
        return { success: false, error: `Unknown tool: ${toolName}` }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: msg }
  }
}

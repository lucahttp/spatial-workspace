# Microsoft App Memory Bank

> Last Updated: 2026-11-07T09:53:00Z
> Session: 91a7ba0f-09a0-45a4-bd35-514b203b4a35

## Project Overview

| Property                              | Value                                                  |
| ------------------------------------- | ------------------------------------------------------ |
| App Name                              | Spatial Workspace XR                                   |
| App ID (slug)                         | spatial-workspace                                      |
| App GUID                              | eb2d1edb-9945-4b58-91e9-a13d76db02af                   |
| Project Path                          | /Users/luca/Documents/spatial-workspace                |
| Environment Name                      | Power Apps Default Environment                         |
| Environment ID                        | 2093e5e9-6211-ee23-b4a1-cc9ef49a5f0d                   |
| Remote git URL                        | https://github.com/lucahttp/spatial-workspace          |
| Power Apps URL                        | https://make.powerapps.com/environments/2093e5e9-6211-ee23-b4a1-cc9ef49a5f0d/home |
| Created Date                          | 2026-11-07                                             |
| Status                                | Prepared for Deployment to Managed App                 |

## User Preferences

### Design Preferences
- Theme: VisionOS Flat Pastel & PICO OS 5 (Soft Cyan #e0f2fe, Lavender #ede9fe, Purple #7c3aed)
- UI Layout: Floating Multi-Window 3D Spatial Canvas with wZed In-Browser Code Studio and Thinking Orbs

### Technical Preferences
- Runtime: Microsoft Copilot Managed Runtime (`@microsoft/cmr-apps`)
- Environment ID: `2093e5e9-6211-ee23-b4a1-cc9ef49a5f0d`
- AI Supervisor: Azure AI Foundry GPT Live Voice Agent with wZed Coding Subagent Delegation
- Wake Word Engine: Hey-Buddy ONNX Web & Hands-Free Speech Spotting

## Completed Steps

### /create-app & /init
- [x] Prerequisites validated (Node.js v22+, git, ms CLI v0.33.0)
- [x] `ms.config.json` configured with schema, valid GUID, and environmentId `2093e5e9-6211-ee23-b4a1-cc9ef49a5f0d`
- [x] `@microsoft/cmr-apps` and `@microsoft/cmr-apps-vite-plugin` configured in `vite.config.ts`
- [x] `npx @microsoft/cmr-cli app pack` validated and passing locally
- [x] `npm install && npm run build` succeeded with 0 errors
- [x] Git repository synced with remote `https://github.com/lucahttp/spatial-workspace`

## Current Status

**Last Action**: Configured `environmentId: "2093e5e9-6211-ee23-b4a1-cc9ef49a5f0d"` in `ms.config.json` and generated `memory-bank.md` for Copilot Managed Runtime deployment.

**Next Step**: Authenticate with Microsoft Entra ID (`ms auth login`) to connect the target environment `2093e5e9-6211-ee23-b4a1-cc9ef49a5f0d` and run `ms app deploy`.

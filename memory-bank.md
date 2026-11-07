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
| Status                                | Successfully Deployed to Managed App Runtime           |
| Play URL                              | https://play.preview.managedapps.cloud.microsoft/apps/eb2d1edb-9945-4b58-91e9-a13d76db02af |

## User Preferences

### Design Preferences
- Theme: VisionOS Flat Pastel & PICO OS 5 (Soft Cyan #e0f2fe, Lavender #ede9fe, Purple #7c3aed)
- UI Layout: Floating Multi-Window 3D Spatial Canvas with wZed In-Browser Code Studio and Thinking Orbs

### Technical Preferences
- Runtime: Microsoft Copilot Managed Runtime (`@microsoft/cmr-apps`)
- Environment ID: `2093e5e9-6211-ee23-b4a1-cc9ef49a5f0d`
- AI Supervisor: Azure AI Foundry GPT Live Voice Agent with wZed Coding Subagent Delegation
- Wake Word Engine: Hey-Buddy ONNX Web (Silero VAD + Speech-Embedding + Wake-Word ONNX pipeline) - acts strictly as the wake trigger for GPT Live without local TTS/STT/LLM.

## Completed Steps

### /create-app, /init & /deploy
- [x] Prerequisites validated (Node.js v22+, git, ms CLI v0.33.0)
- [x] `ms.config.json` configured with schema, valid GUID `eb2d1edb-9945-4b58-91e9-a13d76db02af`, and environmentId `2093e5e9-6211-ee23-b4a1-cc9ef49a5f0d`
- [x] `@microsoft/cmr-apps` and `@microsoft/cmr-apps-vite-plugin` configured in `vite.config.ts`
- [x] `AllowExternalArtifactDeployment` enabled in Power Platform environment
- [x] Hey-Buddy ONNX wake-word detection ported from `mortimer-js` into `src/services/heybuddy/` and `src/hooks/useHeyBuddy.ts`
- [x] Zero external TTS/STT/LLM used: HeyBuddy triggers GPT Live from Azure Foundry, which handles audio streaming and wZed subagent delegation
- [x] `npx ms app pack` and `npx ms app deploy` executed successfully
- [x] Deployed live to Microsoft Managed Apps: `https://play.preview.managedapps.cloud.microsoft/apps/eb2d1edb-9945-4b58-91e9-a13d76db02af`
- [x] Git repository clean and synced with remote `https://github.com/lucahttp/spatial-workspace`

## Current Status

**Last Action**: Successfully deployed artifact to Power Apps Copilot Managed Runtime environment `2093e5e9-6211-ee23-b4a1-cc9ef49a5f0d`. App play URL: `https://play.preview.managedapps.cloud.microsoft/apps/eb2d1edb-9945-4b58-91e9-a13d76db02af`.

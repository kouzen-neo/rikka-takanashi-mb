# Rikka Takanashi Chat

Web chat UI for Rikka Takanashi (Love, Chunibyo & Other Delusions) backed by a local OpenAI-compatible LLM server. Mobile + desktop responsive, with streaming replies, chat history, and a chuunibyou-themed aurora background.

## Requirements

- Node.js 18+
- A local OpenAI-compatible server (Ollama, LM Studio, vLLM, etc.) with streaming `/chat/completions`

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Configuration

Open the Settings panel (gear icon) and set:

- **Base URL** — your server's OpenAI-compatible endpoint, e.g. `http://localhost:20128/v1`. Models are auto-detected on open.
- **Your name** — Rikka calls you "Dark Flame Master" plus this name. Default: Yuuta.
- **Model** — auto-detected, or type manually.
- **API Key** — optional for local servers.
- **Max Tokens** — response length (64–4096).

Settings persist in browser localStorage.

## Features

- Streaming responses with a "thinking" indicator
- New chat, history sidebar, and conversation branching
- Edit, undo, stop, retry, and branch per message
- Rikka profile/bio dialog
- Randomized opening messages per new chat
- Aurora animated background (black / white / red)

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Run production build |
| `npm run lint` | Lint |

## Tech stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · lucide-react

## Project structure

```
app/          Routes, layout, API proxies (chat + models)
components/    Chat, MessageBubble, SettingsPanel, ProfileDialog
lib/           Character data, settings, history persistence
public/        Static assets (rikka.jpg)
```

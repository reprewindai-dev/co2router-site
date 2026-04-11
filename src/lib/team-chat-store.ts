import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import type { TeamChatMessage, TeamChatSnapshot } from '@/types/control-surface'

function resolveRuntimeDir() {
  const configuredDir = process.env.CO2ROUTER_RUNTIME_DIR || process.env.ECOBE_RUNTIME_DIR
  if (configuredDir && configuredDir.trim().length > 0) {
    return path.resolve(configuredDir.trim())
  }
  if (process.env.VERCEL === '1') {
    return '/tmp/co2router-runtime'
  }
  return path.join(process.cwd(), '.runtime')
}

const CHAT_DIR = resolveRuntimeDir()
const CHAT_FILE = path.join(CHAT_DIR, 'team-chat.json')
const MAX_TEAMS = 64
const MAX_MESSAGES_PER_TEAM = 250

interface TeamChatStore {
  teams: Record<string, TeamChatMessage[]>
}

const EMPTY_STORE: TeamChatStore = { teams: {} }

let writeChain = Promise.resolve()

function normalizeTeamId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
}

async function ensureStoreFile() {
  await mkdir(CHAT_DIR, { recursive: true })
  try {
    await readFile(CHAT_FILE, 'utf8')
  } catch {
    await writeFile(CHAT_FILE, JSON.stringify(EMPTY_STORE, null, 2), 'utf8')
  }
}

async function readStore(): Promise<TeamChatStore> {
  await ensureStoreFile()
  try {
    const raw = await readFile(CHAT_FILE, 'utf8')
    const parsed = JSON.parse(raw) as TeamChatStore
    if (!parsed || typeof parsed !== 'object' || !parsed.teams || typeof parsed.teams !== 'object') {
      return EMPTY_STORE
    }
    return parsed
  } catch {
    return EMPTY_STORE
  }
}

async function writeStore(store: TeamChatStore) {
  await ensureStoreFile()
  await writeFile(CHAT_FILE, JSON.stringify(store, null, 2), 'utf8')
}

export async function listTeamMessages(teamId: string, limit = 80): Promise<TeamChatSnapshot> {
  const normalizedTeamId = normalizeTeamId(teamId) || 'co2-router-ops'
  const store = await readStore()
  const messages = (store.teams[normalizedTeamId] ?? []).slice(-Math.max(1, Math.min(limit, MAX_MESSAGES_PER_TEAM)))
  return {
    teamId: normalizedTeamId,
    messages,
    generatedAt: new Date().toISOString(),
  }
}

export async function appendTeamMessage(input: {
  teamId: string
  operatorId: string
  operatorName: string
  body: string
}): Promise<TeamChatMessage> {
  const teamId = normalizeTeamId(input.teamId) || 'co2-router-ops'
  const operatorId = input.operatorId.trim().slice(0, 48)
  const operatorName = input.operatorName.trim().slice(0, 48)
  const body = input.body.trim().replace(/\s+/g, ' ').slice(0, 600)

  const message: TeamChatMessage = {
    id: crypto.randomUUID(),
    teamId,
    operatorId,
    operatorName,
    body,
    createdAt: new Date().toISOString(),
  }

  await (writeChain = writeChain.then(async () => {
    const store = await readStore()
    const existingTeams = Object.keys(store.teams)
    if (!store.teams[teamId] && existingTeams.length >= MAX_TEAMS) {
      const oldestTeam = existingTeams
        .map((key) => ({
          key,
          createdAt: store.teams[key]?.[0]?.createdAt ?? '',
        }))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0]?.key

      if (oldestTeam) {
        delete store.teams[oldestTeam]
      }
    }

    const teamMessages = store.teams[teamId] ?? []
    teamMessages.push(message)
    store.teams[teamId] = teamMessages.slice(-MAX_MESSAGES_PER_TEAM)
    await writeStore(store)
  }))

  return message
}

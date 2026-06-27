// pi-mom-agent — a warm, mom-friendly web chat built on Mario Zechner's Pi.
// Pi has no web mode, so this wraps @earendil-works/pi-ai in a tiny HTTP server.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createModels } from '@earendil-works/pi-ai'
import { anthropicProvider } from '@earendil-works/pi-ai/providers/anthropic'
import { openaiProvider } from '@earendil-works/pi-ai/providers/openai'
import { fauxProvider } from '@earendil-works/pi-ai'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT || 8080)
const ASSISTANT_NAME = process.env.ASSISTANT_NAME || 'Pi'

const SYSTEM_PROMPT =
  process.env.MARITIME_INSTRUCTIONS ||
  `You are ${ASSISTANT_NAME}, a warm, patient, caring personal assistant. The person ` +
  `you're talking with is not technical — be friendly and encouraging, never ` +
  `condescending. Explain things simply and in plain language, in short, easy-to-read ` +
  `messages. Be genuinely kind and a little delightful. Help with everyday things: ` +
  `writing messages and emails, recipes and cooking, how to do things on a phone or ` +
  `computer, planning, ideas, and just chatting. If something is unclear, ask one gentle ` +
  `question. Keep replies short. For medical, legal, or financial topics, share general ` +
  `info but kindly suggest checking with a professional.`

// ── Pick an LLM provider from whatever key is present (faux = demo mode) ──────
const models = createModels()
let provider, modelId, mode
if (process.env.ANTHROPIC_API_KEY) {
  models.setProvider(anthropicProvider())
  provider = 'anthropic'
  modelId = process.env.PI_MODEL || 'claude-3-7-sonnet-20250219'
  mode = 'live'
} else if (process.env.OPENAI_API_KEY) {
  const prov = openaiProvider()
  // Agent containers can't reach api.openai.com directly — route through an
  // OpenAI-compatible proxy (e.g. Maritime's LLM proxy) when OPENAI_BASE_URL set.
  if (process.env.OPENAI_BASE_URL) prov.baseUrl = process.env.OPENAI_BASE_URL
  models.setProvider(prov)
  provider = 'openai'
  modelId = process.env.PI_MODEL || 'gpt-4.1'
  mode = 'live'
} else {
  // No key yet — boot in demo mode so the web link works; add a key for real answers.
  models.setProvider(fauxProvider())
  provider = 'faux'
  mode = 'demo'
}
const model =
  models.getModel(provider, modelId) || (models.getModels(provider) || [])[0]
if (!model) {
  console.error(`[pi] No usable model for provider "${provider}" (id "${modelId}").`)
  process.exit(1)
}
console.log(`[pi] ${ASSISTANT_NAME} ready — provider=${provider} model=${model.id} mode=${mode}`)

// ── In-memory conversations, keyed by a client-supplied session id ───────────
const sessions = new Map() // id -> [{role, content, timestamp}]
const MAX_TURNS = 24

function historyFor(id) {
  let h = sessions.get(id)
  if (!h) {
    h = [{ role: 'system', content: SYSTEM_PROMPT, timestamp: Date.now() }]
    sessions.set(id, h)
  }
  return h
}

// Pull assistant text out of a pi-ai response, tolerant of shape changes
// across versions (content blocks, message.content, plain string).
function extractText(res) {
  if (!res) return ''
  if (typeof res === 'string') return res.trim()
  const blocks = Array.isArray(res.content)
    ? res.content
    : Array.isArray(res.message?.content)
      ? res.message.content
      : null
  if (blocks) {
    return blocks
      .map((b) => (typeof b === 'string' ? b : b?.text || ''))
      .join('')
      .trim()
  }
  if (typeof res.content === 'string') return res.content.trim()
  if (typeof res.text === 'string') return res.text.trim()
  if (typeof res.message?.content === 'string') return res.message.content.trim()
  return ''
}

async function respond(id, userText) {
  if (mode === 'demo') {
    return `Hi! I'm ${ASSISTANT_NAME}. I'm set up and my chat works 💛 — I just need an ` +
      `API key wired in to start thinking for real. (You said: "${userText}")`
  }
  const history = historyFor(id)
  history.push({ role: 'user', content: userText, timestamp: Date.now() })
  const res = await models.complete(model, { messages: history })
  const text = extractText(res)
  history.push({ role: 'assistant', content: text, timestamp: Date.now() })
  // Trim old turns but always keep the system message.
  if (history.length > MAX_TURNS * 2 + 1) {
    sessions.set(id, [history[0], ...history.slice(-(MAX_TURNS * 2))])
  }
  return text
}

// ── Tiny HTTP server ─────────────────────────────────────────────────────────
function send(res, status, body, type = 'application/json') {
  res.writeHead(status, { 'content-type': type })
  res.end(body)
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
      const html = await readFile(join(__dirname, 'public', 'index.html'), 'utf-8')
      return send(res, 200, html.replaceAll('{{ASSISTANT_NAME}}', ASSISTANT_NAME), 'text/html; charset=utf-8')
    }
    if (req.method === 'GET' && req.url === '/health') {
      return send(res, 200, JSON.stringify({ ok: true, mode, provider, model: model.id }))
    }
    if (req.method === 'GET' && req.url === '/diag') {
      const out = { provider, model: model.id, mode }
      try {
        const r = await fetch('https://api.openai.com/v1/models', {
          headers: { authorization: 'Bearer ' + (process.env.OPENAI_API_KEY || '') },
        })
        out.openaiDirect = r.status
      } catch (e) {
        out.openaiDirect = 'ERR ' + String(e && e.message)
      }
      try {
        const r = await models.complete(model, {
          messages: [{ role: 'user', content: 'say hi', timestamp: Date.now() }],
        })
        out.completeKeys = Object.keys(r)
        out.stopReason = r.stopReason
        out.contentShape = JSON.stringify(r.content)?.slice(0, 300)
        out.extracted = extractText(r)
      } catch (e) {
        out.completeError = String(e && e.message)
      }
      return send(res, 200, JSON.stringify(out))
    }
    if (req.method === 'POST' && req.url === '/api/chat') {
      let raw = ''
      req.on('data', (c) => (raw += c))
      req.on('end', async () => {
        try {
          const { message, sessionId } = JSON.parse(raw || '{}')
          if (!message || !String(message).trim()) {
            return send(res, 400, JSON.stringify({ error: 'empty message' }))
          }
          const id = String(sessionId || 'default')
          const reply = await respond(id, String(message).slice(0, 4000))
          send(res, 200, JSON.stringify({ reply }))
        } catch (err) {
          console.error('[pi] chat error:', err)
          send(res, 500, JSON.stringify({ error: 'Sorry, something went wrong. Please try again.' }))
        }
      })
      return
    }
    send(res, 404, JSON.stringify({ error: 'not found' }))
  } catch (err) {
    console.error('[pi] server error:', err)
    send(res, 500, JSON.stringify({ error: 'server error' }))
  }
})

server.listen(PORT, '0.0.0.0', () => console.log(`[pi] listening on :${PORT}`))

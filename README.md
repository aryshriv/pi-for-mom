# pi-for-mom

A warm, mom-friendly web chat agent built on **[Pi](https://github.com/badlogic/pi-mono)**
(Mario Zechner's open-source agent toolkit), hosted on **Maritime**.

Pi is terminal-first, so this wraps `@earendil-works/pi-ai` in a tiny web server
with a big-text, voice-capable chat UI anyone can use — no app, no login.

## How it works

- `server.mjs` — Node HTTP server. Drives Pi's unified LLM API (`createModels` →
  `complete`) with a kind, plain-language persona. One conversation per browser.
- `public/index.html` — friendly mobile-first chat (big fonts, 🎤 voice input).
- `Dockerfile` — just runs the server on port 8080. Maritime exposes it publicly
  at `https://api.maritime.sh/a/<agent-id>` when the agent is created with
  `public_web=true` + `exposed_port=8080` (no tunnel needed).

## Configure (env vars)

| Var | Purpose |
|---|---|
| `OPENAI_API_KEY` *or* `ANTHROPIC_API_KEY` | The LLM key Pi uses (required for real answers; without one it boots in demo mode). |
| `PI_MODEL` | Override the model (default `gpt-4.1` / `claude-3-7-sonnet-20250219`). |
| `ASSISTANT_NAME` | The assistant's name (default `Pi`). |

## Run locally

```bash
npm install
OPENAI_API_KEY=sk-… node server.mjs   # http://localhost:8080
```

## Host on Maritime

Create the agent with `framework=custom`, `exposed_port=8080`, `public_web=true`,
a GitHub source, and your `OPENAI_API_KEY`. Maritime builds the Dockerfile, runs
it, and serves it at:

```
https://api.maritime.sh/a/<agent-id>
```

That's the link you give your mom — no login, no app.

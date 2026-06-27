# pi-for-mom

A warm, mom-friendly web chat agent built on **[Pi](https://github.com/badlogic/pi-mono)**
(Mario Zechner's open-source agent toolkit), hosted on **Maritime**.

Pi is terminal-first, so this wraps `@earendil-works/pi-ai` in a tiny web server
with a big-text, voice-capable chat UI anyone can use — no app, no login.

## How it works

- `server.mjs` — Node HTTP server. Drives Pi's unified LLM API (`createModels` →
  `complete`) with a kind, plain-language persona. One conversation per browser.
- `public/index.html` — friendly mobile-first chat (big fonts, 🎤 voice input).
- `Dockerfile` + `start.sh` — runs the server **and a Cloudflare tunnel**, so the
  agent gets its own public `https://…` link (Maritime's own proxy needs a login).

## Configure (env vars)

| Var | Purpose |
|---|---|
| `OPENAI_API_KEY` *or* `ANTHROPIC_API_KEY` | The LLM key Pi uses (required for real answers; without one it boots in demo mode). |
| `PI_MODEL` | Override the model (default `gpt-4.1` / `claude-3-7-sonnet-20250219`). |
| `ASSISTANT_NAME` | The assistant's name (default `Pi`). |
| `CLOUDFLARE_TUNNEL_TOKEN` | Optional — a named tunnel token for a **stable** public URL (otherwise a free ephemeral `trycloudflare.com` link). |

## Run locally

```bash
npm install
OPENAI_API_KEY=sk-… node server.mjs   # http://localhost:8080
```

## Host on Maritime

```bash
maritime create pi-for-mom --framework custom
maritime env set pi-for-mom OPENAI_API_KEY=sk-… ASSISTANT_NAME=Pi
maritime deploy pi-for-mom --source github --repo <this-repo-url> --wait
maritime logs pi-for-mom        # grab the printed https://…trycloudflare.com link → give it to mom
```

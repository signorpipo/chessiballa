# Chessiballa?

One button, one question: _where can we go dancing, gay Milan, from now until Sunday?_
("Chessiballa?" is Italian chat-speak for "what are we dancing to?")

Clicking the button runs a small pipeline of Claude agents (researcher → reviewer →
formatter). They search the web for gay dance nights in Milan and its hinterland, keep only
the ones between now and Sunday, and show them as cards. You watch the agents work live:
every search, every page read, every event discarded. The UI is in Italian and built for
phones first.

It is a toy and a learning playground for Claude Code, the Claude Agent SDK, GitHub and
Linear.

## How it works

- **Live progress:** the page streams what the agents are really doing.
- **Certainty labels:** each event is marked _confirmed_, _recurring_ or _unverified_.
- **Replay cache:** your first click runs the real search; clicking again within 12 hours
  replays it from your browser at no cost. Add `?debug=1` to the URL to force a real run.
- **Demo mode:** when the API credit runs out, the page plays a demo with invented example
  events.
- **Cost guards:** a total budget cap, a per-run token cap and an expiry date.

> Work in progress. See [CLAUDE.md](CLAUDE.md) for the full spec, conventions and roadmap.

## Getting started

Requires Node.js 22+.

```sh
npm install
cp .env.example .env   # then add your Anthropic API key
```

## Scripts

| Command                | What it does                    |
| ---------------------- | ------------------------------- |
| `npm run typecheck`    | Type-check with TypeScript      |
| `npm run lint`         | Lint with ESLint                |
| `npm run format`       | Format everything with Prettier |
| `npm run format:check` | Check formatting                |

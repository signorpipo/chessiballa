# Chessiballa?

A web page with one button that finds gay dance nights in Milan and the surrounding area,
from today until Sunday. ("Chessiballa?" is Italian chat-speak for "what are we dancing
to?")

The button starts three Claude agents. A researcher searches the web, a reviewer drops
anything off-topic or outside the dates, and a formatter turns what is left into event
cards. While they work, the page shows what they are doing. The UI is in Italian and
designed for phones.

The project is a toy, and also a way to learn Claude Code, the Claude Agent SDK, GitHub and
Linear.

## How it works

- Each event is labelled _confirmed_, _recurring_ or _unverified_.
- Your first click runs a real search. Clicking again within 12 hours replays that search
  from your browser without calling the API.
- When the API credit runs out, the page plays a demo with made-up events.
- Spending is capped by a total budget, a per-run token limit and an expiry date.

> Work in progress. [CLAUDE.md](CLAUDE.md) has the full spec, conventions and roadmap.

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

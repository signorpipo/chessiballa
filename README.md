# MilanoClub

One button, one question: _what gay parties are on in Milan this weekend?_

Clicking the button runs a small pipeline of Claude agents (researcher → reviewer →
formatter) that searches club sites and event portals, keeps only this weekend's events,
and shows them as cards. The UI is in Italian.

> Work in progress. See [CLAUDE.md](CLAUDE.md) for goals, conventions and roadmap.

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

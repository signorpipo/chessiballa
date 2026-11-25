# Chessiballa?

A small local web app with one button: "show me this weekend's gay events in Milan".
Clicking it runs a multi-agent pipeline that searches the web, reviews the findings and
returns event cards for the page to display.

The project is also a learning playground for Claude Code: agents (Claude Agent SDK),
GitHub and Linear integration, and a full vibe-coding workflow. The owner is learning, so
favour standard, widely used conventions over clever or custom ones, and explain choices
briefly when they are not obvious.

## Language rules

- **Chat with the user:** Italian.
- **Website UI text:** Italian.
- **Everything else is English:** code, identifiers, comments, file and folder names,
  commit messages, branch names, PR descriptions, Linear issues, docs (including this file).

## Name and brand

- **Brand name:** "Chessiballa?" — Italian chat-speak for "what's on for dancing?". The
  question mark is part of the brand: use it in the UI, page title, logo, images and README
  title.
- **Logo/wordmark:** one word, lowercase "b", with "chessi" and "balla" set in two different
  fonts or weights to make it pop and show where "balla" starts.
- **Tagline (UI):** "le serate queer di Milano, questo weekend".
- **Technical identifiers have no question mark and are lowercase:** repo, folder, package
  name, branches, env vars → `chessiballa`. In prose (docs, issues) write "Chessiballa".

## Architecture (planned)

```
[Web page] --click--> [local server] --> agent pipeline (Claude Agent SDK)
                                          1. Researcher: web search on club sites and event portals
                                          2. Reviewer: keep only this weekend, dedupe, check sources
                                          3. Formatter: structured JSON (no HTML)
                     <-- events JSON ----
[Page renders cards from a fixed template]
```

- The API key lives only on the server, never in the browser.
- Agents output **JSON, not HTML**. The frontend renders it with a fixed template and
  inserts values with `textContent` (no `innerHTML` with model output). Links must start
  with `https://`.
- Stream progress to the page ("searching…", "reviewing…") so the user sees the agents work.

## Stack and conventions

- TypeScript in `strict` mode, ES modules, Node.js 22+.
- ESLint (`typescript-eslint`) for linting, Prettier for formatting. Run both before committing.
- Naming: `camelCase` for variables and functions, `PascalCase` for types, classes and
  components, `UPPER_SNAKE_CASE` for constants and env vars, `kebab-case` for file names.
- Keep it small: no extra dependencies, abstractions or config without a concrete need.
- Server framework, frontend tooling and final folder layout are decided after the research
  phase; update this file when they are.

## Folder layout (provisional)

```
src/
  agents/   agent definitions and the pipeline
  server/   HTTP server, cost guards, cache
  shared/   types shared by server and web (e.g. the Event shape)
public/     static web page (Italian UI)
```

## Commands

- `npm run typecheck` – TypeScript check
- `npm run lint` – ESLint
- `npm run format` / `npm run format:check` – Prettier

## Secrets and cost safety

- The Anthropic API key goes only in `.env` (git-ignored). `.env.example` lists the variables
  with no values. Never ask the user to paste the key in chat; they paste it into `.env`.
- The key belongs to a dedicated Anthropic Console workspace with a spend limit
  and prepaid credit with auto-reload off.
- The server enforces cost guards, all configurable via env: access code, daily request cap,
  total budget cap (computed from token usage in API responses), expiry date, and a
  per-weekend cache so repeated clicks do not re-run the pipeline.
- The repo is public: never commit keys, tokens, `.env`, or personal data.

## Workflow

- Linear: workspace "Elia", team `ELI`, project **Chessiballa**. Track work as issues there.
- Git: one branch per Linear issue (e.g. `eli-12-agent-pipeline`), Conventional Commits
  (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`), small focused commits, merge via PR.
- Do not push, create the GitHub repo, or open PRs unless the user asks. The GitHub repo
  will be public under the `signorpipo` account.
- Before merging: run typecheck, lint and format check; use the `code-review` skill, and
  `security-review` for anything touching the server, secrets or user input.

## Tools available to Claude

- **Skills:** `claude-api` (read before writing any Agent SDK / API code; do not rely on
  memory), `ponytail` (keep changes minimal), `impeccable` (the single design skill for the
  UI), `code-review`, `security-review`, `run`.
- **MCP / CLI:** GitHub connector and `gh` CLI (logged in as `signorpipo`), Linear connector,
  Playwright and the built-in browser for checking the UI.

## Roadmap

1. Research: Claude Agent SDK, which event sources are readable
2. Setup: repo, tooling, this file
3. Agent pipeline runnable from the CLI
4. Server + web UI
5. Polish: cache, cost guards, design, optional deploy

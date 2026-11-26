# Chessiballa?

A small web app with one button: "show me the gay dance nights in Milan from now until
Sunday". Clicking it runs a multi-agent pipeline that searches the web, reviews the findings
and returns event cards for the page to display. It is a toy meant to show agents at work.

The project is also a learning playground for Claude Code: agents (Claude API with tools),
GitHub and Linear integration, and a full vibe-coding workflow. The owner is learning, so
favour standard, widely used conventions over clever or custom ones, and explain choices
briefly when they are not obvious.

## Language rules

- **Chat with the user:** Italian.
- **Website UI text:** Italian.
- **Everything else is English:** code, identifiers, comments, file and folder names,
  commit messages, branch names, PR descriptions, Linear issues, docs (including this file).
- **Human-facing prose should not read as AI-written.** For text people read (README and
  other public docs, website UI copy, PR descriptions, Linear issues, release notes), run
  the `avoid-ai-writing` or `humanizer` skill before finishing, unless the text is a line or
  two. Not needed for this file, code comments or commit messages.

## Name and brand

- **Brand name:** "Chessiballa?" — Italian chat-speak for "what's on for dancing?". The
  question mark is part of the brand: use it in the UI, page title, logo, images and README
  title.
- **Logo/wordmark:** one word, lowercase "b", with "chessi" and "balla" set in two different
  fonts or weights to make it pop and show where "balla" starts.
- **Tagline (UI):** to be decided (the old "le serate queer di Milano, questo weekend" no
  longer fits: the scope is gay male nights, not only the weekend).
- **Technical identifiers have no question mark and are lowercase:** repo, folder, package
  name, branches, env vars → `chessiballa`. In prose (docs, issues) write "Chessiballa".

## Product behaviour (agreed 2026-11-25)

- **Audience:** the owner and friends, on a real public deploy. No access code.
- **What counts as an event:** nights where people dance, gay male or strongly gay-friendly.
  Aperitivo + dancing and daytime parties count; drag shows without dancing do not.
  Weeknights count too.
- **Area:** Milan and its hinterland; each event shows its town.
- **Time window:** from the click until the end of Sunday of the current week. On Saturday
  or Sunday it also covers the following week, shown as two sections ("this weekend is
  almost over" / "next week").
- **Sources:** free web search only; agents must find recurring nights on their own.
- **Event data:** name, venue, town, day and start time, price, one image if found, short
  Italian description, source link. Expanded view: more images, DJs, vibe tags (crowd,
  music, dress code) and other details. Everything is collected in the same run.
- **Certainty label:** `confirmed` (announced for that date), `recurring` (usually on that
  day), `unverified` (weak evidence). Uncertain events are shown, never hidden.
- **Sorting:** selectable; default by day, then start time. More sorts (recommended, most
  followed) to be explored later. No filters in v1.
- **Live progress:** stream the agents' real actions ("searching 'X'", "reading site Y",
  "discarding Z: drag show only").
- **Per-browser replay cache:** each user's first click runs the real pipeline. Within 12
  hours, further clicks replay the recorded progress and results with the same timing, in
  the user's browser, without new API calls and with no visible difference. A hidden
  debug switch forces a real run; its details live in `CLAUDE.local.md` (git-ignored) and
  must never appear in public docs.
- **Demo mode:** when the key is expired or the budget is spent, show a message, fake
  progress and invented but plausible events (generated from a saved real run), clearly
  labelled as examples.
- **No results:** a playful Italian message (e.g. "mi sa che stasera resti a casa").
- **Run limits:** keep runs short; a per-run token cap is tuned by testing.

## UI direction

- Mobile first (the link is shared on WhatsApp), then desktop.
- Starting mood: club flyer (dark, big bold type, one bright accent, never violet).
  Alternatives will be compared before choosing.
- Highly animated, since there is only one screen: the button expands into the live log,
  then breaks apart into the event cards; cards are born from a particle effect and expand
  in place with the same effect. Respect `prefers-reduced-motion`.
- Musical touches: visual (equalizer, BPM pulse); optional sound, off by default.

## Architecture (planned)

```
[Web page] --click--> [server] --> agent pipeline (Claude API, server-side tools)
                                     1. Researcher: web_search + web_fetch on club sites and portals
                                     2. Reviewer: time window, dedupe, check sources; may ask for
                                        another targeted search (back to 1, max N rounds)
                                     3. Formatter: structured outputs (JSON schema, no HTML)
                     <-- progress stream + events JSON ----
[Page renders cards from a fixed template]
```

- **Agent approach (decided 2026-11-25):** plain Claude API (`@anthropic-ai/sdk`) with the
  server-side `web_search` and `web_fetch` tools, not the Claude Agent SDK. Each role is
  one call with its own system prompt; inside a call Claude decides which searches to run
  and pages to read (agentic), while our code orchestrates the outer loop (workflow):
  order of roles, max review rounds, `max_uses` per tool. Why: the Agent SDK runs a Claude
  Code subprocess (~1 GiB RAM, 1 CPU per run) and brings file and shell tools we do not
  need; server-side tools keep our server light and cheap to host.
- Handle `pause_turn` (resend to continue) and stream events so searches and fetched
  pages can be shown in the live log.
- The API key lives only on the server, never in the browser.
- Agents output **JSON, not HTML**. The frontend renders it with a fixed template and
  inserts values with `textContent` (no `innerHTML` with model output). Links must start
  with `https://`.
- Stream progress to the page so the user sees the agents work; record it so the browser
  can replay it.

## Stack and conventions

- TypeScript in `strict` mode, ES modules, Node.js 22+.
- ESLint (`typescript-eslint`) for linting, Prettier for formatting. Run both before committing.
- Naming: `camelCase` for variables and functions, `PascalCase` for types, classes and
  components, `UPPER_SNAKE_CASE` for constants and env vars, `kebab-case` for file names.
- Keep it small: no extra dependencies, abstractions or config without a concrete need.
- **Server (decided 2026-11-26):** Hono. Routes live under `/api`.
- **Frontend (decided 2026-11-26):** plain HTML, CSS and TypeScript, no UI framework, built
  with Vite. Animations use CSS, the Web Animations API and canvas. Fonts are self-hosted.
- **Hosting (decided 2026-11-26):** Vercel Hobby (free, no card), deployed from GitHub; every
  branch gets a preview URL. No Docker. Google Cloud Run was dropped (prepayment required,
  more setup). Vercel builds the Vite page as static files and runs the Hono app as one
  Vercel Function. Hobby functions stop after **300 s**, so a pipeline run must finish well
  before that (target 1-3 minutes).
- **Local dev:** `npm run dev` starts Vite, which also runs the Hono app in the same process
  (`@hono/vite-dev-server`), so page and API share one localhost URL.

## Folder layout

```
api/        Vercel Function entry; re-exports the Hono app
src/
  agents/   agent definitions and the pipeline
  server/   Hono app, cost guards
  shared/   types shared by server and web (e.g. the Event shape)
  web/      page scripts and styles (Italian UI)
index.html  page entry for Vite
public/     static files copied as-is (icons, fonts)
```

## Commands

- `npm run dev` – local dev server (page + API)
- `npm run build` – production build of the page (what Vercel runs)
- `npm run typecheck` – TypeScript check
- `npm run lint` – ESLint
- `npm run format` / `npm run format:check` – Prettier

## Secrets and cost safety

- The Anthropic API key goes only in `.env` (git-ignored). `.env.example` lists the variables
  with no values. Never ask the user to paste the key in chat; they paste it into `.env`.
- The key belongs to a dedicated Anthropic Console workspace with a spend limit
  and prepaid credit with auto-reload off.
- The server enforces cost guards, configurable via env: total budget cap (computed from
  token usage in API responses), expiry date and a per-run token cap. When a guard trips,
  the page switches to demo mode. Repeated clicks are absorbed by the per-browser replay
  cache (see Product behaviour); since anyone can bypass it, the budget cap is the real
  safety net.
- The repo is public: never commit keys, tokens, `.env`, or personal data.

## Workflow

- Linear: workspace "Elia", team `ELIA`, project **Chessiballa**. Track work as issues there.
- Git: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`), small
  focused commits.
  - Small, quick changes (docs, minor config or tooling tweaks): commit directly on `main`.
  - Features and larger changes: one branch per Linear issue (e.g. `elia-12-agent-pipeline`),
    merged via PR.
- Do not push, create the GitHub repo, or open PRs unless the user asks. The GitHub repo
  will be public under the `signorpipo` account.
- Before merging: run typecheck, lint and format check; use the `code-review` skill, and
  `security-review` for anything touching the server, secrets or user input. For UI changes
  also run `accessibility-engineering` (WCAG 2.2 AA). If a change adds cookies, storage,
  logging, analytics or any third-party resource (fonts, CDNs, embeds), update the privacy
  notice with `privacy-policy`.

## Tools available to Claude

- **Skills:** `claude-api` (read before writing any Claude API code; do not rely on
  memory), `ponytail` (keep changes minimal), `impeccable` (builds and polishes the
  UI) plus the anti-slop principles of `design-taste-frontend` (not its company-site gate), `code-review`, `security-review`, `run`.
  Compliance and discoverability: `accessibility-engineering` (WCAG 2.2 AA audit and fixes),
  `privacy-policy` (drafts the privacy notice; flags clauses that need legal review),
  `seo-geo` (search and AI-answer visibility; mainly before the public deploy, since the
  link spreads on WhatsApp and Open Graph tags matter more than ranking).
- **Compliance basics:** the site is about gay nights, so a visitor's data can reveal sexual
  orientation (a GDPR special category). No third-party trackers or analytics, self-host
  fonts and scripts instead of loading them from Google or CDNs, and link event images from
  their source instead of re-hosting them.
- **MCP / CLI:** GitHub connector and `gh` CLI (logged in as `signorpipo`), Linear connector,
  Playwright and the built-in browser for checking the UI, Mobbin and Figma for references.

## Roadmap

1. Research: agent approach (done: Claude API + server-side tools), which event sources are readable
2. Setup: repo, tooling, this file
3. Agent pipeline runnable from the CLI
4. Server + web UI
5. Polish: replay cache, cost guards, demo mode, design, deploy

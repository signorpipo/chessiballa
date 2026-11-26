// Runs the pipeline from the terminal: `npm run pipeline`.
// Progress goes to stderr, the final events JSON to stdout, and the whole run
// (progress, raw agent output, events, usage) is saved under runs/ (git-ignored).

import Anthropic from "@anthropic-ai/sdk";
import { mkdirSync, writeFileSync } from "node:fs";
import type { ProgressEvent } from "./progress.js";
import { PipelineError, runPipeline, totalTokens } from "./pipeline.js";
import type { Usage } from "./run-agent.js";

// Claude Opus 5.5 list prices in USD (per million tokens), and web search per search.
const PRICE_INPUT = 4;
const PRICE_OUTPUT = 20;
const PRICE_CACHE_WRITE = 5;
const PRICE_CACHE_READ = 0.2;
const PRICE_PER_SEARCH = 0.01;

const startedAt = Date.now();
const log: (ProgressEvent & { ms: number })[] = [];

function describe(event: ProgressEvent): string {
  switch (event.type) {
    case "stage":
      return `\n== ${event.role}${event.round > 1 ? ` (round ${event.round})` : ""}`;
    case "search":
      return `  search  "${event.query}"`;
    case "search_done":
      return `          ${event.results} results`;
    case "fetch":
      return `  read    ${event.url}`;
    case "fetch_done":
      return `          ok${event.title ? `: ${event.title}` : ""}`;
    case "tool_error":
      return `  ERROR   ${event.tool} ${event.target}: ${event.errorCode}`;
    case "other_tool":
      return `  tool    ${event.name}`;
    case "discard":
      return `  skip    ${event.text}`;
    case "follow_up":
      return `\n-- reviewer asks for another round:\n${event.tasks}`;
    case "done":
      return `\n== done: ${event.events} events`;
  }
}

function onProgress(event: ProgressEvent): void {
  const ms = Date.now() - startedAt;
  log.push({ ...event, ms });
  console.error(`[${(ms / 1000).toFixed(0).padStart(3)}s] ${describe(event)}`);
}

function costUsd(usage: Usage): number {
  return (
    (usage.inputTokens * PRICE_INPUT +
      usage.outputTokens * PRICE_OUTPUT +
      usage.cacheWriteTokens * PRICE_CACHE_WRITE +
      usage.cacheReadTokens * PRICE_CACHE_READ) /
      1_000_000 +
    usage.webSearches * PRICE_PER_SEARCH
  );
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error(
    "ANTHROPIC_API_KEY is not set: add it to .env (see .env.example).",
  );
  process.exit(1);
}

/** Prints time, tokens and cost, and saves the run (also a failed one) under runs/. */
function finish(usage: Usage, details: Record<string, unknown>): void {
  const seconds = (Date.now() - startedAt) / 1000;
  console.error(
    `\nTime ${seconds.toFixed(0)} s | tokens ${totalTokens(usage)} ` +
      `(in ${usage.inputTokens}, cache write ${usage.cacheWriteTokens}, ` +
      `cache read ${usage.cacheReadTokens}, out ${usage.outputTokens}) | ` +
      `${usage.webSearches} searches, ${usage.webFetches} fetches | ~$${costUsd(usage).toFixed(2)}`,
  );
  mkdirSync("runs", { recursive: true });
  const file = `runs/${new Date(startedAt).toISOString().replace(/[:.]/g, "-")}.json`;
  const run = { ...details, usage, seconds, costUsd: costUsd(usage), log };
  writeFileSync(file, JSON.stringify(run, null, 2));
  console.error(`Saved ${file}\n`);
}

const tokenCap = Number(process.env.RUN_TOKEN_CAP) || undefined;
try {
  const result = await runPipeline(new Anthropic(), { onProgress, tokenCap });
  finish(result.usage, result);
  console.log(JSON.stringify({ events: result.events }, null, 2));
} catch (error) {
  console.error("\nRun failed:", error);
  if (error instanceof PipelineError) {
    finish(error.usage, { error: error.message, transcript: error.transcript });
  }
  process.exitCode = 1;
}

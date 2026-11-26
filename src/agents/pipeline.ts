// The agent pipeline: Researcher -> Reviewer (which may send the Researcher back for a
// short follow-up round) -> Formatter. Our code fixes the order and the limits; inside
// each call Claude decides what to search and read.

import Anthropic from "@anthropic-ai/sdk";
import type { DanceEvent, EventsResponse } from "../shared/event.js";
import type { ProgressListener } from "./progress.js";
import {
  eventSchema,
  fillTemplate,
  formatterPrompt,
  knownSources,
  researcherPrompt,
  reviewerPrompt,
} from "./prompts.js";
import {
  AgentError,
  addUsage,
  emptyUsage,
  runAgent,
  type Usage,
} from "./run-agent.js";
import { getTimeWindow, type TimeWindow } from "./time-window.js";

/** Review rounds in total; every round after the first is a follow-up research round. */
const MAX_REVIEW_ROUNDS = 2;

// Tool budgets per call (`max_uses`). The first research round gets the most.
const FIRST_ROUND_SEARCHES = 10;
const FIRST_ROUND_FETCHES = 15;
const FOLLOW_UP_SEARCHES = 4;
const FOLLOW_UP_FETCHES = 5;
const REVIEWER_FETCHES = 3;
// Long pages are cut to this many tokens, which keeps the run cheap.
const MAX_PAGE_TOKENS = 10_000;

export type PipelineResult = {
  window: TimeWindow;
  events: DanceEvent[];
  /** Raw text of each step, kept for debugging and for demo mode later. */
  transcript: { step: string; text: string }[];
  usage: Usage;
};

/** A failed run, with what it had done and spent until then. */
export class PipelineError extends Error {
  readonly usage: Usage;
  readonly transcript: PipelineResult["transcript"];
  constructor(
    message: string,
    usage: Usage,
    transcript: PipelineResult["transcript"],
    cause: unknown,
  ) {
    super(message, { cause });
    this.name = "PipelineError";
    this.usage = usage;
    this.transcript = transcript;
  }
}

export type PipelineOptions = {
  onProgress: ProgressListener;
  /**
   * Soft cap: once the run has used this many tokens (input + output), no follow-up
   * round starts. It does not stop a call that is already running, and the Formatter
   * always runs. The hard budget guard comes with the server (cost guards).
   */
  tokenCap?: number;
  now?: Date;
};

export async function runPipeline(
  client: Anthropic,
  options: PipelineOptions,
): Promise<PipelineResult> {
  const usage = emptyUsage();
  const transcript: PipelineResult["transcript"] = [];
  try {
    return await runSteps(client, options, usage, transcript);
  } catch (error) {
    // The failed call's own tokens are on the AgentError; earlier calls are in usage.
    if (error instanceof AgentError) addUsage(usage, error.usage);
    const message = error instanceof Error ? error.message : String(error);
    throw new PipelineError(message, usage, transcript, error);
  }
}

async function runSteps(
  client: Anthropic,
  { onProgress, tokenCap, now }: PipelineOptions,
  usage: Usage,
  transcript: PipelineResult["transcript"],
): Promise<PipelineResult> {
  const window = getTimeWindow(now);
  const timeValues = {
    now: window.now,
    windowStart: window.start,
    windowEnd: window.end,
    twoSections: window.twoSections,
  };

  let followUp = "";
  let kept = "";

  for (let round = 1; round <= MAX_REVIEW_ROUNDS; round++) {
    // 1. Researcher
    onProgress({ type: "stage", role: "researcher", round });
    const research = await runAgent(
      client,
      {
        role: "researcher",
        system: `${researcherPrompt.system}\n\n${knownSources}`,
        user: fillTemplate(researcherPrompt.userTemplate, {
          ...timeValues,
          followUp,
        }),
        tools: [
          {
            type: "web_search_20260209",
            name: "web_search",
            max_uses: round === 1 ? FIRST_ROUND_SEARCHES : FOLLOW_UP_SEARCHES,
            user_location: {
              type: "approximate",
              city: "Milan",
              country: "IT",
            },
          },
          {
            type: "web_fetch_20260209",
            name: "web_fetch",
            max_uses: round === 1 ? FIRST_ROUND_FETCHES : FOLLOW_UP_FETCHES,
            max_content_tokens: MAX_PAGE_TOKENS,
          },
        ],
        effort: "medium",
        maxTokens: 32_000,
      },
      onProgress,
    );
    addUsage(usage, research.usage);
    transcript.push({ step: `researcher ${round}`, text: research.text });
    emitDiscards(research.text, "researcher", onProgress);

    // 2. Reviewer: sees what earlier rounds kept plus the new findings.
    onProgress({ type: "stage", role: "reviewer", round });
    const findings = kept
      ? `Events kept in the previous review round:\n${kept}\n\nNew findings from the follow-up round:\n${research.text}`
      : research.text;
    const review = await runAgent(
      client,
      {
        role: "reviewer",
        system: `${reviewerPrompt.system}\n\n${knownSources}`,
        user: fillTemplate(reviewerPrompt.userTemplate, {
          ...timeValues,
          round,
          maxRounds: MAX_REVIEW_ROUNDS,
          researcherOutput: findings,
        }),
        tools: [
          {
            type: "web_fetch_20260209",
            name: "web_fetch",
            max_uses: REVIEWER_FETCHES,
            max_content_tokens: MAX_PAGE_TOKENS,
          },
        ],
        effort: "medium",
        maxTokens: 32_000,
      },
      onProgress,
    );
    addUsage(usage, review.usage);
    transcript.push({ step: `reviewer ${round}`, text: review.text });

    const sections = splitReview(review.text);
    kept = sections.kept;
    for (const line of sections.discarded)
      onProgress({ type: "discard", role: "reviewer", text: line });

    const overCap = tokenCap !== undefined && totalTokens(usage) >= tokenCap;
    if (!sections.followUp || round === MAX_REVIEW_ROUNDS || overCap) break;
    followUp = sections.followUp;
    onProgress({ type: "follow_up", tasks: followUp });
  }

  // 3. Formatter: no tools, JSON that matches event-schema.json.
  onProgress({ type: "stage", role: "formatter", round: 1 });
  const formatted = await runAgent(
    client,
    {
      role: "formatter",
      system: formatterPrompt.system,
      user: fillTemplate(formatterPrompt.userTemplate, {
        now: window.now,
        reviewerKept: kept,
      }),
      tools: [],
      effort: "low",
      maxTokens: 32_000,
      jsonSchema: eventSchema,
    },
    onProgress,
  );
  addUsage(usage, formatted.usage);
  transcript.push({ step: "formatter", text: formatted.text });

  const events = (JSON.parse(formatted.text) as EventsResponse).events.map(
    keepSafeLinks,
  );
  onProgress({ type: "done", events: events.length });
  return { window, events, transcript, usage };
}

export function totalTokens(usage: Usage): number {
  return (
    usage.inputTokens +
    usage.cacheWriteTokens +
    usage.cacheReadTokens +
    usage.outputTokens
  );
}

// Reviewer and Researcher write plain text, but may add markdown (bold, headings,
// list markers). These helpers ignore it.
const NOTHING = /^(none|nessun[oa]?|-|—)\.?$/i;

function stripMarkdown(line: string): string {
  return line
    .replace(/^\s*(#+|[-*]|\d+[.)])\s+/, "")
    .replace(/[*_`]/g, "")
    .trim();
}

/** Splits the Reviewer's answer into its KEPT, DISCARDED and FOLLOW_UP sections. */
function splitReview(text: string): {
  kept: string;
  discarded: string[];
  followUp: string;
} {
  const names = ["KEPT", "DISCARDED", "FOLLOW_UP"] as const;
  const bodies: Record<string, string[]> = {};
  let current: string | null = null;
  for (const line of text.split("\n")) {
    // A heading line such as "KEPT", "**KEPT**", "## KEPT" or "FOLLOW_UP:".
    const heading = line
      .replace(/[#*`:]/g, "")
      .trim()
      .replace(/[ -]/g, "_")
      .toUpperCase();
    const name = names.find((candidate) => candidate === heading);
    if (name) {
      current = name;
      bodies[name] = [];
    } else if (current) {
      bodies[current]?.push(line);
    }
  }
  if (!bodies.KEPT) {
    throw new Error("reviewer: answer has no KEPT section");
  }
  const lines = (name: string) =>
    (bodies[name] ?? []).map(stripMarkdown).filter(Boolean);
  const followUp = (bodies.FOLLOW_UP ?? []).join("\n").trim();
  return {
    kept: bodies.KEPT.join("\n").trim(),
    discarded: lines("DISCARDED").filter((line) => !NOTHING.test(line)),
    followUp: lines("FOLLOW_UP").every((line) => NOTHING.test(line))
      ? ""
      : followUp,
  };
}

/** The Researcher lists what it set aside as Italian lines starting with "Scartat...". */
function emitDiscards(
  text: string,
  role: "researcher",
  onProgress: ProgressListener,
): void {
  for (const line of text.split("\n")) {
    const clean = stripMarkdown(line);
    if (/^Scartat[aoie]\b/.test(clean))
      onProgress({ type: "discard", role, text: clean });
  }
}

/** Links must start with https://; anything else is dropped (the page checks too). */
function keepSafeLinks(event: DanceEvent): DanceEvent {
  const safe = (url: string | null) =>
    url && url.startsWith("https://") ? url : null;
  return {
    ...event,
    imageUrl: safe(event.imageUrl),
    ticketUrl: safe(event.ticketUrl),
    sourceUrl: safe(event.sourceUrl) ?? "",
    details: {
      ...event.details,
      images: event.details.images.filter((url) => safe(url)),
    },
  };
}

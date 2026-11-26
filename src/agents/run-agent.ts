// One agent call: a streamed Claude request with server-side tools. Claude decides
// which searches to run and pages to read; we turn the stream into progress events and
// resend the turn when the server pauses it (`pause_turn`).

import Anthropic from "@anthropic-ai/sdk";
import type { AgentRole, ProgressListener } from "./progress.js";

export const MODEL = "claude-opus-5-5";

// A paused turn is resent at most this many times, so a run cannot loop forever.
const MAX_CONTINUATIONS = 5;

export type Usage = {
  inputTokens: number;
  outputTokens: number;
  cacheWriteTokens: number;
  cacheReadTokens: number;
  webSearches: number;
  webFetches: number;
};

export function emptyUsage(): Usage {
  return {
    inputTokens: 0,
    outputTokens: 0,
    cacheWriteTokens: 0,
    cacheReadTokens: 0,
    webSearches: 0,
    webFetches: 0,
  };
}

export function addUsage(total: Usage, part: Usage): void {
  for (const key of Object.keys(total) as (keyof Usage)[])
    total[key] += part[key];
}

export type AgentRequest = {
  role: AgentRole;
  system: string;
  user: string;
  tools: Anthropic.Beta.BetaToolUnion[];
  effort: "low" | "medium" | "high";
  maxTokens: number;
  /** Structured output schema (Formatter only). */
  jsonSchema?: Record<string, unknown>;
};

/** A failed call, with the tokens it had already used. */
export class AgentError extends Error {
  readonly usage: Usage;
  constructor(message: string, usage: Usage) {
    super(message);
    this.name = "AgentError";
    this.usage = usage;
  }
}

export type AgentResult = {
  /** All text blocks of the final answer, joined. */
  text: string;
  usage: Usage;
};

export async function runAgent(
  client: Anthropic,
  request: AgentRequest,
  onProgress: ProgressListener,
): Promise<AgentResult> {
  const { role } = request;
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    { role: "user", content: request.user },
  ];
  const usage = emptyUsage();
  const textParts: string[] = [];

  for (let attempt = 0; attempt <= MAX_CONTINUATIONS; attempt++) {
    const stream = client.beta.messages.stream({
      model: MODEL,
      max_tokens: request.maxTokens,
      // If the model declines for policy reasons, the API retries on its default
      // fallback model inside the same call.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      // Caches the stable prefix (system prompt + seed list), useful on resends.
      cache_control: { type: "ephemeral" },
      system: request.system,
      messages,
      tools: request.tools,
      output_config: {
        effort: request.effort,
        ...(request.jsonSchema && {
          format: { type: "json_schema", schema: request.jsonSchema },
        }),
      },
    });

    // Tool inputs arrive as JSON fragments; collect them per block index.
    const pendingInputs = new Map<
      number,
      { id: string; name: string; json: string }
    >();
    // Remember what each tool call was for, to label its result.
    const callTargets = new Map<string, string>();

    for await (const event of stream) {
      if (event.type === "content_block_start") {
        const block = event.content_block;
        if (block.type === "server_tool_use") {
          pendingInputs.set(event.index, {
            id: block.id,
            name: block.name,
            json: "",
          });
        } else if (block.type === "web_search_tool_result") {
          const query = callTargets.get(block.tool_use_id) ?? "";
          if (Array.isArray(block.content)) {
            onProgress({
              type: "search_done",
              role,
              query,
              results: block.content.length,
            });
          } else {
            onProgress({
              type: "tool_error",
              role,
              tool: "web_search",
              target: query,
              errorCode: block.content.error_code,
            });
          }
        } else if (block.type === "web_fetch_tool_result") {
          const url = callTargets.get(block.tool_use_id) ?? "";
          if (block.content.type === "web_fetch_result") {
            onProgress({
              type: "fetch_done",
              role,
              url: block.content.url,
              title: block.content.content.title ?? null,
            });
          } else {
            onProgress({
              type: "tool_error",
              role,
              tool: "web_fetch",
              target: url,
              errorCode: block.content.error_code,
            });
          }
        }
      } else if (
        event.type === "content_block_delta" &&
        event.delta.type === "input_json_delta"
      ) {
        const pending = pendingInputs.get(event.index);
        if (pending) pending.json += event.delta.partial_json;
      } else if (event.type === "content_block_stop") {
        const pending = pendingInputs.get(event.index);
        if (!pending) continue;
        pendingInputs.delete(event.index);
        const input = parseInput(pending.json);
        const { id } = pending;
        if (pending.name === "web_search") {
          const query = String(input.query ?? "");
          callTargets.set(id, query);
          onProgress({ type: "search", role, query });
        } else if (pending.name === "web_fetch") {
          const url = String(input.url ?? "");
          callTargets.set(id, url);
          onProgress({ type: "fetch", role, url });
        } else {
          // e.g. code run by dynamic filtering; logged so nothing is hidden.
          onProgress({ type: "other_tool", role, name: pending.name });
        }
      }
    }

    const message = await stream.finalMessage();
    addUsage(usage, readUsage(message.usage));

    // Citations split one paragraph into several text blocks, so text blocks in a row
    // are joined as they are; a tool call in between starts a new line.
    for (const block of message.content) {
      if (block.type === "text") {
        textParts.push(block.text);
      } else if (textParts.length > 0 && textParts.at(-1) !== "\n") {
        textParts.push("\n");
      }
    }

    if (message.stop_reason === "pause_turn") {
      // The server stopped its tool loop; send the turn back and it resumes.
      messages.push({ role: "assistant", content: message.content });
      continue;
    }
    if (message.stop_reason === "refusal") {
      throw new AgentError(`${role}: the model declined the request`, usage);
    }
    if (message.stop_reason === "max_tokens") {
      throw new AgentError(
        `${role}: answer cut off at max_tokens (${request.maxTokens})`,
        usage,
      );
    }
    return { text: textParts.join(""), usage };
  }
  throw new AgentError(
    `${role}: still paused after ${MAX_CONTINUATIONS} continuations`,
    usage,
  );
}

function parseInput(json: string): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(json || "{}");
    return typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function readUsage(usage: Anthropic.Beta.BetaUsage): Usage {
  return {
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
    cacheReadTokens: usage.cache_read_input_tokens ?? 0,
    webSearches: usage.server_tool_use?.web_search_requests ?? 0,
    webFetches: usage.server_tool_use?.web_fetch_requests ?? 0,
  };
}

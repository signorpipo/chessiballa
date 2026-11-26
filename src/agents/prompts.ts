// Loads the prompt drafts in ./prompts. Each role file has notes for humans, then the
// system prompt between two `---` lines, then a "User message template" code block.

import { readFileSync } from "node:fs";

const PROMPTS_DIR = new URL("./prompts/", import.meta.url);

function readPromptFile(name: string): string {
  return readFileSync(new URL(name, PROMPTS_DIR), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

export type RolePrompt = {
  system: string;
  userTemplate: string;
};

function loadRole(name: string): RolePrompt {
  const text = readPromptFile(name);
  const sections = text.split(/^---$/m);
  const system = sections[1]?.trim();
  const template = /## User message template\s*```\n([\s\S]*?)```/.exec(
    text,
  )?.[1];
  if (!system || template === undefined) {
    throw new Error(`Prompt file ${name} is not in the expected format`);
  }
  return { system, userTemplate: template.trim() };
}

export const researcherPrompt = loadRole("researcher.md");
export const reviewerPrompt = loadRole("reviewer.md");
export const formatterPrompt = loadRole("formatter.md");
export const knownSources = readPromptFile("known-sources.md").trim();
export const eventSchema = JSON.parse(
  readPromptFile("event-schema.json"),
) as Record<string, unknown>;

/**
 * Fills a template: `{{name}}` is replaced by the value, and `{{#if name}}...{{/if}}`
 * is kept only when the value is truthy.
 */
export function fillTemplate(
  template: string,
  values: Record<string, string | number | boolean | undefined>,
): string {
  return template
    .replace(
      /\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}\n?/g,
      (_match, key: string, body: string) => (values[key] ? body : ""),
    )
    .replace(/\{\{(\w+)\}\}/g, (_match, key: string) =>
      String(values[key] ?? ""),
    )
    .trim();
}

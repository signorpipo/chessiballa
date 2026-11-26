// Progress events the pipeline emits while it works. The CLI prints them; later the
// server streams them to the page for the live log (and records them for replay).

export type AgentRole = "researcher" | "reviewer" | "formatter";

export type ProgressEvent =
  | { type: "stage"; role: AgentRole; round: number }
  | { type: "search"; role: AgentRole; query: string }
  | { type: "search_done"; role: AgentRole; query: string; results: number }
  | { type: "fetch"; role: AgentRole; url: string }
  | { type: "fetch_done"; role: AgentRole; url: string; title: string | null }
  | {
      type: "tool_error";
      role: AgentRole;
      tool: string;
      target: string;
      errorCode: string;
    }
  /** A server tool other than web_search and web_fetch. */
  | { type: "other_tool"; role: AgentRole; name: string }
  /** Something set aside, in Italian, e.g. "Scartata La Boum: chiusa". */
  | { type: "discard"; role: AgentRole; text: string }
  | { type: "follow_up"; tasks: string }
  | { type: "done"; events: number };

export type ProgressListener = (event: ProgressEvent) => void;

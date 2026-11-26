// Shape of one event card, shared by the server (which produces it) and the page (which
// renders it). The Formatter agent returns JSON in this shape; its JSON Schema lives in
// src/agents/prompts/event-schema.json and must stay in sync with these types (ELIA-7).

/** How sure we are that the event happens on that date. */
export type Certainty = "confirmed" | "recurring" | "unverified";

/**
 * What kind of place or night it is. `dance` goes in the main list; the others are
 * "extras" (no dancing) shown in their own section.
 */
export type EventKind = "dance" | "cruising" | "sauna" | "bar";

/** Extra information for the expanded card. */
export type EventDetails = {
  /** More image URLs (https:// only). */
  images: string[];
  djs: string[];
  performers: string[];
  /** Short tags about the crowd, e.g. "bear", "giovani". */
  crowd: string[];
  /** Short music tags, e.g. "pop", "techno". */
  music: string[];
  dressCode: string | null;
  /** Practical notes, e.g. shuttle, cloakroom, free entry before a time. */
  notes: string | null;
};

export type DanceEvent = {
  /** Slug of name and date, e.g. "toilet-club-2026-11-27". */
  id: string;
  kind: EventKind;
  name: string;
  venue: string;
  address: string | null;
  town: string;
  /** Local start, ISO 8601: "2026-11-28T23:00", or just "2026-11-28" if the time is unknown. */
  startsAt: string;
  /** Local end in the same format, or null. */
  endsAt: string | null;
  /** Free text, e.g. "15 € con drink" or "gratis"; null if unknown. */
  price: string | null;
  /** Entry needs an ARCO membership card; null if unknown. */
  needsArcoCard: boolean | null;
  /** Short Italian description, at most ~200 characters. */
  description: string;
  /** Main image URL (https:// only), or null. */
  imageUrl: string | null;
  /** Page that supports the certainty label; must start with https://. */
  sourceUrl: string;
  /** Ticket or guest-list page, or null. */
  ticketUrl: string | null;
  certainty: Certainty;
  /** One short Italian sentence explaining the certainty label. */
  certaintyNote: string;
  details: EventDetails;
};

export type EventsResponse = {
  events: DanceEvent[];
};

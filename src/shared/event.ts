// Shape of one event card, shared by the server (which produces it) and the page (which
// renders it). Kept minimal for the skeleton; ELIA-7 defines the full shape.

/** How sure we are that the event happens on that date. */
export type Certainty = "confirmed" | "recurring" | "unverified";

export type DanceEvent = {
  name: string;
  venue: string;
  town: string;
  /** Local start date and time, ISO 8601 (e.g. "2026-11-28T23:00"). */
  startsAt: string;
  /** Free text, e.g. "15 € con drink" or "gratis". */
  price: string;
  /** Short Italian description. */
  description: string;
  /** Page where the event was found; must start with https://. */
  sourceUrl: string;
  certainty: Certainty;
};

export type EventsResponse = {
  events: DanceEvent[];
};

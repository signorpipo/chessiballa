import type { DanceEvent } from "../shared/event.js";

// Placeholder data so the page can be built and deployed before the agent pipeline exists.
// Names and venues are invented on purpose.
export const FAKE_EVENTS: DanceEvent[] = [
  {
    name: "Serata di prova",
    venue: "Locale Esempio",
    town: "Milano",
    startsAt: "2026-11-27T23:30",
    price: "12 € con drink",
    description:
      "Pop e house fino a tardi. Evento finto per provare la pagina.",
    sourceUrl: "https://example.com/serata-di-prova",
    certainty: "confirmed",
  },
  {
    name: "Aperitivo che balla",
    venue: "Bar Immaginario",
    town: "Sesto San Giovanni",
    startsAt: "2026-11-28T19:00",
    price: "gratis",
    description: "Aperitivo con DJ set, poi si balla. Evento finto.",
    sourceUrl: "https://example.com/aperitivo",
    certainty: "recurring",
  },
  {
    name: "Domenica pomeriggio",
    venue: "Club Inventato",
    town: "Monza",
    startsAt: "2026-11-29T17:00",
    price: "10 €",
    description: "Festa diurna, musica anni 2000. Evento finto, fonte debole.",
    sourceUrl: "https://example.com/domenica",
    certainty: "unverified",
  },
];

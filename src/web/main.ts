import type { Certainty, DanceEvent, EventsResponse } from "../shared/event.js";

const CERTAINTY_LABELS: Record<Certainty, string> = {
  confirmed: "confermata",
  recurring: "di solito c'è",
  unverified: "da verificare",
};

const dateFormatter = new Intl.DateTimeFormat("it-IT", {
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

function getElement<T extends Element>(
  selector: string,
  root: ParentNode = document,
): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Missing element: ${selector}`);
  return element;
}

const button = getElement<HTMLButtonElement>("#search");
const status = getElement<HTMLParagraphElement>("#status");
const list = getElement<HTMLUListElement>("#events");
const template = getElement<HTMLTemplateElement>("#event-card");

// Values come from the server (later from the model), so they are only ever set with
// textContent, never as HTML.
function renderCard(event: DanceEvent): HTMLLIElement {
  const fragment = template.content.cloneNode(true) as DocumentFragment;
  const card = getElement<HTMLLIElement>(".card", fragment);

  getElement(".when", card).textContent = dateFormatter.format(
    new Date(event.startsAt),
  );
  getElement(".name", card).textContent = event.name;
  getElement(".where", card).textContent = `${event.venue} · ${event.town}`;
  getElement(".description", card).textContent = event.description;
  getElement(".price", card).textContent = event.price;
  getElement(".certainty", card).textContent =
    CERTAINTY_LABELS[event.certainty];

  const source = getElement<HTMLAnchorElement>(".source", card);
  if (event.sourceUrl.startsWith("https://")) {
    source.href = event.sourceUrl;
  } else {
    source.remove();
  }

  return card;
}

async function loadEvents(): Promise<void> {
  button.disabled = true;
  status.textContent = "Cerco le serate…";
  list.replaceChildren();

  try {
    const response = await fetch("/api/events");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const { events } = (await response.json()) as EventsResponse;

    if (events.length === 0) {
      status.textContent = "Mi sa che stasera resti a casa.";
      return;
    }
    status.textContent = `Trovate ${events.length} serate.`;
    list.replaceChildren(...events.map(renderCard));
  } catch {
    status.textContent = "Qualcosa è andato storto. Riprova tra poco.";
  } finally {
    button.disabled = false;
  }
}

button.addEventListener("click", () => void loadEvents());

// The search window: from now until the end of Sunday (Europe/Rome). On Saturday and
// Sunday it also covers the following week, shown later as two sections.

const TIME_ZONE = "Europe/Rome";
const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export type TimeWindow = {
  /** Local "now", e.g. "Thursday 2026-11-26 15:04". */
  now: string;
  /** Same as `now`: the window starts at the click. */
  start: string;
  /** End of the last Sunday, e.g. "Sunday 2026-11-29 23:59". */
  end: string;
  /** True on Saturday and Sunday, when the window also covers next week. */
  twoSections: boolean;
};

/** Year, month, day, ISO weekday (1 = Monday) and time of a moment in Rome. */
function romeParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    weekday: "long",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    isoWeekday: WEEKDAYS.indexOf(get("weekday")) + 1,
    time: `${get("hour")}:${get("minute")}`,
  };
}

/** "Weekday YYYY-MM-DD" for a calendar date `addDays` after the given one. */
function calendarDay(
  year: number,
  month: number,
  day: number,
  addDays = 0,
): string {
  // Date.UTC handles month and year overflow; UTC avoids daylight-saving surprises.
  const date = new Date(Date.UTC(year, month - 1, day + addDays));
  const weekday = WEEKDAYS[(date.getUTCDay() + 6) % 7];
  return `${weekday} ${date.toISOString().slice(0, 10)}`;
}

export function getTimeWindow(now: Date = new Date()): TimeWindow {
  const { year, month, day, isoWeekday, time } = romeParts(now);
  const twoSections = isoWeekday >= 6;
  const daysToSunday = 7 - isoWeekday + (twoSections ? 7 : 0);
  const nowText = `${calendarDay(year, month, day)} ${time}`;
  return {
    now: nowText,
    start: nowText,
    end: `${calendarDay(year, month, day, daysToSunday)} 23:59`,
    twoSections,
  };
}

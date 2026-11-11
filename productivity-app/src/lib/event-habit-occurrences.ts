import type { EventHabitRecord } from './database';

export type EventHabitOccurrence = Pick<
  EventHabitRecord,
  'id' | 'title' | 'type' | 'time' | 'location' | 'details'
> & { date: string };

function formatDate(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function parseDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    return null;
  }

  const date = new Date(year, month - 1, day);
  return formatDate(date) === value ? date : null;
}

function getSelectedDays(record: EventHabitRecord) {
  try {
    const days: unknown = JSON.parse(record.selected_days);
    if (Array.isArray(days) && days.length === 7) {
      return days.map(Boolean);
    }
  } catch {
    return Array(7).fill(true) as boolean[];
  }

  return Array(7).fill(true) as boolean[];
}

function getDayTime(record: EventHabitRecord, day: number) {
  try {
    const times: unknown = JSON.parse(record.day_times);
    if (times && typeof times === 'object') {
      const time = (times as Record<number, unknown>)[day];
      if (typeof time === 'string' && time) {
        return time;
      }
    }
  } catch {
    return record.time;
  }

  return record.time;
}

function occursOnDate(record: EventHabitRecord, startDate: Date, date: Date) {
  if (date < startDate) {
    return false;
  }

  if (record.type === 'event') {
    return formatDate(date) === record.date;
  }

  if (record.recurrence === 'monthly') {
    return date.getDate() === startDate.getDate();
  }

  if (record.recurrence === 'biweekly') {
    const dateNumber = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000;
    const startNumber =
      Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()) / 86400000;
    const elapsedWeeks = Math.floor((dateNumber - startNumber) / 7);
    return elapsedWeeks % 2 === 0 && getSelectedDays(record)[date.getDay()];
  }

  return getSelectedDays(record)[date.getDay()];
}

export function getEventHabitOccurrences(
  records: EventHabitRecord[],
  rangeStart: Date,
  rangeEnd: Date
) {
  const start = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate());
  const end = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate());
  const occurrences: EventHabitOccurrence[] = [];

  for (const record of records) {
    const recordStart = parseDate(record.date);
    if (!recordStart) {
      continue;
    }

    for (const date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      if (occursOnDate(record, recordStart, date)) {
        occurrences.push({
          id: record.id,
          title: record.title,
          type: record.type,
          date: formatDate(date),
          time: record.type === 'habit' ? getDayTime(record, date.getDay()) : record.time,
          location: record.location,
          details: record.details,
        });
      }
    }
  }

  return occurrences.sort((first, second) =>
    first.date.localeCompare(second.date) || first.time.localeCompare(second.time)
  );
}

export type OverdueItem =
  | { kind: 'event'; occurrence: EventHabitOccurrence }
  | { kind: 'habit'; occurrence: EventHabitOccurrence; missedDates: string[] };

export function occurrenceKey(eventHabitId: number, date: string) {
  return `${eventHabitId}-${date}`;
}

function timeToMinutes(value: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }
  return Number(match[1]) * 60 + Number(match[2]);
}

export function isOccurrencePastDue(occurrence: EventHabitOccurrence, now: Date) {
  const todayKey = formatDate(now);
  if (occurrence.date < todayKey) {
    return true;
  }
  if (occurrence.date > todayKey) {
    return false;
  }

  const minutes = timeToMinutes(occurrence.time);
  return minutes !== null && minutes <= now.getHours() * 60 + now.getMinutes();
}

export function getOverdueItems(
  records: EventHabitRecord[],
  completedKeys: Set<string>,
  now: Date
): OverdueItem[] {
  const items: OverdueItem[] = [];

  for (const record of records) {
    const recordStart = parseDate(record.date);
    if (!recordStart || recordStart > now) {
      continue;
    }

    const missed = getEventHabitOccurrences([record], recordStart, now).filter(
      (occurrence) =>
        isOccurrencePastDue(occurrence, now) &&
        !completedKeys.has(occurrenceKey(occurrence.id, occurrence.date))
    );
    if (!missed.length) {
      continue;
    }

    if (record.type === 'event') {
      missed.forEach((occurrence) => items.push({ kind: 'event', occurrence }));
    } else {
      items.push({
        kind: 'habit',
        occurrence: missed[missed.length - 1],
        missedDates: missed.map((occurrence) => occurrence.date),
      });
    }
  }

  return items.sort(
    (first, second) =>
      first.occurrence.date.localeCompare(second.occurrence.date) ||
      first.occurrence.time.localeCompare(second.occurrence.time)
  );
}


const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

function ordinal(value: number) {
  const remainder = value % 100;
  if (remainder >= 11 && remainder <= 13) {
    return `${value}th`;
  }
  const suffix = ['th', 'st', 'nd', 'rd'][value % 10] ?? 'th';
  return `${value}${suffix}`;
}

export function describeHabitSchedule(record: EventHabitRecord) {
  if (record.recurrence === 'monthly') {
    const start = parseDate(record.date);
    const base = start ? `Monthly on the ${ordinal(start.getDate())}` : 'Monthly';
    return record.time ? `${base} · ${record.time}` : base;
  }

  const selected = getSelectedDays(record);
  const days = WEEK_ORDER.filter((day) => selected[day]);
  if (!days.length) {
    return 'No days selected';
  }

  const times = days.map((day) => getDayTime(record, day));
  const sharedTime = times.every((time) => time === times[0]) ? times[0] : null;
  const prefix = record.recurrence === 'biweekly' ? 'Every other week: ' : 'Every ';

  if (sharedTime !== null) {
    const dayText =
      days.length === 7 && record.recurrence !== 'biweekly'
        ? 'Every day'
        : `${prefix}${days.map((day) => DAY_LABELS[day]).join(', ')}`;
    return sharedTime ? `${dayText} · ${sharedTime}` : dayText;
  }

  const perDay = days
    .map((day, index) => (times[index] ? `${DAY_LABELS[day]} ${times[index]}` : DAY_LABELS[day]))
    .join(', ');
  return `${prefix}${perDay}`;
}

export function groupHabitOccurrences(items: EventHabitOccurrence[]) {
  const seenHabits = new Set<number>();
  return items.filter((item) => {
    if (item.type !== 'habit') {
      return true;
    }
    if (seenHabits.has(item.id)) {
      return false;
    }
    seenHabits.add(item.id);
    return true;
  });
}

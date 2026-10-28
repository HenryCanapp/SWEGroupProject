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
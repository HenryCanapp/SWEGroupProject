import { createContext, PropsWithChildren, useContext, useMemo, useState } from 'react';

import { EventHabitRecord, EventHabitType } from '@/lib/database';

export type EventHabitDraft = {
  title: string;
  type: EventHabitType;
  date: string;
  time: string;
  location: string;
  details: string;
  importance: number;
  recurrence: string;
  selectedDays: boolean[];
  dayTimes: Record<number, string>;
  dayTimeOverrides: Record<number, boolean>;
};

const createDraft = (): EventHabitDraft => ({
  title: '',
  type: 'event',
  date: new Date().toISOString().slice(0, 10),
  time: '',
  location: '',
  details: '',
  importance: 3,
  recurrence: 'weekly',
  selectedDays: Array(7).fill(true),
  dayTimes: {},
  dayTimeOverrides: {},
});

type EventHabitPageState = {
  search: string;
  setSearch: (value: string) => void;
  filter: 'all' | EventHabitType;
  setFilter: (value: 'all' | EventHabitType) => void;
  draft: EventHabitDraft;
  setDraft: (value: EventHabitDraft | ((current: EventHabitDraft) => EventHabitDraft)) => void;
  editorOpen: boolean;
  editingId: number | null;
  openEditor: (record?: EventHabitRecord) => void;
  closeEditor: () => void;
};

const EventHabitPageStateContext = createContext<EventHabitPageState | null>(null);

function recordToDraft(record: EventHabitRecord): EventHabitDraft {
  let selectedDays: boolean[] = Array(7).fill(true);
  let dayTimes: Record<number, string> = {};

  try {
    const parsedDays = JSON.parse(record.selected_days);
    if (Array.isArray(parsedDays) && parsedDays.length === 7) {
      selectedDays = parsedDays.map(Boolean);
    }
  } catch {
    console.error('Unable to read habit days:', record.id);
  }

  try {
    const parsedTimes = JSON.parse(record.day_times);
    if (parsedTimes && typeof parsedTimes === 'object') {
      dayTimes = parsedTimes;
    }
  } catch {
    console.error('Unable to read habit times:', record.id);
  }

  return {
    title: record.title,
    type: record.type,
    date: record.date,
    time: record.time,
    location: record.location,
    details: record.details,
    importance: record.importance,
    recurrence: record.recurrence,
    selectedDays,
    dayTimes,
    dayTimeOverrides: Object.fromEntries(
      Object.entries(dayTimes).map(([day, time]) => [
        day,
        Boolean(time && time !== record.time),
      ])
    ),
  };
}

export function EventHabitPageStateProvider({ children }: PropsWithChildren) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | EventHabitType>('all');
  const [draft, setDraft] = useState(createDraft);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const value = useMemo<EventHabitPageState>(
    () => ({
      search,
      setSearch,
      filter,
      setFilter,
      draft,
      setDraft,
      editorOpen,
      editingId,
      openEditor: (record) => {
        setEditingId(record?.id ?? null);
        setDraft(record ? recordToDraft(record) : createDraft());
        setEditorOpen(true);
      },
      closeEditor: () => {
        setEditorOpen(false);
        setEditingId(null);
        setDraft(createDraft());
      },
    }),
    [draft, editorOpen, editingId, filter, search]
  );

  return (
    <EventHabitPageStateContext.Provider value={value}>
      {children}
    </EventHabitPageStateContext.Provider>
  );
}

export function useEventHabitPageState() {
  const state = useContext(EventHabitPageStateContext);
  if (!state) {
    throw new Error('useEventHabitPageState must be used inside EventHabitPageStateProvider');
  }
  return state;
}

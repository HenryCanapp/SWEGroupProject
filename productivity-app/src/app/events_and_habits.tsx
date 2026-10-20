import { createElement, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
  DateTimePickerAndroid,
} from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { BottomRibbon } from '@/components/bottom-ribbon';
import { useEventHabitPageState } from '@/components/event-habit-state';
import {
  addEventHabit,
  EventHabitInput,
  EventHabitRecord,
  EventHabitType,
  getEventHabits,
  isUserLoggedIn,
  updateEventHabit,
} from '@/lib/database';
import { ScreenSwipe } from '@/components/screen-swipe';

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const recurrenceOptions = [
  { label: 'Weekly', value: 'weekly' },
  { label: 'Every other week', value: 'biweekly' },
  { label: 'Monthly', value: 'monthly' },
];

function parseDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return year && month && day ? new Date(year, month - 1, day) : new Date();
}

function formatDate(value: Date) {
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, '0'),
    String(value.getDate()).padStart(2, '0'),
  ].join('-');
}

function parseTime(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  const result = new Date();
  result.setHours(hours || 0, minutes || 0, 0, 0);
  return result;
}

function formatTime(value: Date) {
  return [String(value.getHours()).padStart(2, '0'), String(value.getMinutes()).padStart(2, '0')].join(
    ':'
  );
}

type PickerProps = {
  value: string;
  mode: 'date' | 'time';
  placeholder: string;
  onChange: (value: string) => void;
  invalid?: boolean;
};

function PickerField({ value, mode, placeholder, onChange, invalid = false }: PickerProps) {
  const [visible, setVisible] = useState(false);

  const handleNativeChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setVisible(false);
    if (event.type === 'set' && selectedDate) {
      onChange(mode === 'date' ? formatDate(selectedDate) : formatTime(selectedDate));
    }
  };

  const openPicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: mode === 'date' ? parseDate(value) : parseTime(value),
        mode,
        onChange: handleNativeChange,
      });
      return;
    }
    setVisible(true);
  };

  if (Platform.OS === 'web') {
    return createElement('input', {
      type: mode,
      value,
      placeholder,
      onChange: (event: { target: { value: string } }) => onChange(event.target.value),
      onClick: (event: { currentTarget: { showPicker?: () => void } }) => {
        event.currentTarget.showPicker?.();
      },
      style: {
        width: '100%',
        boxSizing: 'border-box',
        border: '1px solid #d1d5db',
        borderRadius: 9,
        color: '#111827',
        fontSize: 16,
        padding: '10px 12px',
        marginBottom: 10,
        backgroundColor: '#ffffff',
        ...(invalid ? { borderColor: '#dc2626', borderWidth: 2 } : {}),
      },
    });
  }

  if (Platform.OS === 'ios') {
    return (
      <View style={[styles.iosPickerField, invalid && styles.invalidField]}>
        <DateTimePicker
          value={mode === 'date' ? parseDate(value) : parseTime(value)}
          mode={mode}
          display="default"
          onChange={handleNativeChange}
        />
      </View>
    );
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={placeholder}
        onPress={openPicker}
        style={[styles.pickerField, invalid && styles.invalidField]}
      >
        <Text style={value ? styles.pickerValue : styles.pickerPlaceholder}>
          {value || placeholder}
        </Text>
      </Pressable>
      {visible ? (
        <DateTimePicker
          value={mode === 'date' ? parseDate(value) : parseTime(value)}
          mode={mode}
          display="default"
          onChange={handleNativeChange}
        />
      ) : null}
    </>
  );
}

export default function EventsAndHabitsPage() {
  const { width: windowWidth } = useWindowDimensions();
  const [records, setRecords] = useState<EventHabitRecord[]>([]);
  const [error, setError] = useState('');
  const [requiredFieldsInvalid, setRequiredFieldsInvalid] = useState(false);
  const {
    search,
    setSearch,
    filter,
    setFilter,
    draft,
    setDraft,
    editorOpen,
    editingId,
    openEditor,
    closeEditor,
  } = useEventHabitPageState();

  const closeEditorAndReset = () => {
    setError('');
    setRequiredFieldsInvalid(false);
    closeEditor();
  };

  const loadRecords = async () => {
    const eventHabits = await getEventHabits();
    setRecords(eventHabits);
  };

  useEffect(() => {
    let isMounted = true;
    isUserLoggedIn()
      .then((loggedIn) => {
        if (!loggedIn) {
          router.replace('/');
          return;
        }
        return getEventHabits();
      })
      .then((eventHabits) => {
        if (isMounted && eventHabits) {
          setRecords(eventHabits);
        }
      })
      .catch((loadError) => {
        console.error('Unable to load events and habits:', loadError);
        setError('Unable to load your events and habits.');
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!editorOpen) {
      setRequiredFieldsInvalid(false);
      setError('');
    }
  }, [editorOpen]);

  const filteredRecords = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const today = new Date().toISOString().slice(0, 10);

    return records.filter((record) => {
      const matchesFilter = filter === 'all' || record.type === filter;
      const matchesSearch =
        !normalizedSearch ||
        [record.title, record.location, record.details].some((value) =>
          value.toLowerCase().includes(normalizedSearch)
        );
      const hasStarted = record.type === 'event' || !record.date || record.date <= today;

      return matchesFilter && matchesSearch && hasStarted;
    });
  }, [filter, records, search]);

  const updateDraft = (changes: Partial<typeof draft>) => {
    setDraft((current) => ({ ...current, ...changes }));
  };

  const updateDefaultTime = (time: string) => {
    setDraft((current) => {
      const dayTimes = { ...current.dayTimes };
      Object.keys(dayTimes).forEach((day) => {
        const index = Number(day);
        if (!current.dayTimeOverrides[index] && dayTimes[index] === current.time) {
          dayTimes[index] = time;
        }
      });
      return { ...current, time, dayTimes };
    });
  };

  const toggleDay = (index: number) => {
    setDraft((current) => {
      const isSelecting = !current.selectedDays[index];
      return {
        ...current,
        selectedDays: current.selectedDays.map((selected, dayIndex) =>
          dayIndex === index ? isSelecting : selected
        ),
        dayTimes:
          isSelecting && current.time && !current.dayTimes[index]
            ? { ...current.dayTimes, [index]: current.time }
            : current.dayTimes,
        dayTimeOverrides:
          isSelecting && !current.dayTimeOverrides[index]
            ? { ...current.dayTimeOverrides, [index]: false }
            : current.dayTimeOverrides,
      };
    });
  };

  const selectAllDays = () => {
    setDraft((current) => {
      const allSelected = current.selectedDays.every(Boolean);
      return { ...current, selectedDays: Array(7).fill(!allSelected) };
    });
  };

  const selectType = (type: EventHabitType) => {
    setDraft((current) => {
      if (type !== 'habit' || current.type === 'habit' || !current.time) {
        return { ...current, type };
      }

      const inheritedTimes = { ...current.dayTimes };
      current.selectedDays.forEach((selected, index) => {
        if (selected && !inheritedTimes[index]) {
          inheritedTimes[index] = current.time;
        }
      });
      return { ...current, type, dayTimes: inheritedTimes };
    });
  };

  const save = async () => {
    if (!draft.title.trim() || !draft.date) {
      setRequiredFieldsInvalid(true);
      setError('Name and date are required.');
      return;
    }
    setRequiredFieldsInvalid(false);
    if (draft.type === 'habit' && !draft.selectedDays.some(Boolean)) {
      setError('Select at least one day for a habit.');
      return;
    }

    const input: EventHabitInput = {
      title: draft.title.trim(),
      type: draft.type,
      date: draft.date,
      time: draft.time,
      location: draft.location.trim(),
      details: draft.details.trim(),
      importance: draft.importance,
      recurrence: draft.recurrence,
      selected_days: JSON.stringify(draft.selectedDays),
      day_times: JSON.stringify(draft.dayTimes),
    };

    try {
      if (editingId === null) {
        await addEventHabit(input);
      } else {
        await updateEventHabit(editingId, input);
      }
      await loadRecords();
      closeEditor();
      setError('');
    } catch (saveError) {
      console.error('Unable to save event or habit:', saveError);
      setError('Unable to save this item.');
    }
  };

  return (
    <ScreenSwipe>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create a new event or habit"
            onPress={() => openEditor()}
            style={styles.newButton}
          >
            <Text style={styles.newButtonText}>New Event/Habbit</Text>
          </Pressable>

          <View style={styles.listSection}>
            <Text style={styles.sectionTitle}>Your Events &amp; Habbits</Text>
            <TextInput
              accessibilityLabel="Search events and habits"
              value={search}
              onChangeText={setSearch}
              placeholder="Search events and habits"
              placeholderTextColor="#6b7280"
              style={styles.searchInput}
            />
            <View style={styles.filters} accessibilityRole="tablist">
              {[
                { label: 'All', value: 'all' as const },
                { label: 'Events', value: 'event' as const },
                { label: 'Habbits', value: 'habit' as const },
              ].map((option) => {
                const isSelected = filter === option.value;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => setFilter(option.value)}
                    style={[styles.filterButton, isSelected && styles.selectedFilterButton]}
                  >
                    <Text style={[styles.filterText, isSelected && styles.selectedFilterText]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {error && !editorOpen ? <Text style={styles.errorText}>{error}</Text> : null}
            <FlatList
              data={filteredRecords}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.listContent}
              style={styles.recordList}
              renderItem={({ item }) => (
                <Pressable onPress={() => openEditor(item)} style={styles.recordCard}>
                  <View style={styles.recordCopy}>
                    <Text style={styles.recordTitle}>{item.title}</Text>
                    <Text style={styles.recordType}>
                      {item.type === 'event' ? 'Event' : 'Habbit'} · {item.date}
                    </Text>
                    {item.location ? <Text style={styles.recordMeta}>{item.location}</Text> : null}
                  </View>
                </Pressable>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  {search.trim() || filter !== 'all'
                    ? 'No events or habbits match your search.'
                    : 'You have not created any events or habbits yet.'}
                </Text>
              }
            />
          </View>
        </View>
      </SafeAreaView>

      {editorOpen ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          pointerEvents="box-none"
          style={styles.modalBackdrop}
        >
          <View pointerEvents="none" style={styles.dimmer} />
          <Pressable style={styles.dismissArea} onPress={closeEditorAndReset} />
          <View
            style={[styles.editor, windowWidth >= 600 && styles.desktopEditor]}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              directionalLockEnabled
              contentContainerStyle={styles.editorContent}
            >
              <View style={styles.editorHeader}>
                <Text style={styles.editorTitle}>{editingId === null ? 'New' : 'Edit'} Event/Habbit</Text>
                <Pressable onPress={closeEditorAndReset} accessibilityLabel="Close editor">
                  <Text style={styles.closeText}>×</Text>
                </Pressable>
              </View>
              <TextInput
                value={draft.title}
                onChangeText={(title) => {
                  updateDraft({ title });
                  if (title.trim() && draft.date) {
                    setRequiredFieldsInvalid(false);
                  }
                }}
                placeholder="Name"
                placeholderTextColor="#6b7280"
                style={[styles.input, requiredFieldsInvalid && !draft.title.trim() && styles.invalidField]}
              />
              <PickerField
                value={draft.date}
                mode="date"
                placeholder="Date"
                invalid={requiredFieldsInvalid && !draft.date}
                onChange={(date) => {
                  updateDraft({ date });
                  if (date && draft.title.trim()) {
                    setRequiredFieldsInvalid(false);
                  }
                }}
              />
              <PickerField
                value={draft.time}
                mode="time"
                placeholder="Time (optional)"
                onChange={updateDefaultTime}
              />
              <TextInput
                value={draft.location}
                onChangeText={(location) => updateDraft({ location })}
                placeholder="Location (optional)"
                placeholderTextColor="#6b7280"
                style={styles.input}
              />
              <View style={styles.modeButtons}>
                {(['event', 'habit'] as EventHabitType[]).map((type) => (
                  <Pressable
                    key={type}
                    onPress={() => selectType(type)}
                    style={[styles.modeButton, draft.type === type && styles.selectedModeButton]}
                  >
                    <Text style={draft.type === type ? styles.selectedFilterText : styles.filterText}>
                      {type === 'event' ? 'Event' : 'Habbit'}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {draft.type === 'habit' ? (
                <View style={styles.habitSection}>
                  <Pressable onPress={selectAllDays} style={styles.selectAllButton}>
                    <Text style={styles.linkText}>
                      {draft.selectedDays.every(Boolean) ? 'Deselect all' : 'Select all'}
                    </Text>
                  </Pressable>
                  {days.map((day, index) => (
                    <View
                      key={day}
                      style={[styles.dayRow, draft.selectedDays[index] && styles.selectedDayRow]}
                    >
                      <Pressable onPress={() => toggleDay(index)} style={styles.dayToggle}>
                        <Text style={styles.dayText}>{day}</Text>
                      </Pressable>
                      <View style={styles.dayPicker}>
                        <PickerField
                          value={draft.dayTimes[index] ?? ''}
                          mode="time"
                          placeholder={draft.time || 'Time'}
                          onChange={(value) =>
                            setDraft((current) => ({
                              ...current,
                              dayTimes: { ...current.dayTimes, [index]: value },
                              dayTimeOverrides: {
                                ...current.dayTimeOverrides,
                                [index]: true,
                              },
                            }))
                          }
                        />
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Reset ${day} time`}
                        onPress={() =>
                          setDraft((current) => ({
                            ...current,
                            dayTimes: { ...current.dayTimes, [index]: current.time },
                            dayTimeOverrides: {
                              ...current.dayTimeOverrides,
                              [index]: false,
                            },
                          }))
                        }
                        style={styles.resetTimeButton}
                      >
                        <Text style={styles.resetTimeText}>Reset</Text>
                      </Pressable>
                    </View>
                  ))}
                  <Text style={styles.fieldLabel}>Repeats</Text>
                  <View style={styles.recurrenceButtons}>
                    {recurrenceOptions.map((option) => (
                      <Pressable
                        key={option.value}
                        onPress={() => updateDraft({ recurrence: option.value })}
                        style={[
                          styles.recurrenceButton,
                          draft.recurrence === option.value && styles.selectedModeButton,
                        ]}
                      >
                        <Text
                          style={
                            draft.recurrence === option.value
                              ? styles.selectedFilterText
                              : styles.filterText
                          }
                        >
                          {option.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}
              <TextInput
                value={draft.details}
                onChangeText={(details) => updateDraft({ details })}
                placeholder="Details"
                placeholderTextColor="#6b7280"
                multiline
                style={[styles.input, styles.detailsInput]}
              />
              {requiredFieldsInvalid ? (
                <Text style={styles.requiredErrorText}>Name and date are required.</Text>
              ) : null}
              <View style={styles.saveRow}>
                <Pressable onPress={save} style={styles.saveButton}>
                  <Text style={styles.saveButtonText}>Save</Text>
                </Pressable>
                <View>
                  <Text style={styles.fieldLabel}>Importance</Text>
                  <View style={styles.importanceButtons}>
                    {[1, 2, 3, 4, 5].map((value) => (
                      <Pressable
                        key={value}
                        onPress={() => updateDraft({ importance: value })}
                        style={[
                          styles.importanceButton,
                          draft.importance === value && styles.selectedModeButton,
                        ]}
                      >
                        <Text
                          style={
                            draft.importance === value
                              ? styles.selectedFilterText
                              : styles.filterText
                          }
                        >
                          {value}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>
              {error && !requiredFieldsInvalid ? <Text style={styles.errorText}>{error}</Text> : null}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      ) : null}
      <BottomRibbon />
    </ScreenSwipe>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 72 },
  newButton: {
    width: '100%', maxHeight: '20%', minHeight: 64, borderRadius: 14,
    backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 20, marginBottom: 20,
  },
  newButtonText: { color: '#ffffff', fontSize: 20, fontWeight: '600', textAlign: 'center' },
  listSection: { flex: 1, width: '100%' },
  sectionTitle: { color: '#111827', fontSize: 24, fontWeight: '700', marginBottom: 12 },
  searchInput: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, color: '#111827',
    fontSize: 16, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#ffffff',
  },
  filters: { flexDirection: 'row', gap: 8, marginVertical: 14 },
  filterButton: { flex: 1, alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db', paddingVertical: 10 },
  selectedFilterButton: { backgroundColor: '#111827', borderColor: '#111827' },
  filterText: { color: '#374151', fontSize: 14, fontWeight: '600' },
  selectedFilterText: { color: '#ffffff' },
  recordList: { flex: 1 },
  listContent: { gap: 10, paddingBottom: 16, flexGrow: 1 },
  recordCard: { borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f9fafb', padding: 16 },
  recordCopy: { gap: 4 },
  recordTitle: { color: '#111827', fontSize: 17, fontWeight: '600' },
  recordType: { color: '#6b7280', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 },
  recordMeta: { color: '#4b5563', fontSize: 14 },
  emptyText: { color: '#6b7280', fontSize: 15, paddingVertical: 28, textAlign: 'center' },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    zIndex: 10,
    justifyContent: 'center',
    backgroundColor: 'transparent',
    padding: 16,
  },
  dismissArea: { ...StyleSheet.absoluteFill },
  dimmer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(17, 24, 39, 0.55)',
  },
  editor: {
    width: '100%',
    height: '72%',
    maxHeight: 620,
    alignSelf: 'center',
    borderRadius: 16,
    backgroundColor: '#ffffff',
    padding: 20,
  },
  editorContent: { paddingBottom: 8 },
  desktopEditor: { maxWidth: 520 },
  editorHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  editorTitle: { color: '#111827', fontSize: 21, fontWeight: '700' },
  closeText: { color: '#374151', fontSize: 30, lineHeight: 30 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 9, color: '#111827', fontSize: 16, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
  pickerField: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
    backgroundColor: '#ffffff',
  },
  invalidField: { borderColor: '#dc2626', borderWidth: 2 },
  pickerValue: { color: '#111827', fontSize: 16 },
  pickerPlaceholder: { color: '#6b7280', fontSize: 16 },
  iosPickerField: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 9,
    marginBottom: 10,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  modeButtons: { flexDirection: 'row', gap: 8, marginVertical: 4 },
  modeButton: { flex: 1, alignItems: 'center', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingVertical: 10 },
  selectedModeButton: { backgroundColor: '#111827', borderColor: '#111827' },
  habitSection: { marginTop: 10 },
  selectAllButton: { alignSelf: 'flex-end', padding: 6 },
  linkText: { color: '#1d4ed8', fontWeight: '600' },
  dayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 8, marginBottom: 6 },
  selectedDayRow: { borderColor: '#93c5fd', backgroundColor: '#eff6ff' },
  dayToggle: { flex: 1, paddingVertical: 5 },
  dayPicker: { width: 118 },
  resetTimeButton: { paddingHorizontal: 3, paddingVertical: 6 },
  resetTimeText: { color: '#1d4ed8', fontSize: 11, fontWeight: '600' },
  dayText: { color: '#111827', fontSize: 15, fontWeight: '600' },
  fieldLabel: { color: '#374151', fontSize: 13, fontWeight: '600', marginBottom: 5 },
  recurrenceButtons: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  recurrenceButton: { flex: 1, alignItems: 'center', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 7, padding: 8 },
  detailsInput: { minHeight: 90, textAlignVertical: 'top' },
  saveRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  saveButton: { flex: 1, backgroundColor: '#111827', borderRadius: 8, alignItems: 'center', paddingVertical: 12 },
  saveButtonText: { color: '#ffffff', fontWeight: '700', fontSize: 16 },
  importanceButtons: { flexDirection: 'row', gap: 4 },
  importanceButton: { width: 28, height: 28, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  requiredErrorText: { color: '#b91c1c', marginBottom: 8, fontSize: 13, fontWeight: '600' },
  errorText: { color: '#b91c1c', marginBottom: 8, fontSize: 13 },
});

export type TaskRecord = {
  id: number;
  title: string;
  completed: number;
  created_at: string;
};

export type UserRecord = {
  id: number;
  username: string;
  password: string;
  is_logged_in: number;
};

export type EventHabitType = 'event' | 'habit';

export type EventHabitRecord = {
  id: number;
  user_id: number;
  title: string;
  type: EventHabitType;
  date: string;
  time: string;
  location: string;
  details: string;
  importance: number;
  recurrence: string;
  selected_days: string;
  day_times: string;
  created_at: string;
};

export type EventHabitInput = Omit<EventHabitRecord, 'id' | 'user_id' | 'created_at'>;

const USER_STORAGE_KEY = 'productivity_app_users';
const TASK_STORAGE_KEY = 'productivity_app_tasks';
const EVENT_HABIT_STORAGE_KEY = 'productivity_app_events_habits';
export type CurrentUser = {
  id: number;
  username: string;
};

export type ProfileRecord = {
  user_id: number;
  username: string;
  display_name: string;
  about_me: string;
  avatar_uri: string;
};

export type ProfileInput = Pick<ProfileRecord, 'display_name' | 'about_me' | 'avatar_uri'>;

type StoredProfile = Omit<ProfileRecord, 'username'> & { updated_at: string };

const PROFILE_STORAGE_KEY = 'productivity_app_profiles';

function getUsers(): UserRecord[] {
  if (typeof localStorage === 'undefined') {
    return [];
  }

  const raw = localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw) as UserRecord[];
  } catch {
    return [];
  }
}

function setUsers(users: UserRecord[]) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(users));
  }
}

function getTasksFromStorage(): TaskRecord[] {
  if (typeof localStorage === 'undefined') {
    return [];
  }

  const raw = localStorage.getItem(TASK_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw) as TaskRecord[];
  } catch {
    return [];
  }
}

function setTasks(tasks: TaskRecord[]) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(tasks));
  }
}

function getEventHabitsFromStorage(): EventHabitRecord[] {
  if (typeof localStorage === 'undefined') {
    return [];
  }

  const raw = localStorage.getItem(EVENT_HABIT_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const records = JSON.parse(raw) as Partial<EventHabitRecord>[];
    return records.map((record) => ({
      ...record,
      date: record.date ?? '',
      time: record.time ?? '',
      location: record.location ?? '',
      details: record.details ?? '',
      importance: record.importance ?? 3,
      recurrence: record.recurrence ?? 'weekly',
      selected_days: record.selected_days ?? '[]',
      day_times: record.day_times ?? '{}',
    })) as EventHabitRecord[];
  } catch {
    return [];
  }
}

function getProfilesFromStorage(): StoredProfile[] {
  if (typeof localStorage === 'undefined') {
    return [];
  }

  const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw) as StoredProfile[];
  } catch {
    return [];
  }
}

function setEventHabits(records: EventHabitRecord[]) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(EVENT_HABIT_STORAGE_KEY, JSON.stringify(records));
  }
}

function getLoggedInUser(): UserRecord | undefined {
  return getUsers().find((user) => user.is_logged_in === 1);
}

function setProfiles(profiles: StoredProfile[]) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profiles));
  }
}

export async function initializeDatabase() {
  const users = getUsers();
  if (!users.some((user) => user.username === 'user')) {
    setUsers([
      { id: 1, username: 'user', password: 'password', is_logged_in: 0 },
      ...users,
    ]);
  }

  if (!localStorage.getItem(TASK_STORAGE_KEY)) {
    setTasks([]);
  }

  if (!localStorage.getItem(EVENT_HABIT_STORAGE_KEY)) {
    setEventHabits([]);
  }
}

export async function validateUser(username: string, password: string) {
  const users = getUsers();
  return users.some((user) => user.username === username && user.password === password);
}

export async function loginUser(username: string, password: string) {
  const users = getUsers();

  const foundUser = users.some((user) => user.username === username && user.password === password);
  if (!foundUser) {
    return false;
  }

  const nextUsers = users.map((user) => ({
    ...user,
    is_logged_in: user.username === username && user.password === password ? 1 : 0,
  }));

  setUsers(nextUsers);
  return true;
}

export async function logoutUser() {
  const users = getUsers();
  setUsers(users.map((user) => ({ ...user, is_logged_in: 0 })));
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const user = getUsers().find((candidate) => candidate.is_logged_in === 1);
  return user ? { id: user.id, username: user.username } : null;
}

export async function isUserLoggedIn() {
  const user = await getCurrentUser();
  return !!user;
}

export async function addTask(title: string) {
  const tasks = getTasksFromStorage();
  const newTask: TaskRecord = {
    id: Date.now(),
    title,
    completed: 0,
    created_at: new Date().toISOString(),
  };

  setTasks([newTask, ...tasks]);
}

export async function getTasks() {
  return getTasksFromStorage();
}

export async function getTaskCount() {
  return getTasksFromStorage().length;
}

export async function addEventHabit(input: EventHabitInput) {
  const user = getLoggedInUser();
  if (!user) {
    throw new Error('Cannot add an event or habit without a logged-in user.');
  }

  const newRecord: EventHabitRecord = {
    id: Date.now(),
    user_id: user.id,
    ...input,
    created_at: new Date().toISOString(),
  };

  setEventHabits([newRecord, ...getEventHabitsFromStorage()]);
}

export async function updateEventHabit(id: number, input: EventHabitInput) {
  const user = getLoggedInUser();
  if (!user) {
    throw new Error('Cannot update an event or habit without a logged-in user.');
  }

  setEventHabits(
    getEventHabitsFromStorage().map((record) =>
      record.id === id && record.user_id === user.id ? { ...record, ...input } : record
    )
  );
}

export async function getEventHabits() {
  const user = getLoggedInUser();
  if (!user) {
    return [];
  }

  return getEventHabitsFromStorage()
    .filter((record) => record.user_id === user.id)
    .sort((first, second) => second.created_at.localeCompare(first.created_at));
}

export async function getProfile(): Promise<ProfileRecord | null> {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const profile = getProfilesFromStorage().find((candidate) => candidate.user_id === user.id);

  return {
    user_id: user.id,
    username: user.username,
    display_name: profile?.display_name ?? '',
    about_me: profile?.about_me ?? '',
    avatar_uri: profile?.avatar_uri ?? '',
  };
}

export async function saveProfile(input: ProfileInput) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('Cannot save a profile without a logged-in user.');
  }

  const nextProfile: StoredProfile = {
    user_id: user.id,
    display_name: input.display_name,
    about_me: input.about_me,
    avatar_uri: input.avatar_uri,
    updated_at: new Date().toISOString(),
  };

  const otherProfiles = getProfilesFromStorage().filter((profile) => profile.user_id !== user.id);
  setProfiles([nextProfile, ...otherProfiles]);
}

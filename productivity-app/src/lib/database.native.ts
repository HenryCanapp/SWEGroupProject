import * as SQLite from 'expo-sqlite';

import {
  hashPassword,
  isPasswordHash,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  verifyPassword,
} from './password-hashing';

const db = SQLite.openDatabaseSync('productivity_app.db');

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

export async function initializeDatabase() {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      is_logged_in INTEGER NOT NULL DEFAULT 0
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS events_habits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('event', 'habit')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS profiles (
      user_id INTEGER PRIMARY KEY,
      display_name TEXT NOT NULL DEFAULT '',
      about_me TEXT NOT NULL DEFAULT '',
      avatar_uri TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    );
  `);

  const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(events_habits)');
  const existingColumns = new Set(columns.map((column) => column.name));
  const newColumns = [
    ['date', "TEXT NOT NULL DEFAULT ''"],
    ['time', "TEXT NOT NULL DEFAULT ''"],
    ['location', "TEXT NOT NULL DEFAULT ''"],
    ['details', "TEXT NOT NULL DEFAULT ''"],
    ['importance', 'INTEGER NOT NULL DEFAULT 3'],
    ['recurrence', "TEXT NOT NULL DEFAULT 'weekly'"],
    ['selected_days', "TEXT NOT NULL DEFAULT '[]'"],
    ['day_times', "TEXT NOT NULL DEFAULT '{}'"],
  ] as const;

  for (const [name, definition] of newColumns) {
    if (!existingColumns.has(name)) {
      await db.execAsync(`ALTER TABLE events_habits ADD COLUMN ${name} ${definition}`);
    }
  }

  const users = await db.getAllAsync<UserRecord>(
    'SELECT id, username, password, is_logged_in FROM users'
  );
  for (const user of users) {
    if (!isPasswordHash(user.password)) {
      await db.runAsync('UPDATE users SET password = ? WHERE id = ?', [
        await hashPassword(user.password),
        user.id,
      ]);
    }
  }
}

export async function createUser(username: string, password: string) {
  const normalizedUsername = username.trim();
  const passwordLength = Array.from(password).length;
  if (
    !normalizedUsername ||
    passwordLength < MIN_PASSWORD_LENGTH ||
    passwordLength > MAX_PASSWORD_LENGTH
  ) {
    return false;
  }

  const existingUser = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM users WHERE username = ?',
    [normalizedUsername]
  );
  if (existingUser) {
    return false;
  }

  const passwordHash = await hashPassword(password);
  const result = await db.runAsync(
    'INSERT INTO users (username, password, is_logged_in) VALUES (?, ?, 0)',
    [normalizedUsername, passwordHash]
  );
  await db.runAsync(
    'UPDATE users SET is_logged_in = CASE WHEN id = ? THEN 1 ELSE 0 END',
    [result.lastInsertRowId]
  );
  return true;
}

export async function validateUser(username: string, password: string) {
  const user = await db.getFirstAsync<UserRecord>(
    'SELECT id, username, password, is_logged_in FROM users WHERE username = ?',
    [username.trim()]
  );

  return user ? verifyPassword(password, user.password) : false;
}

export async function loginUser(username: string, password: string) {
  const user = await db.getFirstAsync<UserRecord>(
    'SELECT id, username, password, is_logged_in FROM users WHERE username = ?',
    [username.trim()]
  );
  if (!user || !(await verifyPassword(password, user.password))) {
    return false;
  }

  await db.runAsync('UPDATE users SET is_logged_in = CASE WHEN id = ? THEN 1 ELSE 0 END', [
    user.id,
  ]);

  return true;
}

export async function logoutUser() {
  await db.runAsync('UPDATE users SET is_logged_in = 0');
}

export async function getCurrentUser() {
  return db.getFirstAsync<CurrentUser>(
    'SELECT id, username FROM users WHERE is_logged_in = 1 LIMIT 1'
  );
}

export async function isUserLoggedIn() {
  const user = await getCurrentUser();
  return !!user;
}

export async function addTask(title: string) {
  await db.runAsync('INSERT INTO tasks (title) VALUES (?)', [title]);
}

export async function getTasks() {
  return db.getAllAsync<TaskRecord>('SELECT * FROM tasks ORDER BY created_at DESC');
}

export async function getTaskCount() {
  const result = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM tasks');
  return result?.count ?? 0;
}

export type EventHabitInput = Omit<
  EventHabitRecord,
  'id' | 'user_id' | 'created_at'
>;

export async function addEventHabit(input: EventHabitInput) {
  const user = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM users WHERE is_logged_in = 1 LIMIT 1'
  );

  if (!user) {
    throw new Error('Cannot add an event or habit without a logged-in user.');
  }

  await db.runAsync(
    `INSERT INTO events_habits
      (user_id, title, type, date, time, location, details, importance, recurrence, selected_days, day_times)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      user.id,
      input.title,
      input.type,
      input.date,
      input.time,
      input.location,
      input.details,
      input.importance,
      input.recurrence,
      input.selected_days,
      input.day_times,
    ]
  );
}

export async function updateEventHabit(id: number, input: EventHabitInput) {
  const user = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM users WHERE is_logged_in = 1 LIMIT 1'
  );

  if (!user) {
    throw new Error('Cannot update an event or habit without a logged-in user.');
  }

  await db.runAsync(
    `UPDATE events_habits
     SET title = ?, type = ?, date = ?, time = ?, location = ?, details = ?,
         importance = ?, recurrence = ?, selected_days = ?, day_times = ?
     WHERE id = ? AND user_id = ?`,
    [
      input.title,
      input.type,
      input.date,
      input.time,
      input.location,
      input.details,
      input.importance,
      input.recurrence,
      input.selected_days,
      input.day_times,
      id,
      user.id,
    ]
  );
}

export async function getEventHabits() {
  return db.getAllAsync<EventHabitRecord>(
    `SELECT id, user_id, title, type, date, time, location, details, importance,
            recurrence, selected_days, day_times, created_at
     FROM events_habits
     WHERE user_id = (SELECT id FROM users WHERE is_logged_in = 1 LIMIT 1)
     ORDER BY created_at DESC, id DESC`
  );
}

export async function getProfile() {
  return db.getFirstAsync<ProfileRecord>(
    `SELECT users.id AS user_id, users.username,
            COALESCE(profiles.display_name, '') AS display_name,
            COALESCE(profiles.about_me, '') AS about_me,
            COALESCE(profiles.avatar_uri, '') AS avatar_uri
     FROM users
     LEFT JOIN profiles ON profiles.user_id = users.id
     WHERE users.is_logged_in = 1
     LIMIT 1`
  );
}

export async function saveProfile(input: ProfileInput) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('Cannot save a profile without a logged-in user.');
  }

  await db.runAsync(
    `INSERT INTO profiles (user_id, display_name, about_me, avatar_uri, updated_at)
     VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id) DO UPDATE SET
       display_name = excluded.display_name,
       about_me = excluded.about_me,
       avatar_uri = excluded.avatar_uri,
       updated_at = CURRENT_TIMESTAMP`,
    [user.id, input.display_name, input.about_me, input.avatar_uri]
  );
}

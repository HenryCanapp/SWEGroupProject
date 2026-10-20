import * as SQLite from 'expo-sqlite';

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
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
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

  await db.runAsync(
    'INSERT OR IGNORE INTO users (username, password, is_logged_in) VALUES (?, ?, 0)',
    ['user', 'password']
  );
}

export async function validateUser(username: string, password: string) {
  const user = await db.getFirstAsync<UserRecord>(
    'SELECT id, username, password, is_logged_in FROM users WHERE username = ? AND password = ?',
    [username, password]
  );

  return !!user;
}

export async function loginUser(username: string, password: string) {
  const userExists = await validateUser(username, password);

  if (!userExists) {
    return false;
  }

  await db.runAsync('UPDATE users SET is_logged_in = 1 WHERE username = ? AND password = ?', [
    username,
    password,
  ]);

  return true;
}

export async function logoutUser() {
  await db.runAsync('UPDATE users SET is_logged_in = 0');
}

export async function isUserLoggedIn() {
  const result = await db.getFirstAsync<{ is_logged_in: number }>(
    'SELECT is_logged_in FROM users WHERE username = ? LIMIT 1',
    ['user']
  );

  return !!result && result.is_logged_in === 1;
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

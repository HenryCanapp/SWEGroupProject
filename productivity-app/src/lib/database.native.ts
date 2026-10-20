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

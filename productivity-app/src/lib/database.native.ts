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
    CREATE TABLE IF NOT EXISTS profiles (
      user_id INTEGER PRIMARY KEY,
      display_name TEXT NOT NULL DEFAULT '',
      about_me TEXT NOT NULL DEFAULT '',
      avatar_uri TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
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

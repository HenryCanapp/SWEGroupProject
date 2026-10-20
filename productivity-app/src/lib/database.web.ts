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

const USER_STORAGE_KEY = 'productivity_app_users';
const TASK_STORAGE_KEY = 'productivity_app_tasks';

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

export async function isUserLoggedIn() {
  const users = getUsers();
  return users.some((user) => user.is_logged_in === 1);
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

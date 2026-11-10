import { assertSupabaseConfigured, supabase } from './supabase';
import { clearBackgroundedAt, expireBackgroundedSession } from './session-timeout';

export type TaskRecord = {
  id: number;
  title: string;
  completed: number;
  created_at: string;
};

export type EventHabitType = 'event' | 'habit';

export type EventHabitRecord = {
  id: number;
  user_id: string;
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

export type CurrentUser = {
  id: string;
  username: string;
};

export type ProfileRecord = {
  user_id: string;
  username: string;
  display_name: string;
  about_me: string;
  avatar_uri: string;
};

export type ProfileInput = Pick<ProfileRecord, 'display_name' | 'about_me' | 'avatar_uri'>;

export type SearchableProfileRecord = Pick<
  ProfileRecord,
  'user_id' | 'username' | 'display_name' | 'avatar_uri'
> & {
  relationship_status: 'none' | 'pending_sent' | 'pending_received' | 'friends';
};

export type FriendNotification = {
  notification_id: number;
  notification_type: 'friend_request' | 'friend_request_accepted' | 'friend_request_declined';
  request_id: string;
  request_status: 'pending' | 'accepted' | 'declined' | 'removed';
  actor_id: string;
  actor_username: string;
  actor_display_name: string;
  actor_avatar_uri: string;
  created_at: string;
};

export type FriendRecord = Pick<
  ProfileRecord,
  'user_id' | 'username' | 'display_name' | 'avatar_uri'
>;

function checkError(error: { message: string } | null) {
  if (error) {
    throw new Error(error.message);
  }
}

async function clearLocalAuthSession() {
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  checkError(error);
}

export async function initializeDatabase() {
  assertSupabaseConfigured();
  const { error } = await supabase.auth.getSession();
  checkError(error);
}

export async function createUser(username: string, email: string, password: string) {
  assertSupabaseConfigured();
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: { data: { username: username.trim().toLowerCase() } },
  });
  checkError(error);
  await clearBackgroundedAt();
  return Boolean(data.session);
}

export async function loginUser(email: string, password: string) {
  assertSupabaseConfigured();
  const normalizedEmail = email.trim().toLowerCase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });
  if (error && [400, 401, 403, 404].includes(error.status ?? 0)) {
    await clearLocalAuthSession();
    return false;
  }
  checkError(error);

  if (!data.session || !data.user || data.user.email?.toLowerCase() !== normalizedEmail) {
    await clearLocalAuthSession();
    return false;
  }

  const { data: verifiedData, error: verificationError } = await supabase.auth.getUser(
    data.session.access_token
  );
  if (verificationError && [400, 401, 403, 404].includes(verificationError.status ?? 0)) {
    await clearLocalAuthSession();
    return false;
  }
  checkError(verificationError);
  if (verifiedData.user?.id !== data.user.id) {
    await clearLocalAuthSession();
    return false;
  }

  await clearBackgroundedAt();
  return true;
}

export async function logoutUser() {
  assertSupabaseConfigured();
  const { error } = await supabase.auth.signOut();
  checkError(error);
  await clearBackgroundedAt();
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  assertSupabaseConfigured();
  if (await expireBackgroundedSession()) {
    return null;
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  checkError(sessionError);
  if (!sessionData.session) {
    return null;
  }

  const { data, error } = await supabase.auth.getUser();
  if (error && [400, 401, 403, 404].includes(error.status ?? 0)) {
    await clearLocalAuthSession();
    return null;
  }
  checkError(error);
  if (!data.user) {
    await clearLocalAuthSession();
    return null;
  }

  return {
    id: data.user.id,
    username: data.user.user_metadata.username ?? data.user.email?.split('@')[0] ?? '',
  };
}

export async function isUserLoggedIn() {
  return Boolean(await getCurrentUser());
}

export async function addTask(title: string) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Cannot add a task without a logged-in user.');
  }

  const { error } = await supabase.from('tasks').insert({ user_id: user.id, title });
  checkError(error);
}

export async function getTasks() {
  const { data, error } = await supabase.from('tasks').select('*').order('created_at', {
    ascending: false,
  });
  checkError(error);
  return data ?? [];
}

export async function getTaskCount() {
  const { count, error } = await supabase.from('tasks').select('*', { count: 'exact', head: true });
  checkError(error);
  return count ?? 0;
}

export async function addEventHabit(input: EventHabitInput) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Cannot add an event or habit without a logged-in user.');
  }

  const { error } = await supabase.from('events_habits').insert({ ...input, user_id: user.id });
  checkError(error);
}

export async function updateEventHabit(id: number, input: EventHabitInput) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Cannot update an event or habit without a logged-in user.');
  }

  const { error } = await supabase
    .from('events_habits')
    .update(input)
    .eq('id', id)
    .eq('user_id', user.id);
  checkError(error);
}

export async function getEventHabits(): Promise<EventHabitRecord[]> {
  const user = await getCurrentUser();
  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from('events_habits')
    .select(
      'id, user_id, title, type, date, time, location, details, importance, recurrence, selected_days, day_times, created_at'
    )
    .order('created_at', { ascending: false })
    .order('id', { ascending: false });
  checkError(error);
  return data ?? [];
}

export async function getProfile(): Promise<ProfileRecord | null> {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, username, display_name, about_me, avatar_uri')
    .eq('user_id', user.id)
    .maybeSingle();
  checkError(error);
  return (
    data ?? {
      user_id: user.id,
      username: user.username,
      display_name: '',
      about_me: '',
      avatar_uri: '',
    }
  );
}

export async function searchProfiles(searchTerm: string): Promise<SearchableProfileRecord[]> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Cannot search profiles without a logged-in user.');
  }

  const query = searchTerm.trim();
  if (query.length < 2) {
    return [];
  }

  const { data, error } = await supabase.rpc('search_profiles', { search_term: query });
  checkError(error);
  return data ?? [];
}

export async function getFriends(): Promise<FriendRecord[]> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Cannot load friends without a logged-in user.');
  }

  const { data, error } = await supabase.rpc('get_friends');
  checkError(error);
  return data ?? [];
}

export async function sendFriendRequest(userId: string) {
  const { error } = await supabase.rpc('send_friend_request', { target_user_id: userId });
  checkError(error);
}

export async function respondToFriendRequest(requestId: string, accept: boolean) {
  const { error } = await supabase.rpc('respond_to_friend_request', {
    request_id: requestId,
    accept_request: accept,
  });
  checkError(error);
}

export async function removeFriend(userId: string) {
  const { error } = await supabase.rpc('remove_friend', { friend_user_id: userId });
  checkError(error);
}

export async function getFriendNotifications(): Promise<FriendNotification[]> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Cannot load notifications without a logged-in user.');
  }

  const { data, error } = await supabase.rpc('get_friend_notifications');
  checkError(error);
  return data ?? [];
}

export async function saveProfile(input: ProfileInput) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Cannot save a profile without a logged-in user.');
  }

  const { error } = await supabase.from('profiles').upsert(
    {
      user_id: user.id,
      username: user.username,
      ...input,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );
  checkError(error);
}
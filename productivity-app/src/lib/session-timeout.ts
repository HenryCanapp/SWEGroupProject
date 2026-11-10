import { authStorage, supabase } from './supabase';

const BACKGROUNDED_AT_KEY = 'productivity_app_backgrounded_at';
const SESSION_BACKGROUND_TIMEOUT_MS = 5 * 60 * 1000;

export async function markAppBackgrounded() {
  await authStorage.setItem(BACKGROUNDED_AT_KEY, String(Date.now()));
}

export async function clearBackgroundedAt() {
  await authStorage.removeItem(BACKGROUNDED_AT_KEY);
}

export async function expireBackgroundedSession() {
  const timestampText = await authStorage.getItem(BACKGROUNDED_AT_KEY);
  if (timestampText === null) {
    return false;
  }

  const backgroundedAt = Number(timestampText);
  if (!Number.isFinite(backgroundedAt)) {
    await clearBackgroundedAt();
    return false;
  }

  if (Date.now() - backgroundedAt < SESSION_BACKGROUND_TIMEOUT_MS) {
    await clearBackgroundedAt();
    return false;
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw new Error(error.message);
  }
  if (!data.session) {
    await clearBackgroundedAt();
    return false;
  }

  const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
  if (signOutError) {
    throw new Error(signOutError.message);
  }
  await clearBackgroundedAt();
  return true;
}
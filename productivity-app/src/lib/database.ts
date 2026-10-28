import { Platform } from 'react-native';

import * as NativeDb from './database.native';
import * as WebDb from './database.web';

const isWebPlatform = Platform.OS === 'web';

export type TaskRecord = NativeDb.TaskRecord;
export type UserRecord = NativeDb.UserRecord;
export type EventHabitType = NativeDb.EventHabitType;
export type EventHabitRecord = NativeDb.EventHabitRecord;
export type EventHabitInput = NativeDb.EventHabitInput;
export type CurrentUser = NativeDb.CurrentUser;
export type ProfileRecord = NativeDb.ProfileRecord;
export type ProfileInput = NativeDb.ProfileInput;

const selectedDb = isWebPlatform ? WebDb : NativeDb;

export const initializeDatabase = selectedDb.initializeDatabase;
export const createUser = selectedDb.createUser;
export const validateUser = selectedDb.validateUser;
export const loginUser = selectedDb.loginUser;
export const logoutUser = selectedDb.logoutUser;
export const isUserLoggedIn = selectedDb.isUserLoggedIn;
export const addTask = selectedDb.addTask;
export const getTasks = selectedDb.getTasks;
export const getTaskCount = selectedDb.getTaskCount;
export const addEventHabit = selectedDb.addEventHabit;
export const updateEventHabit = selectedDb.updateEventHabit;
export const getEventHabits = selectedDb.getEventHabits;
export const getCurrentUser = selectedDb.getCurrentUser;
export const getProfile = selectedDb.getProfile;
export const saveProfile = selectedDb.saveProfile;

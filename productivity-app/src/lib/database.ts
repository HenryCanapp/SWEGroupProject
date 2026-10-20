import { Platform } from 'react-native';

import * as NativeDb from './database.native';
import * as WebDb from './database.web';

const isWebPlatform = Platform.OS === 'web';

export type TaskRecord = NativeDb.TaskRecord;
export type UserRecord = NativeDb.UserRecord;

const selectedDb = isWebPlatform ? WebDb : NativeDb;

export const initializeDatabase = selectedDb.initializeDatabase;
export const validateUser = selectedDb.validateUser;
export const loginUser = selectedDb.loginUser;
export const logoutUser = selectedDb.logoutUser;
export const isUserLoggedIn = selectedDb.isUserLoggedIn;
export const addTask = selectedDb.addTask;
export const getTasks = selectedDb.getTasks;
export const getTaskCount = selectedDb.getTaskCount;

import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MfaChannel, PhotoType } from '../lib/api/types';

export type AuthStackParamList = {
  Login: undefined;
  Otp: { mfaToken: string; channel: MfaChannel };
};

export type AuthStackScreenProps<T extends keyof AuthStackParamList> = NativeStackScreenProps<
  AuthStackParamList,
  T
>;

export type TaskStackParamList = {
  TaskList: undefined;
  TaskDetail: { taskId: string };
  PhotoCapture: { taskId: string; type: PhotoType };
  Signature: { taskId: string };
};

export type AppTabsParamList = {
  Tasks: NavigatorScreenParams<TaskStackParamList> | undefined;
  Notifications: undefined;
  Profile: undefined;
};

export type TaskStackScreenProps<T extends keyof TaskStackParamList> = NativeStackScreenProps<
  TaskStackParamList,
  T
>;

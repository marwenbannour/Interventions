import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
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
  TaskFilters: undefined;
  PhotoCapture: { taskId: string; type: PhotoType };
  Signature: { taskId: string };
};

export type ProfileStackParamList = {
  ProfileHome: undefined;
  Settings: undefined;
  ChangePassword: undefined;
  AgentInfo: undefined;
};

export type AppTabsParamList = {
  Home: undefined;
  Tasks: NavigatorScreenParams<TaskStackParamList> | undefined;
  Map: { focusTaskId?: string } | undefined;
  Notifications: undefined;
  Profile: NavigatorScreenParams<ProfileStackParamList> | undefined;
};

export type AppTabScreenProps<T extends keyof AppTabsParamList> = BottomTabScreenProps<AppTabsParamList, T>;

export type TaskStackScreenProps<T extends keyof TaskStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<TaskStackParamList, T>,
  BottomTabScreenProps<AppTabsParamList>
>;

export type ProfileStackScreenProps<T extends keyof ProfileStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<ProfileStackParamList, T>,
  BottomTabScreenProps<AppTabsParamList>
>;

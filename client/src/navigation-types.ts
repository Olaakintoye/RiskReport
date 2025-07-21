import { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Main: undefined;
  Auth: undefined;
  Dashboard: undefined;
  Rank: undefined;
  Explore: undefined;
  Account: undefined;
  Feed: undefined;
  Upload: undefined;
  UploadVideo: undefined;
  NotFound: undefined;
  UserProfile: { userId: string };
  FollowersList: { userId: string };
  FollowingList: { userId: string };
  Var: undefined;
};

export type ScreenProps<T extends keyof RootStackParamList> = 
  NativeStackScreenProps<RootStackParamList, T>;

export interface ProtectedScreenProps {
  component: React.ComponentType<any>;
  [key: string]: any;
}

export interface AuthContextType {
  user: any | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
} 
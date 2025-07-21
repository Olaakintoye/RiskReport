declare module 'expo-status-bar' {
  import { Component } from 'react';
  import { StatusBarStyle } from 'react-native';

  export interface StatusBarProps {
    style?: StatusBarStyle;
    animated?: boolean;
    hidden?: boolean;
    networkActivityIndicatorVisible?: boolean;
    showHideTransition?: 'fade' | 'slide';
    backgroundColor?: string;
    translucent?: boolean;
  }

  export default class StatusBar extends Component<StatusBarProps> {
    static setBackgroundColor: (color: string, animated?: boolean) => void;
    static setBarStyle: (style: StatusBarStyle, animated?: boolean) => void;
    static setHidden: (hidden: boolean, animation?: 'fade' | 'slide' | 'none') => void;
    static setNetworkActivityIndicatorVisible: (visible: boolean) => void;
    static setTranslucent: (translucent: boolean) => void;
  }
}

declare module 'expo' {
  export * from 'expo-status-bar';
} 
declare module 'expo-haptics' {
  export enum ImpactFeedbackStyle {
    Light = 0,
    Medium = 1,
    Heavy = 2,
  }

  export enum NotificationFeedbackType {
    Success = 0,
    Warning = 1,
    Error = 2,
  }

  export function impactAsync(style: ImpactFeedbackStyle): Promise<void>;
  export function notificationAsync(type: NotificationFeedbackType): Promise<void>;
  export function selectionAsync(): Promise<void>;
}

declare module 'expo-blur' {
  import { ViewProps } from 'react-native';
  import React from 'react';

  export type BlurTint = 'light' | 'dark' | 'default';
  
  export interface BlurViewProps extends ViewProps {
    tint?: BlurTint;
    intensity?: number;
  }
  
  export class BlurView extends React.Component<BlurViewProps> {}
}

declare module 'react-native-chart-kit' {
  import { ViewProps } from 'react-native';
  import React from 'react';

  export interface AbstractChartProps {
    width: number;
    height: number;
    backgroundGradientFrom?: string;
    backgroundGradientTo?: string;
    backgroundGradientFromOpacity?: number;
    backgroundGradientToOpacity?: number;
    fillShadowGradient?: string;
    fillShadowGradientOpacity?: number;
    labels?: string[];
    padding?: number;
    paddingRight?: number;
    paddingTop?: number;
    paddingBottom?: number;
    data?: any;
    chartConfig?: ChartConfig;
    style?: any;
    bezier?: boolean;
    xLabelsOffset?: number;
    yLabelsOffset?: number;
    segments?: number;
    legend?: string[];
    decorator?: Function;
    fromZero?: boolean;
    withInnerLines?: boolean;
    withOuterLines?: boolean;
    formatYLabel?: (yLabel: string) => string;
    formatXLabel?: (xLabel: string) => string;
    withHorizontalLines?: boolean;
    withVerticalLines?: boolean;
    withDots?: boolean;
    withScrollableDot?: boolean;
    showBarTops?: boolean;
    yAxisLabel?: string;
    yAxisSuffix?: string;
    yAxisInterval?: number;
  }

  export interface LineChartProps extends AbstractChartProps {
    withShadow?: boolean;
    withDots?: boolean;
    withInnerLines?: boolean;
    withOuterLines?: boolean;
    withVerticalLabels?: boolean;
    withHorizontalLabels?: boolean;
    renderDotContent?: (params: { x: number; y: number; indexData: any; index: number }) => React.ReactNode;
  }

  export interface BarChartProps extends AbstractChartProps {
    withInnerLines?: boolean;
    showBarTops?: boolean;
    showValuesOnTopOfBars?: boolean;
    withHorizontalLabels?: boolean;
    withVerticalLabels?: boolean;
  }

  export interface PieChartProps {
    data: Array<{
      name: string;
      value: number;
      color: string;
      legendFontColor?: string;
      legendFontSize?: number;
    }>;
    width: number;
    height: number;
    accessor: string;
    backgroundColor?: string;
    paddingLeft?: string;
    absolute?: boolean;
    hasLegend?: boolean;
    style?: any;
    chartConfig?: ChartConfig;
  }

  export interface ChartConfig {
    backgroundGradientFrom?: string;
    backgroundGradientTo?: string;
    backgroundGradientFromOpacity?: number;
    backgroundGradientToOpacity?: number;
    color?: (opacity?: number) => string;
    strokeWidth?: number;
    barPercentage?: number;
    decimalPlaces?: number;
    style?: any;
    propsForDots?: any;
    propsForBackgroundLines?: any;
    propsForLabels?: any;
  }

  export class LineChart extends React.Component<LineChartProps> {}
  export class BarChart extends React.Component<BarChartProps> {}
  export class PieChart extends React.Component<PieChartProps> {}
} 
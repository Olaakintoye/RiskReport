import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface HistoricalEvent {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  impact: number;
}

interface HistoricalOverlay {
  event: HistoricalEvent;
  visible: boolean;
}

interface ScenarioImpactChartProps {
  scenarioImpact: number;
  scenarioName: string;
  historicalOverlays: HistoricalOverlay[];
  showOverlays: boolean;
  onToggleOverlaysVisibility: () => void;
  onConfigureOverlays: () => void;
}

const ScenarioImpactChart: React.FC<ScenarioImpactChartProps> = ({
  scenarioImpact,
  scenarioName,
  historicalOverlays,
  showOverlays,
  onToggleOverlaysVisibility,
  onConfigureOverlays
}) => {
  const [chartData, setChartData] = useState<any>(null);
  const screenWidth = Dimensions.get('window').width;
  
  useEffect(() => {
    generateChartData();
  }, [scenarioImpact, historicalOverlays, showOverlays]);

  const generateChartData = () => {
    // Generate a realistic market scenario timeline (30 days)
    const labels = [];
    const scenarioData = [];
    const baseValue = 0; // Start at 0% for better comparison
    
    // Create timeline labels - show fewer labels for cleaner look
    for (let i = 29; i >= 0; i--) {
      if (i === 0) {
        labels.push('Today');
      } else if (i === 29) {
        labels.push('Start');
      } else if (i % 7 === 0) { // Show weekly markers
        labels.push(`W${Math.floor(i/7)}`);
      } else {
        labels.push(''); // Empty label for cleaner x-axis
      }
    }
    
    // Generate scenario impact curve
    for (let i = 0; i < 30; i++) {
      if (i < 15) {
        // Normal market movement before shock (small random variations)
        scenarioData.push(baseValue + (Math.random() - 0.5) * 1);
      } else {
        // Apply scenario impact gradually over time
        const impactProgress = (i - 15) / 14; // Progress from day 15 to 29
        const smoothedProgress = Math.sin(impactProgress * Math.PI / 2); // Smooth curve
        const currentImpact = scenarioImpact * smoothedProgress;
        scenarioData.push(baseValue + currentImpact + (Math.random() - 0.5) * 0.5);
      }
    }

    // Prepare datasets
    const datasets = [
      {
        data: scenarioData,
        color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
        strokeWidth: 3,
        withDots: true,
      }
    ];

    // Add zero baseline for reference if scenario has significant impact
    if (Math.abs(scenarioImpact) > 5) {
      const zeroLine = Array(30).fill(0);
      datasets.push({
        data: zeroLine,
        color: (opacity = 1) => `rgba(100, 116, 139, ${opacity * 0.4})`,
        strokeWidth: 1,
        withDots: false,
        strokeDashArray: [3, 3],
      });
    }

    // Add historical overlay lines if visible
    if (showOverlays) {
      historicalOverlays
        .filter(overlay => overlay.visible)
        .forEach((overlay, index) => {
          // Create a horizontal reference line for each historical event
          const historicalLine = Array(30).fill(overlay.event.impact);
          
          datasets.push({
            data: historicalLine,
            color: (opacity = 1) => {
              const colors = [
                `rgba(239, 68, 68, ${opacity * 0.8})`,    // Red - GFC
                `rgba(249, 115, 22, ${opacity * 0.8})`,   // Orange - COVID
                `rgba(168, 85, 247, ${opacity * 0.8})`,   // Purple - Dot-com
                `rgba(34, 197, 94, ${opacity * 0.8})`,    // Green - Black Monday
                `rgba(236, 72, 153, ${opacity * 0.8})`,   // Pink - Volmageddon
              ];
              return colors[index % colors.length];
            },
            strokeWidth: 2.5,
            withDots: false,
            strokeDashArray: [8, 4], // More prominent dashed line
          });
        });
    }

    setChartData({
      labels,
      datasets,
      legend: [
        scenarioName,
        ...(showOverlays ? historicalOverlays
          .filter(overlay => overlay.visible)
          .map(overlay => overlay.event.name) : [])
      ]
    });
  };

  const getActiveOverlaysCount = () => {
    return historicalOverlays.filter(overlay => overlay.visible).length;
  };

  if (!chartData) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Generating chart...</Text>
      </View>
    );
  }

  const chartConfig = {
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(71, 85, 105, ${opacity})`,
    style: {
      borderRadius: 8,
      paddingRight: 25,
      paddingLeft: 8,
      paddingTop: 10,
      paddingBottom: 10,
    },
    propsForDots: {
      r: '3',
      strokeWidth: 2,
      stroke: '#ffffff',
    },
    propsForBackgroundLines: {
      strokeWidth: 1,
      stroke: '#e2e8f0',
    },
    formatYLabel: (value) => {
      const num = parseFloat(value);
      if (Math.abs(num) < 0.1) return '0%';
      return `${num > 0 ? '+' : ''}${num.toFixed(1)}%`;
    },
    formatXLabel: (value) => value === '' ? '' : value,
    yAxisSuffix: '',
    yAxisInterval: 1,
    xAxisInterval: 1,
    useShadowColorFromDataset: false,
    fillShadowGradient: '#ffffff',
    fillShadowGradientOpacity: 0,
  };

  return (
    <View style={styles.container}>
      {/* Chart Header */}
      <View style={styles.chartHeader}>
        <View style={styles.titleContainer}>
          <Text style={styles.chartTitle}>Scenario Impact Timeline</Text>
          <Text style={styles.chartSubtitle}>
            Market movement comparison with historical events
          </Text>
        </View>
        
        <View style={styles.headerButtonsContainer}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={onConfigureOverlays}
          >
            <MaterialCommunityIcons 
              name="cog-outline" 
              size={20} 
              color="#64748b" 
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.iconButton,
              showOverlays && styles.iconButtonActive
            ]}
            onPress={onToggleOverlaysVisibility}
          >
            <MaterialCommunityIcons 
              name={showOverlays ? "eye" : "eye-off"} 
              size={20} 
              color={showOverlays ? "#3b82f6" : "#64748b"} 
            />
            {getActiveOverlaysCount() > 0 && (
              <View style={styles.overlayCountBadge}>
                <Text style={styles.overlayCountText}>{getActiveOverlaysCount()}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Chart */}
      <View style={styles.chartContainer}>
        {/* Y-Axis Label */}
        <View style={styles.yAxisLabelContainer}>
          <Text style={styles.yAxisLabel}>Portfolio Impact (%)</Text>
        </View>
        
        <View style={styles.chartWrapper}>
          <LineChart
            data={chartData}
            width={screenWidth - 90} // Reduced for better space utilization
            height={250}
            chartConfig={chartConfig}
            bezier={false}
            style={styles.chart}
            withInnerLines={true}
            withOuterLines={true}
            withVerticalLines={false}
            withHorizontalLines={true}
            withShadow={false}
            segments={4}
            yAxisSuffix=""
            fromZero={false}
            yLabelsOffset={12}
            xLabelsOffset={8}
          />
        </View>
        
        {/* X-Axis Label */}
        <View style={styles.xAxisLabelContainer}>
          <Text style={styles.xAxisLabel}>Timeline (Days)</Text>
        </View>

        {/* Chart Legend */}
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendLine, { backgroundColor: '#3b82f6' }]} />
            <Text style={styles.legendText}>Scenario Impact</Text>
          </View>
          
          {Math.abs(scenarioImpact) > 5 && (
            <View style={styles.legendItem}>
              <View style={[styles.legendLine, styles.legendLineDashed, { backgroundColor: '#64748b' }]} />
              <Text style={styles.legendText}>Baseline (0%)</Text>
            </View>
          )}
          
          {showOverlays && getActiveOverlaysCount() > 0 && (
            <View style={styles.legendItem}>
              <View style={[styles.legendLine, styles.legendLineDashed, { backgroundColor: '#ef4444' }]} />
              <Text style={styles.legendText}>Historical Events</Text>
            </View>
          )}
        </View>
      </View>

      {/* Active Overlays Indicator */}
      {showOverlays && getActiveOverlaysCount() > 0 && (
        <View style={styles.activeOverlaysContainer}>
          <Text style={styles.activeOverlaysTitle}>Active Historical Overlays:</Text>
          {historicalOverlays
            .filter(overlay => overlay.visible)
            .map((overlay, index) => (
              <View key={overlay.event.id} style={styles.activeOverlayItem}>
                <View style={[
                  styles.overlayColorDot,
                  { backgroundColor: getOverlayColor(index) }
                ]} />
                <Text style={styles.activeOverlayText}>
                  {overlay.event.name} ({overlay.event.impact > 0 ? '+' : ''}{overlay.event.impact.toFixed(1)}%)
                </Text>
              </View>
            ))}
        </View>
      )}
    </View>
  );
};

const getOverlayColor = (index: number) => {
  const colors = [
    '#ef4444',  // Red
    '#f97316',  // Orange  
    '#a855f7',  // Purple
    '#22c55e',  // Green
    '#ec4899',  // Pink
  ];
  return colors[index % colors.length];
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  loadingContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleContainer: {
    flex: 1,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  chartSubtitle: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  headerButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  iconButtonActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
  },
  overlayCountBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  overlayCountText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '600',
    lineHeight: 12,
  },
  chartContainer: {
    marginVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  yAxisLabelContainer: {
    position: 'absolute',
    left: 8,
    top: '50%',
    zIndex: 1,
    transform: [{ rotate: '-90deg' }],
  },
  yAxisLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
  },
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 25,
    paddingRight: 15,
  },
  chart: {
    borderRadius: 8,
    marginVertical: 8,
  },
  xAxisLabelContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  xAxisLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 20,
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  legendLine: {
    width: 14,
    height: 3,
    borderRadius: 1.5,
    marginRight: 5,
  },
  legendLineDashed: {
    borderWidth: 1,
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  legendText: {
    fontSize: 10,
    color: '#475569',
    fontWeight: '600',
  },
  activeOverlaysContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  activeOverlaysTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  activeOverlayItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  overlayColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  activeOverlayText: {
    fontSize: 13,
    color: '#64748b',
  },
});

export default ScenarioImpactChart;

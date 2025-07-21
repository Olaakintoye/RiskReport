import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useScenarioDisplayName } from '../../hooks/useDisplayNames';

// ==========================================
// TYPES
// ==========================================

interface ScenarioListItemProps {
  scenarioId: string;
  onPress: (scenarioId: string) => void;
  showId?: boolean;
  severity?: 'low' | 'moderate' | 'severe' | 'extreme';
  category?: string;
  lastRun?: string;
  style?: any;
}

// ==========================================
// COMPONENT
// ==========================================

const ScenarioListItem: React.FC<ScenarioListItemProps> = ({
  scenarioId,
  onPress,
  showId = false,
  severity = 'moderate',
  category = 'general',
  lastRun,
  style
}) => {
  const { name: scenarioName, loading } = useScenarioDisplayName(scenarioId);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return '#22c55e';
      case 'moderate': return '#f59e0b';
      case 'severe': return '#ef4444';
      case 'extreme': return '#dc2626';
      default: return '#6b7280';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'low': return 'information';
      case 'moderate': return 'alert';
      case 'severe': return 'alert-circle';
      case 'extreme': return 'alert-octagon';
      default: return 'help-circle';
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={() => onPress(scenarioId)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons
            name={getSeverityIcon(severity)}
            size={20}
            color={getSeverityColor(severity)}
          />
        </View>
        <View style={styles.nameContainer}>
          <Text style={styles.scenarioName}>
            {loading ? 'Loading...' : scenarioName}
          </Text>
          {showId && (
            <Text style={styles.scenarioId}>ID: {scenarioId}</Text>
          )}
        </View>
        <View style={styles.severityBadge}>
          <Text style={[styles.severityText, { color: getSeverityColor(severity) }]}>
            {severity.toUpperCase()}
          </Text>
        </View>
      </View>
      
      <View style={styles.details}>
        <View style={styles.categoryContainer}>
          <Text style={styles.categoryText}>{category}</Text>
        </View>
        {lastRun && (
          <Text style={styles.lastRunText}>
            Last run: {lastRun}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

// ==========================================
// STYLES
// ==========================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  nameContainer: {
    flex: 1,
  },
  scenarioName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  scenarioId: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: 'monospace',
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },
  severityText: {
    fontSize: 10,
    fontWeight: '600',
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
  },
  categoryText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  lastRunText: {
    fontSize: 12,
    color: '#6b7280',
  },
});

export default ScenarioListItem; 
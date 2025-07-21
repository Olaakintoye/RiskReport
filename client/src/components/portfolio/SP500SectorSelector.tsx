import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity
} from 'react-native';

interface SP500SectorSelectorProps {
  sectors: string[];
  selectedSector: string | null;
  onSelectSector: (sector: string) => void;
}

const SP500SectorSelector: React.FC<SP500SectorSelectorProps> = ({
  sectors,
  selectedSector,
  onSelectSector
}) => {
  // Get sector color based on name
  const getSectorColor = (sector: string): string => {
    const sectorColors: Record<string, string> = {
      'Information Technology': '#3b82f6', // blue
      'Health Care': '#10b981', // green
      'Consumer Discretionary': '#f59e0b', // amber
      'Financials': '#8b5cf6', // purple
      'Communication Services': '#ef4444', // red
      'Industrials': '#6b7280', // gray
      'Consumer Staples': '#14b8a6', // teal
      'Energy': '#f97316', // orange
      'Real Estate': '#4f46e5', // indigo
      'Materials': '#0ea5e9', // sky blue
      'Utilities': '#64748b', // slate
    };
    
    return sectorColors[sector] || '#6b7280'; // default gray
  };
  
  // Get background opacity based on selection state
  const getBackgroundColor = (sector: string): string => {
    const baseColor = getSectorColor(sector);
    if (selectedSector === sector) {
      return baseColor;
    }
    return 'transparent';
  };
  
  // Get text color based on selection state
  const getTextColor = (sector: string): string => {
    if (selectedSector === sector) {
      return '#ffffff';
    }
    return getSectorColor(sector);
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Sectors</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sectorsContainer}
      >
        {sectors.map((sector) => (
          <TouchableOpacity
            key={sector}
            style={[
              styles.sectorButton,
              { backgroundColor: getBackgroundColor(sector) },
              { borderColor: getSectorColor(sector) }
            ]}
            onPress={() => onSelectSector(sector)}
          >
            <Text 
              style={[
                styles.sectorButtonText,
                { color: getTextColor(sector) }
              ]}
            >
              {sector}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  sectorsContainer: {
    paddingBottom: 8,
  },
  sectorButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  sectorButtonText: {
    fontWeight: '500',
    fontSize: 14,
  }
});

export default SP500SectorSelector; 
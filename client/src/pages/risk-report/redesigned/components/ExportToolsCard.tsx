import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface ExportToolsCardProps {
  portfolioId: string;
  reportType: string;
  titlePrefix: string;
}

const ExportToolsCard: React.FC<ExportToolsCardProps> = ({
  portfolioId,
  reportType,
  titlePrefix
}) => {
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [generatingCsv, setGeneratingCsv] = useState(false);
  
  const handleExportPdf = async () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    setGeneratingPdf(true);
    
    try {
      // Mock PDF generation
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock successful PDF generation
      const fileName = `${titlePrefix.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      Alert.alert(
        'PDF Generated',
        `The PDF report "${fileName}" has been saved to your downloads folder.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error generating PDF:', error);
      
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      
      Alert.alert(
        'Export Failed',
        'There was an error generating the PDF report. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setGeneratingPdf(false);
    }
  };
  
  const handleExportCsv = async () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    setGeneratingCsv(true);
    
    try {
      // Mock CSV generation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock successful CSV generation
      const fileName = `${titlePrefix.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
      
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      Alert.alert(
        'CSV Generated',
        `The CSV data "${fileName}" has been saved to your downloads folder.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error generating CSV:', error);
      
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      
      Alert.alert(
        'Export Failed',
        'There was an error generating the CSV data. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setGeneratingCsv(false);
    }
  };
  
  const handleShare = async () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    try {
      const title = `${titlePrefix} - ${new Date().toLocaleDateString()}`;
      const message = `Check out my ${reportType} for portfolio #${portfolioId}. Generated on ${new Date().toLocaleString()}.`;
      
      await Share.share({
        title,
        message
      });
    } catch (error) {
      console.error('Error sharing report:', error);
      
      Alert.alert(
        'Share Failed',
        'There was an error sharing the report. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Export & Share</Text>
      
      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={styles.exportButton}
          onPress={handleExportPdf}
          disabled={generatingPdf}
        >
          {generatingPdf ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <>
              <Ionicons name="document-text-outline" size={24} color="#007AFF" />
              <Text style={styles.exportButtonText}>Export PDF</Text>
            </>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.exportButton}
          onPress={handleExportCsv}
          disabled={generatingCsv}
        >
          {generatingCsv ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <>
              <Ionicons name="document-outline" size={24} color="#007AFF" />
              <Text style={styles.exportButtonText}>Export CSV</Text>
            </>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.exportButton}
          onPress={handleShare}
        >
          <Ionicons name="share-outline" size={24} color="#007AFF" />
          <Text style={styles.exportButtonText}>Share</Text>
        </TouchableOpacity>
      </View>
      
      <Text style={styles.infoText}>
        Export your risk report as a PDF document or CSV data file, or share it directly with colleagues.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginVertical: 12,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  exportButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  exportButtonText: {
    marginTop: 8,
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  infoText: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default ExportToolsCard; 
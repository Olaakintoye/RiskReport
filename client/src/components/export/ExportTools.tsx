import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator, Alert } from 'react-native';
import { Card } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as DocumentPicker from 'expo-document-picker';

interface ExportToolsProps {
  portfolioId?: string;
  reportType?: 'risk-report' | 'portfolio' | 'scenario' | 'all';
  customData?: any;
  titlePrefix?: string;
}

const ExportTools: React.FC<ExportToolsProps> = ({ 
  portfolioId, 
  reportType = 'risk-report',
  customData,
  titlePrefix = 'Risk Report'
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  const handleExportPDF = async () => {
    try {
      setIsLoading(true);
      setLoadingMessage('Generating PDF...');
      
      // Generate PDF content based on reportType
      const html = generatePDFContent(reportType, customData);
      
      // Generate the PDF file
      const { uri } = await Print.printToFileAsync({ 
        html,
        base64: false,
      });
      
      // Get the filename from the report type
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${titlePrefix.replace(/\s+/g, '_')}_${timestamp}.pdf`;
      
      // Create a new file with a more user-friendly name
      const newUri = FileSystem.documentDirectory + filename;
      await FileSystem.moveAsync({
        from: uri,
        to: newUri
      });
      
      // Share the file
      setLoadingMessage('Opening share dialog...');
      await Sharing.shareAsync(newUri);
      
      setIsLoading(false);
      setModalVisible(false);
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Export Error', 'Failed to generate PDF. Please try again.');
      setIsLoading(false);
      setModalVisible(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setIsLoading(true);
      setLoadingMessage('Generating Excel file...');
      
      // Generate CSV content based on reportType
      const csvContent = generateCSVContent(reportType, customData);
      
      // Get the filename from the report type
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${titlePrefix.replace(/\s+/g, '_')}_${timestamp}.csv`;
      
      // Create the file
      const fileUri = FileSystem.documentDirectory + filename;
      await FileSystem.writeAsStringAsync(fileUri, csvContent);
      
      // Share the file
      setLoadingMessage('Opening share dialog...');
      await Sharing.shareAsync(fileUri);
      
      setIsLoading(false);
      setModalVisible(false);
    } catch (error) {
      console.error('Error generating Excel file:', error);
      Alert.alert('Export Error', 'Failed to generate Excel file. Please try again.');
      setIsLoading(false);
      setModalVisible(false);
    }
  };

  const generatePDFContent = (type: string, data?: any): string => {
    // In a real app, this would generate proper HTML based on the actual data
    // For this example, we'll create a simple template
    
    const reportTitle = `${titlePrefix} - ${formatReportTypeForDisplay(type)}`;
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${reportTitle}</title>
          <style>
            body {
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
              padding: 20px;
              color: #334155;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 10px;
            }
            .logo {
              font-size: 24px;
              font-weight: bold;
              color: #10b981;
              margin-bottom: 5px;
            }
            .title {
              font-size: 20px;
              font-weight: bold;
            }
            .subtitle {
              font-size: 16px;
              color: #64748b;
              margin-bottom: 5px;
            }
            .date {
              font-size: 14px;
              color: #94a3b8;
            }
            .section {
              margin-bottom: 25px;
            }
            .section-title {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 10px;
              border-bottom: 1px solid #f1f5f9;
              padding-bottom: 5px;
            }
            .metric-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px solid #f8fafc;
            }
            .metric-label {
              font-weight: 500;
            }
            .metric-value {
              font-weight: bold;
            }
            .positive {
              color: #10b981;
            }
            .negative {
              color: #ef4444;
            }
            .footer {
              margin-top: 40px;
              text-align: center;
              font-size: 12px;
              color: #94a3b8;
            }
            .disclaimer {
              margin-top: 10px;
              font-size: 10px;
              color: #94a3b8;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">Risk Report App</div>
            <div class="title">${reportTitle}</div>
            <div class="subtitle">Generated Report</div>
            <div class="date">Date: ${new Date().toLocaleDateString()}</div>
          </div>
          
          <div class="section">
            <div class="section-title">Summary</div>
            <div class="metric-row">
              <span class="metric-label">Total Portfolio Value:</span>
              <span class="metric-value">$3,245,678.00</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">Value at Risk (95%):</span>
              <span class="metric-value">$162,283.90 (5.00%)</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">Portfolio Annualised Volatility:</span>
              <span class="metric-value">12.45%</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">Sharpe Ratio:</span>
              <span class="metric-value">1.32</span>
            </div>
          </div>
          
          <div class="section">
            <div class="section-title">Asset Allocation</div>
            <div class="metric-row">
              <span class="metric-label">Equities:</span>
              <span class="metric-value">65.4%</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">Fixed Income:</span>
              <span class="metric-value">25.2%</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">Alternatives:</span>
              <span class="metric-value">6.3%</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">Cash:</span>
              <span class="metric-value">3.1%</span>
            </div>
          </div>
          
          <div class="section">
            <div class="section-title">Risk Metrics</div>
            <div class="metric-row">
              <span class="metric-label">Beta:</span>
              <span class="metric-value">0.85</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">Alpha (YTD):</span>
              <span class="metric-value positive">+2.36%</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">Maximum Drawdown:</span>
              <span class="metric-value negative">-12.42%</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">Information Ratio:</span>
              <span class="metric-value">1.05</span>
            </div>
          </div>
          
          <div class="footer">
            <p>© ${new Date().getFullYear()} Risk Report App. All rights reserved.</p>
            <p class="disclaimer">This report is for informational purposes only and does not constitute investment advice. Past performance is not indicative of future results.</p>
          </div>
        </body>
      </html>
    `;
  };

  const generateCSVContent = (type: string, data?: any): string => {
    // In a real app, this would generate CSV based on the actual data
    // For this example, we'll create sample data
    
    let csvContent = '';
    
    // Add header
    csvContent += `${titlePrefix} - ${formatReportTypeForDisplay(type)}\n`;
    csvContent += `Generated: ${new Date().toLocaleDateString()}\n\n`;
    
    // Add data based on report type
    if (type === 'risk-report' || type === 'all') {
      csvContent += 'Risk Metrics\n';
      csvContent += 'Metric,Value,Benchmark,Difference\n';
      csvContent += 'Value at Risk (95%),5.00%,4.75%,+0.25%\n';
      csvContent += 'Expected Shortfall,6.35%,6.10%,+0.25%\n';
      csvContent += 'Volatility,12.45%,11.98%,+0.47%\n';
      csvContent += 'Sharpe Ratio,1.32,1.25,+0.07\n';
      csvContent += 'Beta,0.85,1.00,-0.15\n';
      csvContent += 'Maximum Drawdown,-12.42%,-14.35%,+1.93%\n\n';
    }
    
    if (type === 'portfolio' || type === 'all') {
      csvContent += 'Asset Allocation\n';
      csvContent += 'Asset Class,Allocation,Target,Difference\n';
      csvContent += 'Equities,65.4%,65.0%,+0.4%\n';
      csvContent += 'Fixed Income,25.2%,25.0%,+0.2%\n';
      csvContent += 'Alternatives,6.3%,7.0%,-0.7%\n';
      csvContent += 'Cash,3.1%,3.0%,+0.1%\n\n';
      
      csvContent += 'Top Holdings\n';
      csvContent += 'Symbol,Name,Weight,Value,Day Change\n';
      csvContent += 'AAPL,Apple Inc.,5.8%,"$188,249.32",+1.23%\n';
      csvContent += 'MSFT,Microsoft Corp,5.2%,"$168,775.26",+0.85%\n';
      csvContent += 'AMZN,Amazon.com Inc,4.6%,"$149,301.19",-0.42%\n';
      csvContent += 'GOOGL,Alphabet Inc Class A,4.1%,"$133,072.80",+0.31%\n';
      csvContent += 'BRK.B,Berkshire Hathaway Inc,3.5%,"$113,598.73",+0.12%\n\n';
    }
    
    if (type === 'scenario' || type === 'all') {
      csvContent += 'Scenario Analysis\n';
      csvContent += 'Scenario,Impact,VaR Change,Top Contributor\n';
      csvContent += 'Interest Rate +100bps,-3.42%,+1.25%,Fixed Income\n';
      csvContent += 'Equity Market -20%,-12.56%,+4.85%,US Equities\n';
      csvContent += 'Credit Spread Widening,-5.23%,+2.10%,Corporate Bonds\n';
      csvContent += 'Commodity Shock,+1.82%,-0.45%,Energy\n';
      csvContent += 'USD Strengthening,-2.15%,+0.75%,Int\'l Equities\n\n';
    }
    
    return csvContent;
  };

  const formatReportTypeForDisplay = (type: string): string => {
    switch(type) {
      case 'risk-report': return 'Risk Report';
      case 'portfolio': return 'Portfolio Analysis';
      case 'scenario': return 'Scenario Analysis';
      case 'all': return 'Comprehensive Report';
      default: return 'Custom Report';
    }
  };

  return (
    <>
      <Card style={styles.card}>
        <Card.Title 
          title="Export Reports" 
          subtitle="Export portfolio and risk data in various formats"
        />
        <Card.Content>
          <Text style={styles.description}>
            Generate detailed reports of your portfolio and risk data for presentations, record keeping, or further analysis.
          </Text>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.exportButton}
              onPress={() => setModalVisible(true)}
            >
              <MaterialCommunityIcons name="file-export" size={24} color="#10b981" />
              <Text style={styles.exportButtonText}>Export Options</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.featuresContainer}>
            <View style={styles.featureItem}>
              <MaterialCommunityIcons name="file-pdf-box" size={20} color="#ef4444" />
              <Text style={styles.featureText}>PDF Reports</Text>
            </View>
            <View style={styles.featureItem}>
              <MaterialCommunityIcons name="file-excel" size={20} color="#16a34a" />
              <Text style={styles.featureText}>Excel/CSV</Text>
            </View>
            <View style={styles.featureItem}>
              <MaterialCommunityIcons name="share-variant" size={20} color="#3b82f6" />
              <Text style={styles.featureText}>Share via Email</Text>
            </View>
          </View>
        </Card.Content>
      </Card>
      
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          if (!isLoading) {
            setModalVisible(false);
          }
        }}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#10b981" />
                <Text style={styles.loadingText}>{loadingMessage}</Text>
              </View>
            ) : (
              <>
                <Text style={styles.modalTitle}>Export Options</Text>
                <Text style={styles.modalSubtitle}>Choose a format to export your report</Text>
                
                <View style={styles.exportOptionsContainer}>
                  <TouchableOpacity 
                    style={styles.exportOptionButton}
                    onPress={handleExportPDF}
                  >
                    <MaterialCommunityIcons name="file-pdf-box" size={36} color="#ef4444" />
                    <Text style={styles.exportOptionText}>PDF Report</Text>
                    <Text style={styles.exportOptionDescription}>
                      Complete report with charts and analysis
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.exportOptionButton}
                    onPress={handleExportExcel}
                  >
                    <MaterialCommunityIcons name="file-excel" size={36} color="#16a34a" />
                    <Text style={styles.exportOptionText}>Excel/CSV</Text>
                    <Text style={styles.exportOptionDescription}>
                      Raw data export for further analysis
                    </Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.modalActions}>
                  <TouchableOpacity 
                    style={styles.cancelButton}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  description: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  buttonContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1fae5',
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#10b981',
    marginLeft: 8,
  },
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 4,
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '85%',
    padding: 24,
    alignItems: 'center',
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 24,
    textAlign: 'center',
  },
  exportOptionsContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  exportOptionButton: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    backgroundColor: '#f8fafc',
    width: '45%',
  },
  exportOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginTop: 12,
    marginBottom: 4,
  },
  exportOptionDescription: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  modalActions: {
    width: '100%',
    alignItems: 'center',
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#64748b',
  },
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 16,
  },
});

export default ExportTools; 
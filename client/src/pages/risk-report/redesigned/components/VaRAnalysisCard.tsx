import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
  ScrollView,
  Modal,
  ActivityIndicator,
  PanResponder,
  Animated,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VaRResults, VaRParams } from '../../../../services/riskService';

interface VaRAnalysisCardProps {
  parametricVaR: VaRResults | null;
  historicalVaR: VaRResults | null;
  monteCarloVaR: VaRResults | null;
  activeVarChart: string;
  setActiveVarChart: (method: string) => void;
  onViewMore?: () => void;
  detailed?: boolean;
  lastUpdated?: Date;
  lookbackPeriod?: number;
  apiUrl?: string;
  forceRefresh?: number;
  onRunAnalysis?: () => void;
  runningPythonAnalysis?: boolean;
}

const { width } = Dimensions.get('window');

// Use hardcoded chart descriptions instead of trying to load remote images
const CHART_DESCRIPTIONS = {
  parametric: 'Normal distribution curve with VaR threshold in red',
  historical: 'Historical returns histogram with loss scenarios in red',
  monteCarlo: 'Simulated price paths with gain/loss scenarios'
};

// Helper function to verify and calculate correct VAR dollar value if needed
const verifyVarValue = (percentage: number, value: number | undefined, portfolioValue: number): number => {
  // Always calculate the value directly from percentage and portfolio value
  // to ensure perfect consistency between percentage and dollar display
  return (percentage / 100) * portfolioValue;
};

const varExplanations = [
  {
    type: 'Parametric VaR',
    description: 'Assumes returns are normally distributed and uses the portfolio mean and standard deviation to estimate risk. Fast and widely used, but may underestimate risk in non-normal markets.'
  },
  {
    type: 'Historical VaR',
    description: 'Uses actual historical returns to estimate risk, capturing real market behavior and fat tails. No distributional assumptions, but limited by the historical window.'
  },
  {
    type: 'Monte Carlo VaR',
    description: 'Simulates thousands of possible future price paths using random sampling. Very flexible and can model complex risks, but computationally intensive.'
  }
];

// Define a type that matches the actual structure of the parameters in VaRResults
type AnalysisParamsType = {
  confidenceLevel?: string;
  timeHorizon?: number;
  lookbackPeriod?: number;
  varMethod?: string;
  distribution?: string;
  runTimestamp?: string;
  numSimulations?: number;
};

// Add a type for the parameters state
type AnalysisParametersStateType = {
  parametric: AnalysisParamsType | undefined;
  historical: AnalysisParamsType | undefined;
  montecarlo: AnalysisParamsType | undefined;
};

// Module-level variable to track if chart path error has been logged
let chartPathErrorLogged = false;

const VaRAnalysisCard: React.FC<VaRAnalysisCardProps> = ({
  parametricVaR,
  historicalVaR,
  monteCarloVaR,
  activeVarChart,
  setActiveVarChart,
  onViewMore,
  detailed = false,
  lastUpdated = new Date(),
  lookbackPeriod = 5,
  apiUrl = 'http://localhost:3000',
  forceRefresh = 0,
  onRunAnalysis,
  runningPythonAnalysis
}) => {
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [zoomModalVisible, setZoomModalVisible] = useState(false);
  const [currentZoomImage, setCurrentZoomImage] = useState('');
  const [imageLoading, setImageLoading] = useState<Record<string, boolean>>({
    parametric: true,
    historical: true,
    montecarlo: true
  });
  const [imageError, setImageError] = useState<Record<string, boolean>>({
    parametric: false,
    historical: false,
    montecarlo: false
  });
  const [lastRefreshed, setLastRefreshed] = useState<Record<string, Date>>({
    parametric: new Date(),
    historical: new Date(),
    montecarlo: new Date()
  });
  
  // Track the latest analysis parameters (from the most recent analysis run)
  const [latestAnalysisParams, setLatestAnalysisParams] = useState<AnalysisParamsType | null>(null);
  
  // Update latestAnalysisParams whenever new VaR results come in
  // We'll use the parametric VaR parameters as the source of truth since all three methods
  // are run with the same parameters in the same analysis session
  useEffect(() => {
    if (parametricVaR?.parameters) {
      setLatestAnalysisParams({
        confidenceLevel: parametricVaR.parameters.confidenceLevel,
        timeHorizon: parametricVaR.parameters.timeHorizon,
        lookbackPeriod: parametricVaR.parameters.lookbackPeriod,
        varMethod: parametricVaR.parameters.varMethod,
        distribution: parametricVaR.parameters.distribution,
        runTimestamp: parametricVaR.parameters.runTimestamp,
        // For Monte Carlo simulations, we need to check if it exists
        numSimulations: monteCarloVaR?.parameters ? 
          (monteCarloVaR.parameters as any).numSimulations : undefined
      });
    }
  }, [
    parametricVaR?.varValue, parametricVaR?.parameters,
    historicalVaR?.varValue, historicalVaR?.parameters,
    monteCarloVaR?.varValue, monteCarloVaR?.parameters
  ]);
  
  // New state for latest chart paths
  const [chartPaths, setChartPaths] = useState<Record<string, string>>({
    parametric: '/images/parametric_var.png',
    historical: '/images/historical_var.png',
    montecarlo: '/images/monte_carlo_var.png'
  });
  
  // Zoom functionality
  const [scale, setScale] = useState(1);
  
  // Function to fetch the latest chart paths
  const fetchLatestChartPaths = () => {
    fetch(`${apiUrl}/api/latest-charts`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        if (data.success) {
          console.log('Fetched latest chart paths:', data);
          // Update chart paths with the latest available
          setChartPaths({
            parametric: data.charts.parametric?.path || '/images/parametric_var.png',
            historical: data.charts.historical?.path || '/images/historical_var.png',
            montecarlo: data.charts.monteCarlo?.path || '/images/monte_carlo_var.png'
          });
          
          // Also update lastRefreshed times based on server data
          setLastRefreshed({
            parametric: new Date(data.charts.parametric?.lastModified || Date.now()),
            historical: new Date(data.charts.historical?.lastModified || Date.now()),
            montecarlo: new Date(data.charts.monteCarlo?.lastModified || Date.now())
          });
        } else {
          console.warn('Failed to fetch latest chart paths:', data);
        }
      })
      .catch(error => {
        // Reduce error logging frequency - only log once per session
        if (!chartPathErrorLogged) {
          console.warn('Error fetching latest chart paths (will not log again):', error.message);
          chartPathErrorLogged = true;
        }
      });
  };
  
  // Force refresh of images when component mounts
  useEffect(() => {
    // Only fetch on initial mount, not on every re-render
    fetchLatestChartPaths();
    // Empty dependency array ensures this only runs once on mount
  }, []);
  
  // Helper to create image URL with timestamp to avoid caching
  // Prioritize VaR result chart URLs over generic chart paths
  const getImageUrl = useCallback((imagePath: string, varResultChartUrl?: string) => {
    // Use the specific chart URL from VaR results if available, otherwise use generic path
    let finalPath = varResultChartUrl || imagePath;
    
    // Check if the URL is already complete (starts with http:// or https://)
    if (finalPath && (finalPath.startsWith('http://') || finalPath.startsWith('https://'))) {
      // URL is already complete, just add cache busting parameter
      const separator = finalPath.includes('?') ? '&' : '?';
      const timestamp = lastRefreshed[activeVarChart].getTime();
      return `${finalPath}${separator}t=${timestamp}`;
    }
    
    // For relative paths, ensure they start with '/' and construct full URL
    if (finalPath && !finalPath.startsWith('/')) {
      finalPath = `/${finalPath}`;
    }
    
    // Add cache busting parameter, but use a stable timestamp
    // This prevents the URL from changing on every render
    const timestamp = lastRefreshed[activeVarChart].getTime();
    return `${apiUrl}${finalPath}?t=${timestamp}`;
  }, [activeVarChart, lastRefreshed, apiUrl]);
  
  // Function to open zoom modal with the current chart
  const openZoomModal = (imageType: string) => {
    let imageUrl = '';
    switch(imageType) {
      case 'parametric':
        imageUrl = getImageUrl(chartPaths.parametric, parametricVaR?.chartImageUrl);
        break;
      case 'historical':
        imageUrl = getImageUrl(chartPaths.historical, historicalVaR?.chartImageUrl);
        break;
      case 'montecarlo':
        imageUrl = getImageUrl(chartPaths.montecarlo, monteCarloVaR?.chartImageUrl);
        break;
    }
    
    // Validate URL before setting it
    if (!imageUrl || imageUrl.includes('undefined') || imageUrl.includes('null')) {
      console.warn('Invalid image URL detected, using fallback');
      imageUrl = `${apiUrl}/images/var_placeholder.png`;
    }
    
    setCurrentZoomImage(imageUrl);
    setZoomModalVisible(true);
    setScale(1); // Reset scale when opening
  };
  
  // Image components - avoid excessive logging
  const renderParametricImage = useMemo(() => (
    <>
      {imageLoading.parametric && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading chart...</Text>
        </View>
      )}
      {imageError.parametric && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={40} color="#ef4444" />
          <Text style={styles.errorText}>Unable to load chart</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              setImageError({...imageError, parametric: false});
              setImageLoading({...imageLoading, parametric: true});
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => openZoomModal('parametric')}
        style={{ width: '100%', height: '100%' }}
      >
        <Image
          source={{ 
            uri: (() => {
              const url = getImageUrl(chartPaths.parametric, parametricVaR?.chartImageUrl);
              // Validate URL before using it
              if (!url || url.includes('undefined') || url.includes('null') || url.trim() === '') {
                console.warn('Invalid parametric chart URL detected:', url);
                return `${apiUrl}/images/parametric_var.png`;
              }
              return url;
            })()
          }}
          style={[styles.chartImage, (imageLoading.parametric || imageError.parametric) && { opacity: 0 }]}
          resizeMode="stretch"
          crossOrigin="anonymous"
          onLoadStart={() => {
            console.log('Starting to load parametric chart once');
            setImageLoading({...imageLoading, parametric: true});
          }}
          onLoad={() => {
            setImageLoading({...imageLoading, parametric: false});
          }}
          onError={(e) => {
            console.warn('Error loading parametric chart:', e.nativeEvent.error);
            setImageLoading({...imageLoading, parametric: false});
            setImageError({...imageError, parametric: true});
          }}
        />
      </TouchableOpacity>
    </>
  ), [
    getImageUrl, 
    chartPaths.parametric, 
    parametricVaR?.chartImageUrl,
    imageLoading.parametric, 
    imageError.parametric, 
    openZoomModal
  ]);
  
  const renderHistoricalImage = useMemo(() => (
    <>
      {imageLoading.historical && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading chart...</Text>
        </View>
      )}
      {imageError.historical && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={40} color="#ef4444" />
          <Text style={styles.errorText}>Unable to load chart</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              setImageError({...imageError, historical: false});
              setImageLoading({...imageLoading, historical: true});
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => openZoomModal('historical')}
        style={{ width: '100%', height: '100%' }}
      >
        <Image
          source={{ 
            uri: (() => {
              const url = getImageUrl(chartPaths.historical, historicalVaR?.chartImageUrl);
              // Validate URL before using it
              if (!url || url.includes('undefined') || url.includes('null') || url.trim() === '') {
                console.warn('Invalid historical chart URL detected:', url);
                return `${apiUrl}/images/historical_var.png`;
              }
              return url;
            })()
          }}
          style={[styles.chartImage, (imageLoading.historical || imageError.historical) && { opacity: 0 }]}
          resizeMode="stretch"
          crossOrigin="anonymous"
          onLoadStart={() => {
            console.log('Starting to load historical chart once');
            setImageLoading({...imageLoading, historical: true});
          }}
          onLoad={() => {
            setImageLoading({...imageLoading, historical: false});
          }}
          onError={(e) => {
            console.warn('Error loading historical chart:', e.nativeEvent.error);
            setImageLoading({...imageLoading, historical: false});
            setImageError({...imageError, historical: true});
          }}
        />
      </TouchableOpacity>
    </>
  ), [
    getImageUrl, 
    chartPaths.historical, 
    historicalVaR?.chartImageUrl,
    imageLoading.historical, 
    imageError.historical, 
    openZoomModal
  ]);
  
  const renderMonteCarloImage = useMemo(() => (
    <>
      {imageLoading.montecarlo && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading chart...</Text>
        </View>
      )}
      {imageError.montecarlo && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={40} color="#ef4444" />
          <Text style={styles.errorText}>Unable to load chart</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              setImageError({...imageError, montecarlo: false});
              setImageLoading({...imageLoading, montecarlo: true});
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => openZoomModal('montecarlo')}
        style={{ width: '100%', height: '100%' }}
      >
        <Image
          source={{ 
            uri: (() => {
              const url = getImageUrl(chartPaths.montecarlo, monteCarloVaR?.chartImageUrl);
              // Validate URL before using it
              if (!url || url.includes('undefined') || url.includes('null') || url.trim() === '') {
                console.warn('Invalid Monte Carlo chart URL detected:', url);
                return `${apiUrl}/images/monte_carlo_var.png`;
              }
              return url;
            })()
          }}
          style={[styles.chartImage, (imageLoading.montecarlo || imageError.montecarlo) && { opacity: 0 }]}
          resizeMode="stretch"
          crossOrigin="anonymous"
          onLoadStart={() => {
            console.log('Starting to load Monte Carlo chart once');
            setImageLoading({...imageLoading, montecarlo: true});
          }}
          onLoad={() => {
            setImageLoading({...imageLoading, montecarlo: false});
          }}
          onError={(e) => {
            console.warn('Error loading Monte Carlo chart:', e.nativeEvent.error);
            setImageLoading({...imageLoading, montecarlo: false});
            setImageError({...imageError, montecarlo: true});
          }}
        />
      </TouchableOpacity>
    </>
  ), [
    getImageUrl, 
    chartPaths.montecarlo, 
    monteCarloVaR?.chartImageUrl,
    imageLoading.montecarlo, 
    imageError.montecarlo, 
    openZoomModal
  ]);
  
  // Handle zoom in and out
  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, 3)); // Max zoom is 3x
  };
  
  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.5)); // Min zoom is 0.5x
  };
  
  const handleResetZoom = () => {
    setScale(1); // Reset to original size
  };

  // Format the timestamp
  const formatTimestamp = (date: Date): string => {
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // Format percentage values consistently
  const formatPercentage = (percentage: number | undefined): string => {
    if (!percentage) return '0.00%';
    return `${percentage.toFixed(2)}%`;
  };

  // Function to get color for the dollar value based on risk percentage
  const getRiskColor = (percentage: number): string => {
    if (percentage >= 10) return '#ef4444'; // High risk - Red
    if (percentage >= 5) return '#f59e0b';  // Medium risk - Orange
    return '#10b981';                       // Low risk - Green
  };

  // Function to get risk level text based on percentage
  const getRiskLevel = (percentage: number): { text: string; color: string } => {
    if (percentage >= 10) return { text: 'High', color: '#ef4444' };
    if (percentage >= 5) return { text: 'Medium', color: '#f59e0b' };
    return { text: 'Low', color: '#10b981' };
  };

  // Helper to calculate and format dollar values 
  const formatDollarValue = (percentage: number | undefined, value: number | undefined, portfolioValue: number | undefined): string => {
    if (!percentage || !portfolioValue) return '$0.00';
    
    // Calculate directly from percentage to ensure consistency
    const calculatedValue = verifyVarValue(percentage, value, portfolioValue);
    
    // Format with exactly two decimal places
    return `$${calculatedValue.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  // Get appropriate chart description based on active chart type
  const getChartDescription = () => {
    return CHART_DESCRIPTIONS[activeVarChart === 'montecarlo' ? 'monteCarlo' : activeVarChart as keyof typeof CHART_DESCRIPTIONS] || 
      'Chart shows portfolio risk analysis';
  };

  // Helper to format the last refreshed time
  const formatRefreshTime = (date: Date): string => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    return `${Math.floor(diffInSeconds / 3600)}h ago`;
  };

  // Force refresh of images when component mounts or active chart changes
  useEffect(() => {
    // Force all images to refresh on mount by updating the timestamp
    const now = new Date();
    setLastRefreshed({
      parametric: now,
      historical: now,
      montecarlo: now
    });
  }, []);
  
  // Refresh the current chart image when activeVarChart changes
  useEffect(() => {
    // Force current image to refresh with a small delay to ensure UI updates
    const timer = setTimeout(() => {
      setImageLoading({...imageLoading, [activeVarChart]: false});
    }, 100);
    
    return () => clearTimeout(timer);
  }, [activeVarChart]);

  // Force refresh of images when forceRefresh prop changes
  useEffect(() => {
    if (forceRefresh > 0) {
      console.log('Force refreshing charts due to new analysis completion');
      fetchLatestChartPaths();
      
      // Reset image states to force reload
      setImageLoading({
        parametric: true,
        historical: true,
        montecarlo: true
      });
      
      setImageError({
        parametric: false,
        historical: false,
        montecarlo: false
      });
      
      // Update refresh times
      const now = new Date();
      setLastRefreshed({
        parametric: now,
        historical: now,
        montecarlo: now
      });
      
      // After a short delay, turn off loading to trigger image reload
      setTimeout(() => {
        setImageLoading({
          parametric: false,
          historical: false,
          montecarlo: false
        });
      }, 1000);
    }
  }, [forceRefresh]);

  return (
    <View style={[styles.container, detailed && styles.detailedContainer]}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Value at Risk Analysis</Text>
        <View style={styles.headerActions}>
          {onRunAnalysis && (
            <TouchableOpacity 
              style={[styles.runAnalysisButton, runningPythonAnalysis && styles.runAnalysisButtonDisabled]}
              onPress={onRunAnalysis}
              disabled={runningPythonAnalysis}
            >
              <Ionicons name="analytics-outline" size={18} color="#FFFFFF" style={styles.runAnalysisIcon} />
              <Text style={styles.runAnalysisText}>
                {runningPythonAnalysis ? 'Running...' : 'Run Analysis'}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            onPress={() => setInfoModalVisible(true)} 
            style={styles.infoButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="information-circle-outline" size={20} color="#ADD8E6" />
          </TouchableOpacity>
          {onViewMore && !detailed && (
            <TouchableOpacity style={styles.viewMoreButton} onPress={onViewMore}>
              <Text style={styles.viewMoreText}>See Details</Text>
              <Ionicons name="chevron-forward" size={16} color="#007AFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Parameters section now shows the latest analysis parameters, not the active chart parameters */}
      {latestAnalysisParams && (
        <View style={styles.parametersContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.parametersScrollContent}
            centerContent={true}
          >
            <View style={styles.parametersGrid}>
              <View style={styles.parameterItem}>
                <Text style={styles.parameterLabel}>Conf:</Text>
                <Text style={styles.parameterValue}>
                  {(() => {
                    let confidenceLevel = '95';
                    if (latestAnalysisParams.confidenceLevel) {
                      confidenceLevel = (parseFloat(latestAnalysisParams.confidenceLevel) * 100).toFixed(0);
                    }
                    return `${confidenceLevel}%`;
                  })()}
                </Text>
              </View>
              <Text style={styles.parameterSeparator}>|</Text>
              <View style={styles.parameterItem}>
                <Text style={styles.parameterLabel}>Time:</Text>
                <Text style={styles.parameterValue}>
                  {latestAnalysisParams.timeHorizon || 1}d
                </Text>
              </View>
              <Text style={styles.parameterSeparator}>|</Text>
              <View style={styles.parameterItem}>
                <Text style={styles.parameterLabel}>Look:</Text>
                <Text style={styles.parameterValue}>
                  {latestAnalysisParams.lookbackPeriod || lookbackPeriod || 5}y
                </Text>
              </View>
              <Text style={styles.parameterSeparator}>|</Text>
              <View style={styles.parameterItem}>
                <Text style={styles.parameterLabel}>Method:</Text>
                <Text style={[
                  styles.parameterValue,
                  styles.methodValue,
                  activeVarChart === 'parametric' && styles.activeParametricMethod,
                  activeVarChart === 'historical' && styles.activeHistoricalMethod,
                  activeVarChart === 'montecarlo' && styles.activeMonteCarloMethod,
                ]}>
                  {(() => {
                    if (activeVarChart === 'parametric') return 'Par';
                    if (activeVarChart === 'historical') return 'Hist';
                    if (activeVarChart === 'montecarlo') return 'MC';
                    return 'Par';
                  })()}
                </Text>
              </View>
              <Text style={styles.parameterSeparator}>|</Text>
              <View style={styles.parameterItem}>
                <Text style={styles.parameterLabel}>Dist:</Text>
                <Text style={styles.parameterValue}>
                  {(() => {
                    let distribution = 'Norm';
                    if (activeVarChart === 'parametric') {
                      distribution = latestAnalysisParams.distribution === 'normal' ? 'Norm' : 
                                    latestAnalysisParams.distribution === 't' ? 't-dist' : 
                                    latestAnalysisParams.distribution?.substring(0, 4) || 'Norm';
                    } else if (activeVarChart === 'historical') {
                      distribution = 'Hist';
                    } else if (activeVarChart === 'montecarlo') {
                      distribution = latestAnalysisParams.distribution === 'normal' ? 'Norm' : 
                                   latestAnalysisParams.distribution === 't' ? 't-dist' : 
                                   latestAnalysisParams.distribution?.substring(0, 4) || 'Norm';
                    }
                    return distribution;
                  })()}
                </Text>
              </View>
              {activeVarChart === 'montecarlo' && latestAnalysisParams.numSimulations && (
                <>
                  <Text style={styles.parameterSeparator}>|</Text>
                  <View style={styles.parameterItem}>
                    <Text style={styles.parameterLabel}>Sims:</Text>
                    <Text style={styles.parameterValue}>
                      {(() => {
                        const numSims = latestAnalysisParams.numSimulations;
                        if (numSims) {
                          return numSims >= 10000 ? 
                            `${Math.floor(numSims / 1000)}k` : 
                            numSims.toLocaleString();
                        }
                        return '50k';
                      })()}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </ScrollView>
        </View>
      )}

      <View style={styles.controlsRow}>
        <View style={styles.varSelector}>
          <TouchableOpacity
            style={[
              styles.varMethodButton,
              activeVarChart === 'parametric' && styles.activeMethodButton
            ]}
            onPress={() => setActiveVarChart('parametric')}
          >
            <Text
              style={[
                styles.varMethodText,
                activeVarChart === 'parametric' && styles.activeMethodText
              ]}
            >
              Parametric
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.varMethodButton,
              activeVarChart === 'historical' && styles.activeMethodButton
            ]}
            onPress={() => setActiveVarChart('historical')}
          >
            <Text
              style={[
                styles.varMethodText,
                activeVarChart === 'historical' && styles.activeMethodText
              ]}
            >
              Historical
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.varMethodButton,
              activeVarChart === 'montecarlo' && styles.activeMethodButton
            ]}
            onPress={() => setActiveVarChart('montecarlo')}
          >
            <Text
              style={[
                styles.varMethodText,
                activeVarChart === 'montecarlo' && styles.activeMethodText
              ]}
            >
              Monte Carlo
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Chart visualization - display actual PNG charts */}
      <View style={styles.chartContainer}>
        <View style={styles.chartPlaceholder}>
          {activeVarChart === 'parametric' && renderParametricImage}
          
          {activeVarChart === 'historical' && renderHistoricalImage}
          
          {activeVarChart === 'montecarlo' && renderMonteCarloImage}
        </View>
        
        <View style={styles.chartFooter}>
          <Text style={styles.chartLabel}>
            {getChartDescription()}
          </Text>
          <Text style={styles.lastRefreshedText}>
            Last updated: {formatRefreshTime(lastRefreshed[activeVarChart])}
          </Text>
        </View>
      </View>

      {parametricVaR && (
        <View style={styles.portfolioValueContainer}>
          <Text style={styles.portfolioValueLabel}>Portfolio Value:</Text>
          <Text style={styles.portfolioValueAmount}>
            ${parametricVaR.portfolioValue.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          </Text>
        </View>
      )}
      
      {/* Add divider between parameters and table */}
      <View style={styles.sectionDivider} />
      
      <View style={styles.tableContainer}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableCell, styles.methodCell, styles.headerCell]}>Method</Text>
          <Text style={[styles.tableCell, styles.valueCell, styles.headerCell]}>VaR</Text>
          <Text style={[styles.tableCell, styles.valueCell, styles.headerCell]}>CVaR</Text>
          <Text style={[styles.tableCell, styles.riskLevelCell, styles.headerCell]}>Risk</Text>
        </View>
        
        <View style={styles.tableSubHeader}>
          <Text style={[styles.tableCell, styles.methodCell, styles.subHeaderCell]}>Type</Text>
          <Text style={[styles.tableCell, styles.valueCell, styles.subHeaderCell]}>% / $</Text>
          <Text style={[styles.tableCell, styles.valueCell, styles.subHeaderCell]}>% / $</Text>
          <Text style={[styles.tableCell, styles.riskLevelCell, styles.subHeaderCell]}>Level</Text>
        </View>

        <View style={[
          styles.tableRow,
          activeVarChart === 'parametric' && styles.activeRow
        ]}>
          <Text style={[styles.tableCell, styles.methodCell]}>Parametric</Text>
          <View style={styles.valueCellContainer}>
            <Text style={[styles.tableCell, styles.percentValue]}>
              {formatPercentage(parametricVaR?.varPercentage)}
            </Text>
            {parametricVaR && (
              <Text style={styles.dollarValue}>
                {formatDollarValue(
                  parametricVaR.varPercentage,
                  parametricVaR.varValue,
                  parametricVaR.portfolioValue
                )}
              </Text>
            )}
          </View>
          <View style={styles.valueCellContainer}>
            <Text style={[styles.tableCell, styles.percentValue]}>
              {formatPercentage(parametricVaR?.cvarPercentage)}
            </Text>
            {parametricVaR && (
              <Text style={styles.dollarValue}>
                {formatDollarValue(
                  parametricVaR.cvarPercentage,
                  parametricVaR.cvarValue,
                  parametricVaR.portfolioValue
                )}
              </Text>
            )}
          </View>
          {parametricVaR && (
            <View style={styles.riskLevelContainer}>
              {(() => {
                const riskLevel = getRiskLevel(parametricVaR.varPercentage);
                return (
                  <Text style={[styles.riskLevelText, { color: riskLevel.color }]}>
                    {riskLevel.text}
                  </Text>
                );
              })()}
            </View>
          )}
        </View>
        
        <View style={[
          styles.tableRow,
          activeVarChart === 'historical' && styles.activeRow
        ]}>
          <Text style={[styles.tableCell, styles.methodCell]}>Historical</Text>
          <View style={styles.valueCellContainer}>
            <Text style={[styles.tableCell, styles.percentValue]}>
              {formatPercentage(historicalVaR?.varPercentage)}
            </Text>
            {historicalVaR && (
              <Text style={styles.dollarValue}>
                {formatDollarValue(
                  historicalVaR.varPercentage,
                  historicalVaR.varValue,
                  historicalVaR.portfolioValue
                )}
              </Text>
            )}
          </View>
          <View style={styles.valueCellContainer}>
            <Text style={[styles.tableCell, styles.percentValue]}>
              {formatPercentage(historicalVaR?.cvarPercentage)}
            </Text>
            {historicalVaR && (
              <Text style={styles.dollarValue}>
                {formatDollarValue(
                  historicalVaR.cvarPercentage,
                  historicalVaR.cvarValue,
                  historicalVaR.portfolioValue
                )}
              </Text>
            )}
          </View>
          {historicalVaR && (
            <View style={styles.riskLevelContainer}>
              {(() => {
                const riskLevel = getRiskLevel(historicalVaR.varPercentage);
                return (
                  <Text style={[styles.riskLevelText, { color: riskLevel.color }]}>
                    {riskLevel.text}
                  </Text>
                );
              })()}
            </View>
          )}
        </View>
        
        <View style={[
          styles.tableRow,
          activeVarChart === 'montecarlo' && styles.activeRow,
          styles.lastRow
        ]}>
          <Text style={[styles.tableCell, styles.methodCell]}>Monte Carlo</Text>
          <View style={styles.valueCellContainer}>
            <Text style={[styles.tableCell, styles.percentValue]}>
              {formatPercentage(monteCarloVaR?.varPercentage)}
            </Text>
            {monteCarloVaR && (
              <Text style={styles.dollarValue}>
                {formatDollarValue(
                  monteCarloVaR.varPercentage,
                  monteCarloVaR.varValue,
                  monteCarloVaR.portfolioValue
                )}
              </Text>
            )}
          </View>
          <View style={styles.valueCellContainer}>
            <Text style={[styles.tableCell, styles.percentValue]}>
              {formatPercentage(monteCarloVaR?.cvarPercentage)}
            </Text>
            {monteCarloVaR && (
              <Text style={styles.dollarValue}>
                {formatDollarValue(
                  monteCarloVaR.cvarPercentage,
                  monteCarloVaR.cvarValue,
                  monteCarloVaR.portfolioValue
                )}
              </Text>
            )}
          </View>
          {monteCarloVaR && (
            <View style={styles.riskLevelContainer}>
              {(() => {
                const riskLevel = getRiskLevel(monteCarloVaR.varPercentage);
                return (
                  <Text style={[styles.riskLevelText, { color: riskLevel.color }]}>
                    {riskLevel.text}
                  </Text>
                );
              })()}
            </View>
          )}
        </View>
      </View>
      
      {/* Timestamp section */}
      <View style={styles.timestampContainer}>
        <View style={styles.timestampLine} />
        <Text style={styles.timestampText}>
          <Ionicons name="time-outline" size={12} color="#64748b" style={{marginRight: 4}} />
          {formatTimestamp(lastUpdated)}
        </Text>
        <View style={styles.timestampLine} />
      </View>
      
      {detailed && (
        <View style={styles.detailedExplanation}>
          <Text style={styles.explanationTitle}>About Value at Risk (VaR)</Text>
          <Text style={styles.explanationText}>
            Value at Risk (VaR) estimates the maximum potential loss a portfolio might face over a specific time period at a given confidence level.
          </Text>
          <Text style={styles.explanationText}>
            • Parametric VaR assumes returns follow a normal distribution.{"\n"}
            • Historical VaR uses past return data without distribution assumptions.{"\n"}
            • Monte Carlo VaR simulates future price movements based on random scenarios.
          </Text>
          <Text style={styles.explanationText}>
            Conditional Value at Risk (CVaR) measures the expected loss exceeding VaR, providing insight into tail risk.
          </Text>
        </View>
      )}

      <Modal
        visible={infoModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setInfoModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.18)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '85%', maxWidth: 340 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#23272f' }}>Types of Value at Risk</Text>
              <TouchableOpacity onPress={() => setInfoModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>
            {varExplanations.map((item) => (
              <View key={item.type} style={{ marginBottom: 14 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#273c75', marginBottom: 2 }}>{item.type}</Text>
                <Text style={{ fontSize: 14, color: '#23272f' }}>{item.description}</Text>
              </View>
            ))}
          </View>
        </View>
      </Modal>

      {/* Zoom Modal for chart fullscreen view */}
      <Modal
        visible={zoomModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setZoomModalVisible(false)}
      >
        <View style={styles.zoomModalContainer}>
          {/* Background press handler - this is a full-screen transparent button */}
          <TouchableOpacity 
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setZoomModalVisible(false)}
          />
          
          {/* Main content container - clickable to close */}
          <TouchableOpacity 
            style={styles.zoomModalContent}
            activeOpacity={1}
            onPress={() => setZoomModalVisible(false)}
          >
            {/* Zoom controls - prevent propagation when clicked */}
            <View 
              style={styles.zoomControls}
              onStartShouldSetResponder={() => true}
              onResponderRelease={(e) => e.stopPropagation()}
            >
              <TouchableOpacity 
                style={styles.zoomButton} 
                onPress={(e) => {
                  e.stopPropagation();
                  handleZoomOut();
                }}
              >
                <Ionicons name="remove" size={22} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.zoomButton} 
                onPress={(e) => {
                  e.stopPropagation();
                  handleZoomIn();
                }}
              >
                <Ionicons name="add" size={22} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.zoomButton} 
                onPress={(e) => {
                  e.stopPropagation();
                  handleResetZoom();
                }}
              >
                <Ionicons name="refresh" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
            
            {/* Scrollable image container - prevent propagation when interacted with */}
            <ScrollView 
              style={styles.zoomScrollView}
              contentContainerStyle={styles.zoomScrollContent}
              maximumZoomScale={3}
              minimumZoomScale={0.5}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              centerContent
              onTouchStart={(e) => e.stopPropagation()}
              onScrollBeginDrag={(e) => e.stopPropagation()}
            >
              <Image
                source={{ 
                  uri: (() => {
                    // Validate zoom image URL
                    if (!currentZoomImage || currentZoomImage.includes('undefined') || currentZoomImage.includes('null') || currentZoomImage.trim() === '') {
                      console.warn('Invalid zoom image URL detected:', currentZoomImage);
                      return `${apiUrl}/images/var_placeholder.png`;
                    }
                    return currentZoomImage;
                  })()
                }}
                style={[styles.zoomedImage, { transform: [{ scale: scale }] }]}
                resizeMode="contain"
              />
            </ScrollView>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.tapOutsideHint}
            onPress={() => setZoomModalVisible(false)}
          >
            <Text style={{color: 'white', fontWeight: '500'}}>Tap anywhere to close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 11,
    marginVertical: 12,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },
  detailedContainer: {
    flex: 1,
    borderRadius: 0,
    marginVertical: 0,
    paddingTop: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    flex: 1,
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  viewMoreText: {
    fontSize: 14,
    color: '#007AFF',
    marginRight: 4,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    marginBottom: 16,
    paddingBottom: 12,
  },
  varSelector: {
    flexDirection: 'row',
  },
  varMethodButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  activeMethodButton: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  varMethodText: {
    fontSize: 15,
    color: '#8E8E93',
  },
  activeMethodText: {
    color: '#007AFF',
    fontWeight: '500',
  },
  chartContainer: {
    width: '100%',
    height: 320,
    marginBottom: 16,
    paddingTop: 0,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f8fafc',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chartPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f8fafc',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 0,
  },
  chartImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f8fafc',
    resizeMode: 'stretch',
  },
  chartFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  chartLabel: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  lastRefreshedText: {
    textAlign: 'center',
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    fontStyle: 'italic',
  },
  portfolioValueContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  portfolioValueLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4b5563',
    marginRight: 8,
  },
  portfolioValueAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },
  tableContainer: {
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    paddingBottom: 4,
  },
  tableSubHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    paddingBottom: 8,
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  activeRow: {
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
    borderRadius: 8,
  },
  tableCell: {
    fontSize: 14,
  },
  headerCell: {
    fontWeight: '700',
    color: '#000',
    fontSize: 14,
  },
  subHeaderCell: {
    fontWeight: '500',
    color: '#64748b',
    fontSize: 12,
    fontStyle: 'italic',
  },
  methodCell: {
    flex: 1.2,
    paddingLeft: 8,
  },
  valueCell: {
    flex: 1,
    textAlign: 'right',
    paddingRight: 8,
  },
  valueCellContainer: {
    flex: 1,
    alignItems: 'flex-end',
    paddingRight: 8,
  },
  riskLevelCell: {
    flex: 0.8,
    textAlign: 'center',
  },
  riskLevelContainer: {
    flex: 0.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  riskLevelText: {
    fontSize: 13,
    fontWeight: '600',
  },
  percentValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  dollarValue: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
    color: '#000',
  },
  timestampContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  timestampLine: {
    height: 1,
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    maxWidth: '30%',
  },
  timestampText: {
    fontSize: 12,
    color: '#64748b',
    marginHorizontal: 10,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  detailedExplanation: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  explanationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  explanationText: {
    fontSize: 15,
    color: '#4A4A4A',
    lineHeight: 22,
    marginBottom: 12,
  },
  chartLoadingText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
    marginTop: 12,
  },
  meanMarker: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#ef4444',
  },
  stdDevMarker: {
    position: 'absolute',
    top: '50%',
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#3b82f6',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  errorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    zIndex: 10,
  },
  errorText: {
    marginTop: 8,
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '500',
  },
  retryButton: {
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#3b82f6',
    borderRadius: 6,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 13,
  },
  // Zoom modal styles
  zoomModalContainer: {
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.85)', 
    justifyContent: 'center', 
    alignItems: 'center'
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1
  },
  zoomModalContent: {
    width: '100%',
    height: '60%',  
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    zIndex: 2,
    marginBottom: 80,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: ''
  },
  zoomControls: {
    position: 'absolute',
    top: 40,
    alignSelf: 'center',
    flexDirection: 'row',
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 25,
    padding: 5
  },
  zoomButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5
  },

  zoomScrollView: {
    flex: 1,
    width: '100%'
  },
  zoomScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  zoomedImage: {
    width: Dimensions.get('window').width * 0.9,
    height: Dimensions.get('window').height * 0.7, // Adjust for better fit
    resizeMode: 'contain'
  },
  tapOutsideHint: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 2
  },
  parametersContainer: {
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    marginBottom: 16,
  },
  parametersTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4b5563',
    marginBottom: 8,
    textAlign: 'center',
  },
  parametersScrollContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'nowrap',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  parametersGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'nowrap',
    alignItems: 'center',
  },
  parameterItem: {
    flex: 0,
    minWidth: 'auto',
    marginRight: 0,
    marginBottom: 0,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  parameterLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
    marginBottom: 2,
    textAlign: 'center',
  },
  parameterValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },
  parameterSeparator: {
    fontSize: 14,
    color: '#cbd5e1',
    marginHorizontal: 4,
    alignSelf: 'center',
    fontWeight: '300',
  },
  timestampWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    justifyContent: 'center',
  },
  timestampDivider: {
    height: 1,
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    maxWidth: '30%',
  },
  lastRunText: {
    fontSize: 12,
    color: '#64748b',
    marginHorizontal: 10,
    textAlign: 'center',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginVertical: 16,
  },
  methodValue: {
    fontWeight: '500',
  },
  activeParametricMethod: {
    color: '#007AFF',
  },
  activeHistoricalMethod: {
    color: '#007AFF',
  },
  activeMonteCarloMethod: {
    color: '#007AFF',
  },
  runAnalysisButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    marginRight: 12,
    height: 32,
    justifyContent: 'center',
  },
  runAnalysisIcon: {
    marginRight: 4,
  },
  runAnalysisText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  runAnalysisButtonDisabled: {
    opacity: 0.7,
  },
  infoButton: {
    marginLeft: 8,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
});

export default VaRAnalysisCard; 
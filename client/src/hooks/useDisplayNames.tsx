import { useState, useEffect } from 'react';
import displayNameService from '../services/displayNameService';

// ==========================================
// DISPLAY NAMES HOOK
// ==========================================

/**
 * Hook to get display names for portfolios and scenarios
 */
export const useDisplayNames = () => {
  const [portfolioNames, setPortfolioNames] = useState<Record<string, string>>({});
  const [scenarioNames, setScenarioNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Get portfolio display name
  const getPortfolioName = async (portfolioId: string): Promise<string> => {
    if (portfolioNames[portfolioId]) {
      return portfolioNames[portfolioId];
    }

    try {
      const name = await displayNameService.getPortfolioDisplayName(portfolioId);
      setPortfolioNames(prev => ({ ...prev, [portfolioId]: name }));
      return name;
    } catch (error) {
      console.error('Error getting portfolio name:', error);
      return portfolioId;
    }
  };

  // Get scenario display name
  const getScenarioName = async (scenarioId: string): Promise<string> => {
    if (scenarioNames[scenarioId]) {
      return scenarioNames[scenarioId];
    }

    try {
      const name = await displayNameService.getScenarioDisplayName(scenarioId);
      setScenarioNames(prev => ({ ...prev, [scenarioId]: name }));
      return name;
    } catch (error) {
      console.error('Error getting scenario name:', error);
      return scenarioId;
    }
  };

  // Preload names for a list of IDs
  const preloadNames = async (portfolioIds: string[] = [], scenarioIds: string[] = []) => {
    setLoading(true);
    try {
      // Load portfolio names
      const portfolioPromises = portfolioIds.map(async (id) => {
        const name = await displayNameService.getPortfolioDisplayName(id);
        return { id, name };
      });

      // Load scenario names
      const scenarioPromises = scenarioIds.map(async (id) => {
        const name = await displayNameService.getScenarioDisplayName(id);
        return { id, name };
      });

      const [portfolioResults, scenarioResults] = await Promise.all([
        Promise.allSettled(portfolioPromises),
        Promise.allSettled(scenarioPromises)
      ]);

      // Update portfolio names
      const newPortfolioNames: Record<string, string> = {};
      portfolioResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          newPortfolioNames[result.value.id] = result.value.name;
        }
      });

      // Update scenario names
      const newScenarioNames: Record<string, string> = {};
      scenarioResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          newScenarioNames[result.value.id] = result.value.name;
        }
      });

      setPortfolioNames(prev => ({ ...prev, ...newPortfolioNames }));
      setScenarioNames(prev => ({ ...prev, ...newScenarioNames }));
    } catch (error) {
      console.error('Error preloading names:', error);
    } finally {
      setLoading(false);
    }
  };

  // Clear cached names
  const clearCache = () => {
    setPortfolioNames({});
    setScenarioNames({});
    displayNameService.clearCache();
  };

  return {
    getPortfolioName,
    getScenarioName,
    preloadNames,
    clearCache,
    loading,
    portfolioNames,
    scenarioNames
  };
};

// ==========================================
// SPECIFIC HOOKS
// ==========================================

/**
 * Hook to get portfolio display name
 */
export const usePortfolioDisplayName = (portfolioId: string | null) => {
  const [name, setName] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!portfolioId) {
      setName('');
      return;
    }

    const loadName = async () => {
      setLoading(true);
      try {
        const displayName = await displayNameService.getPortfolioDisplayName(portfolioId);
        setName(displayName);
      } catch (error) {
        console.error('Error loading portfolio name:', error);
        setName(portfolioId);
      } finally {
        setLoading(false);
      }
    };

    loadName();
  }, [portfolioId]);

  return { name, loading };
};

/**
 * Hook to get scenario display name
 */
export const useScenarioDisplayName = (scenarioId: string | null) => {
  const [name, setName] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!scenarioId) {
      setName('');
      return;
    }

    const loadName = async () => {
      setLoading(true);
      try {
        const displayName = await displayNameService.getScenarioDisplayName(scenarioId);
        setName(displayName);
      } catch (error) {
        console.error('Error loading scenario name:', error);
        setName(scenarioId);
      } finally {
        setLoading(false);
      }
    };

    loadName();
  }, [scenarioId]);

  return { name, loading };
};

/**
 * Hook to get formatted stress test display name
 */
export const useStressTestDisplayName = (scenarioId: string | null, portfolioId: string | null) => {
  const [name, setName] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!scenarioId || !portfolioId) {
      setName('');
      return;
    }

    const loadName = async () => {
      setLoading(true);
      try {
        const [scenarioName, portfolioName] = await Promise.all([
          displayNameService.getScenarioDisplayName(scenarioId),
          displayNameService.getPortfolioDisplayName(portfolioId)
        ]);
        setName(`${scenarioName} on ${portfolioName}`);
      } catch (error) {
        console.error('Error loading stress test name:', error);
        setName(`${scenarioId} on ${portfolioId}`);
      } finally {
        setLoading(false);
      }
    };

    loadName();
  }, [scenarioId, portfolioId]);

  return { name, loading };
};

export default useDisplayNames; 
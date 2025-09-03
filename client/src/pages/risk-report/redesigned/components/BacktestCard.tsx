import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { Portfolio } from '../../../../services/portfolioService';
import backtestService, { BacktestResult, Rebalancing } from '../../../../services/backtestService';

type Props = {
  portfolio: Portfolio | null;
  detailed?: boolean;
};

const computeDefaultDates = () => {
  const now = new Date();
  const start = new Date(now);
  start.setFullYear(now.getFullYear() - 5);
  const toISO = (d: Date) => d.toISOString().slice(0, 10);
  return { startDate: toISO(start), endDate: toISO(now) };
};

const BacktestCard: React.FC<Props> = ({ portfolio, detailed }) => {
  const defaults = computeDefaultDates();
  const [startDate, setStartDate] = useState<string>(defaults.startDate);
  const [endDate, setEndDate] = useState<string>(defaults.endDate);
  const [rebalancing, setRebalancing] = useState<Rebalancing>('none');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    visible: boolean;
    label: string;
    lines: string[];
  }>({ x: 0, y: 0, visible: false, label: '', lines: [] });
  const [infoVisible, setInfoVisible] = useState(false);
  const [showBenchmark, setShowBenchmark] = useState(false);
  const [showBenchmarkDD, setShowBenchmarkDD] = useState(false);
  const [ddInfoVisible, setDdInfoVisible] = useState(false);

  const run = async () => {
    if (!portfolio) return;
    // Basic YYYY-MM-DD validation
    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRe.test(startDate) || !dateRe.test(endDate)) {
      setError('Please enter dates as YYYY-MM-DD');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await backtestService.runBacktest(portfolio, {
        startDate,
        endDate,
        rebalancing,
        benchmarkSymbols: ['^GSPC'],
      });
      setResult(r);
    } catch (e: any) {
      setError(e?.message || 'Backtest failed');
    } finally {
      setLoading(false);
    }
  };

  const screenWidth = Dimensions.get('window').width;
  const CARD_MARGIN = 16;
  const CARD_PADDING = 11;
  const chartWidth = screenWidth - (CARD_MARGIN * 2) - (CARD_PADDING * 2);

  const clampTooltipLeft = (x: number) => {
    const desired = x - 60;
    const min = 8;
    const max = chartWidth - 120; // approx tooltip width
    return Math.max(min, Math.min(max, desired));
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Backtesting</Text>
          <Text style={styles.subtitle}>Evaluate historical portfolio performance</Text>
        </View>
        <TouchableOpacity
          onPress={() => setInfoVisible(true)}
          style={styles.infoButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="information-circle-outline" size={20} color="#ADD8E6" />
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Start (YYYY-MM-DD)</Text>
        <TextInput
          value={startDate}
          onChangeText={setStartDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#64748b"
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>End (YYYY-MM-DD)</Text>
        <TextInput
          value={endDate}
          onChangeText={setEndDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#64748b"
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Rebalance</Text>
        <View style={styles.pills}>
          {(['none','monthly','quarterly','yearly'] as Rebalancing[]).map(opt => (
            <TouchableOpacity key={opt} style={[styles.pill, rebalancing===opt && styles.pillActive]} onPress={() => setRebalancing(opt)}>
              <Text style={[styles.pillText, rebalancing===opt && styles.pillTextActive]}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity disabled={!portfolio || loading} style={styles.runBtn} onPress={run}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.runText}>Run Backtest</Text>}
      </TouchableOpacity>

      {error && <Text style={styles.error}>{error}</Text>}

      {result && (
        <View style={styles.results}>
          <View style={styles.metricsRow}>
            <Metric label="CAGR" value={`${result.metrics.cagr.toFixed(2)}%`} />
            <Metric label="Volatility" value={`${result.metrics.volatility.toFixed(2)}%`} />
            <Metric label="Sharpe" value={`${result.metrics.sharpe.toFixed(2)}`} />
          </View>
          <View style={styles.metricsRow}>
            <Metric label="Sortino" value={result.metrics.sortino != null ? `${result.metrics.sortino.toFixed(2)}` : '—'} />
            <Metric label="Max DD" value={`${result.metrics.maxDrawdown.toFixed(2)}%`} />
            <Metric label="Calmar" value={result.metrics.calmar != null ? `${result.metrics.calmar.toFixed(2)}` : '—'} />
          </View>
          {/* Equity Curve */}
          <View style={styles.chartSection}>
            <View style={styles.chartHeaderRow}>
              <Text style={styles.chartTitle}>Equity Curve</Text>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Benchmark Overlay</Text>
                <MiniToggle value={showBenchmark} onValueChange={setShowBenchmark} />
              </View>
            </View>
            <View style={styles.chartWrapper}>
              <LineChart
                data={buildEquityChartData(result, showBenchmark)}
                width={chartWidth}
                height={220}
                chartConfig={chartConfig}
                withInnerLines={false}
                withOuterLines={true}
                withDots={false}
                withShadow={false}
                bezier
                style={styles.chart}
                onDataPointClick={({ x, y, index }) => {
                  const { labels, datasets } = buildEquityChartData(result, showBenchmark);
                  const label = labels[index] || '';
                  const lines: string[] = [];
                  if (datasets[0]?.data[index] != null) lines.push(`Portfolio: ${datasets[0].data[index].toFixed(2)}`);
                  if (datasets[1]?.data[index] != null) lines.push(`${getBenchmarkDisplayName(result)}: ${datasets[1].data[index].toFixed(2)}`);
                  setTooltip({ x, y, visible: true, label, lines });
                }}
              />
              {tooltip.visible && (
                <View style={[styles.tooltip, { left: clampTooltipLeft(tooltip.x), top: Math.max(8, tooltip.y - 50) }]}>
                  <Text style={styles.tooltipTitle}>{tooltip.label}</Text>
                  {tooltip.lines.map((t, i) => (
                    <Text key={i} style={styles.tooltipText}>{t}</Text>
                  ))}
                </View>
              )}
            </View>
            {/* Legends */}
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendSwatch, { backgroundColor: '#60a5fa' }]} />
                <Text style={styles.legendText}>Portfolio</Text>
              </View>
              {showBenchmark && (result.benchmarks?.length ?? 0) > 0 && (
                <View style={styles.legendItem}>
                  <View style={[styles.legendSwatch, { backgroundColor: '#10b981' }]} />
                  <Text style={styles.legendText}>{getBenchmarkDisplayName(result)}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Drawdown */}
          <View style={styles.chartSection}>
            <View style={styles.chartHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.chartTitle}>Drawdown</Text>
                <TouchableOpacity
                  onPress={() => setDdInfoVisible(true)}
                  style={[styles.infoButton, { marginLeft: 6 }]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="information-circle-outline" size={18} color="#94a3b8" />
                </TouchableOpacity>
              </View>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Benchmark Overlay</Text>
                <MiniToggle value={showBenchmarkDD} onValueChange={setShowBenchmarkDD} />
              </View>
            </View>
            <View style={styles.chartWrapper}>
              <LineChart
                data={buildDrawdownChartData(result, showBenchmarkDD)}
                width={chartWidth}
                height={220}
                chartConfig={chartConfig}
                withInnerLines={false}
                withOuterLines={true}
                withDots={false}
                withShadow={false}
                bezier
                style={styles.chart}
                onDataPointClick={({ x, y, index }) => {
                  const { labels, datasets } = buildDrawdownChartData(result, showBenchmarkDD);
                  const label = labels[index] || '';
                  const lines: string[] = [];
                  const val = datasets[0]?.data[index];
                  if (val != null) lines.push(`Drawdown: ${val.toFixed(2)}%`);
                  const bval = datasets[1]?.data[index];
                  if (bval != null) lines.push(`${getBenchmarkDisplayName(result)}: ${bval.toFixed(2)}%`);
                  setTooltip({ x, y, visible: true, label, lines });
                }}
              />
              {tooltip.visible && (
                <View style={[styles.tooltip, { left: clampTooltipLeft(tooltip.x), top: Math.max(8, tooltip.y - 50) }]}>
                  <Text style={styles.tooltipTitle}>{tooltip.label}</Text>
                  {tooltip.lines.map((t, i) => (
                    <Text key={i} style={styles.tooltipText}>{t}</Text>
                  ))}
                </View>
              )}
            </View>
            {/* Legends */}
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendSwatch, { backgroundColor: '#f87171' }]} />
                <Text style={styles.legendText}>Portfolio</Text>
              </View>
              {showBenchmarkDD && (result.benchmarks?.length ?? 0) > 0 && (
                <View style={styles.legendItem}>
                  <View style={[styles.legendSwatch, { backgroundColor: '#10b981' }]} />
                  <Text style={styles.legendText}>{getBenchmarkDisplayName(result)}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Drawdown Info Modal */}
      {ddInfoVisible && (
        <View style={styles.infoModalBackdrop}>
          <View style={styles.infoModal}>
            <View style={styles.infoHeader}>
              <Text style={styles.infoTitle}>What is Drawdown?</Text>
              <TouchableOpacity onPress={() => setDdInfoVisible(false)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>
            <Text style={styles.infoText}>
              Drawdown measures the decline from a portfolio’s most recent peak. At each date it shows how far
              you are below the previous high, in percent.
            </Text>
            <Text style={styles.infoText}><Text style={styles.infoBullet}>• Depth</Text> How severe losses can get (lowest point = Max Drawdown).</Text>
            <Text style={styles.infoText}><Text style={styles.infoBullet}>• Duration</Text> How long you remain below the peak.</Text>
            <Text style={styles.infoText}><Text style={styles.infoBullet}>• Recovery</Text> How quickly the line returns to 0%.</Text>
            <Text style={[styles.infoText, { marginTop: 8 }]}>Use the benchmark overlay to compare resilience during market stress.</Text>
          </View>
        </View>
      )}

      {/* Info Modal */}
      {infoVisible && (
        <View style={styles.infoModalBackdrop}>
          <View style={styles.infoModal}>
            <View style={styles.infoHeader}>
              <Text style={styles.infoTitle}>About Backtesting</Text>
              <TouchableOpacity onPress={() => setInfoVisible(false)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>
            <Text style={styles.infoText}>
              Backtesting estimates how a selected portfolio would have performed over a past period using
              historical market prices. It helps validate allocation choices and risk/return trade-offs.
            </Text>
            <Text style={[styles.infoText, { marginTop: 8, fontWeight: '700', color: '#111827' }]}>Rebalancing cadence</Text>
            <Text style={styles.infoText}><Text style={styles.infoBullet}>• None</Text> Keep initial weights fixed. Position weights drift as prices move.</Text>
            <Text style={styles.infoText}><Text style={styles.infoBullet}>• Monthly</Text> Reset weights to targets at each month-end.</Text>
            <Text style={styles.infoText}><Text style={styles.infoBullet}>• Quarterly</Text> Reset at each quarter-end (Mar/Jun/Sep/Dec).</Text>
            <Text style={styles.infoText}><Text style={styles.infoBullet}>• Yearly</Text> Reset once at each year-end.</Text>
            <Text style={[styles.infoText, { marginTop: 8 }]}>Benchmarks (e.g., S&P 500) can be overlaid on the equity curve for comparison.</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const Metric = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.metric}>
    <Text style={styles.metricLabel}>{label}</Text>
    <Text style={styles.metricValue}>{value}</Text>
  </View>
);

// Shared chart config consistent with other cards
const chartConfig = {
  backgroundColor: '#0b0e12',
  backgroundGradientFrom: '#0b0e12',
  backgroundGradientTo: '#0b0e12',
  color: (opacity = 1) => `rgba(226, 232, 240, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
  decimalPlaces: 2,
  propsForLabels: {
    fontSize: 10
  },
  propsForDots: {
    r: '0'
  }
};

// Reduce label density for long date ranges
function buildSparseLabels(allDates: string[]): string[] {
  const maxLabels = 6;
  if (allDates.length <= maxLabels) return allDates;
  const step = Math.ceil(allDates.length / maxLabels);
  return allDates.map((d, i) => (i % step === 0 ? d.slice(2) : ''));
}

// Normalize equity to 100 = start
function normalizeSeries(values: number[]): number[] {
  if (!values.length) return values;
  const base = values[0] || 1;
  return values.map(v => (v / base) * 100);
}

// Small, custom toggle for a slicker look than the default Switch
const MiniToggle = ({ value, onValueChange }: { value: boolean; onValueChange: (v: boolean) => void }) => (
  <TouchableOpacity
    onPress={() => onValueChange(!value)}
    activeOpacity={0.8}
    style={[styles.miniToggle, value && styles.miniToggleOn]}
  >
    <View style={[styles.miniKnob, value ? styles.miniKnobOn : null, { left: value ? 18 : 2 }]} />
  </TouchableOpacity>
);

function buildEquityChartData(result: BacktestResult, includeBenchmark: boolean = true) {
  const labelsFull = result.equityCurve.map(p => p.date);
  const labels = buildSparseLabels(labelsFull);
  const portfolio = normalizeSeries(result.equityCurve.map(p => p.value));

  // Take first benchmark if present
  const bench = result.benchmarks && result.benchmarks.length > 0 ? result.benchmarks[0] : null;
  let benchSeries: number[] | null = null;
  if (includeBenchmark && bench) {
    const map: Record<string, number> = {};
    const raw = bench.equityCurve;
    if (raw && raw.length > 0) {
      const base = raw[0].value || 1;
      raw.forEach(p => { map[p.date] = (p.value / base) * 100; });
      benchSeries = labelsFull.map((d, i) => {
        // carry-forward to keep overlay continuous
        if (map[d] != null) return map[d];
        return i > 0 ? (benchSeries as number[])[i - 1] : map[d] ?? NaN;
      });
    }
  }

  const datasets: any[] = [
    { data: portfolio, color: () => '#60a5fa', strokeWidth: 2 },
  ];
  if (benchSeries) datasets.push({ data: benchSeries, color: () => '#10b981', strokeWidth: 2 });

  return { labels, datasets };
}

function buildDrawdownChartData(result: BacktestResult, includeBenchmark: boolean = true) {
  const datesFull = result.drawdown.map(p => p.date);
  const labels = buildSparseLabels(datesFull);
  const series = result.drawdown.map(p => p.value * 100);

  const datasets: any[] = [{ data: series, color: () => '#f87171', strokeWidth: 2 }];

  if (includeBenchmark && result.benchmarks && result.benchmarks.length > 0) {
    // Recompute benchmark drawdown from its equity curve
    const bench = result.benchmarks[0];
    if (bench && bench.equityCurve && bench.equityCurve.length > 0) {
      const map: Record<string, number> = {};
      let peak = bench.equityCurve[0].value;
      bench.equityCurve.forEach(p => {
        peak = Math.max(peak, p.value);
        const dd = (p.value / peak - 1) * 100; // percent
        map[p.date] = dd;
      });
      const bSeries = datesFull.map((d, i) => {
        if (map[d] != null) return map[d];
        return i > 0 ? (map[datesFull[i - 1]] ?? NaN) : NaN;
      });
      datasets.push({ data: bSeries, color: () => '#10b981', strokeWidth: 2 });
    }
  }

  return { labels, datasets };
}

function getBenchmarkDisplayName(result: BacktestResult): string {
  const b = result.benchmarks && result.benchmarks.length > 0 ? result.benchmarks[0] : null;
  if (!b) return 'Benchmark';
  // Map common symbols to names; fallback to symbol
  const symbol = (b as any).symbol || '';
  const map: Record<string, string> = {
    '^GSPC': 'S&P 500',
    'SPY': 'S&P 500 (SPY)',
    '^NDX': 'Nasdaq 100',
    'QQQ': 'Nasdaq 100 (QQQ)',
    '^DJI': 'Dow Jones',
    'IWM': 'Russell 2000 (IWM)',
  };
  return map[symbol] || symbol || 'Benchmark';
}

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
    overflow: 'hidden',
  },
  headerRow: {
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: { color: '#000', fontSize: 18, fontWeight: '700' },
  subtitle: { color: '#64748b', marginTop: 4 },
  row: { marginVertical: 8 },
  label: { color: '#4b5563', marginBottom: 6, fontSize: 12 },
  input: { backgroundColor: '#f8fafc', borderColor: '#e2e8f0', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, color: '#111827' },
  pills: { flexDirection: 'row' },
  pill: { paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, marginRight: 8 },
  pillActive: { backgroundColor: '#e6f0ff', borderColor: '#bfdbfe' },
  pillText: { color: '#4b5563', textTransform: 'capitalize' },
  pillTextActive: { color: '#1e3a8a' },
  runBtn: { backgroundColor: '#000000', paddingVertical: 10, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  runText: { color: '#fff', fontWeight: '600' },
  error: { color: '#ef4444', marginTop: 8 },
  results: { marginTop: 12 },
  chartSection: { marginTop: 12 },
  chartTitle: { color: '#000', marginBottom: 6, fontWeight: '600' },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  metric: { flex: 1, alignItems: 'center' },
  metricLabel: { color: '#64748b', fontSize: 12 },
  metricValue: { color: '#111827', fontSize: 16, fontWeight: '600', marginTop: 2 },
  chart: { borderRadius: 12, marginHorizontal: 0 },
  chartWrapper: { position: 'relative' },
  chartHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toggleRow: { flexDirection: 'row', alignItems: 'center' },
  toggleLabel: { color: '#64748b', marginRight: 8, fontSize: 12 },
  legendRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 8 },
  legendSwatch: { width: 10, height: 10, borderRadius: 2, marginRight: 6 },
  legendText: { fontSize: 12, color: '#374151' },
  miniToggle: {
    width: 34,
    height: 18,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    position: 'relative',
    justifyContent: 'center',
  },
  miniToggleOn: {
    backgroundColor: '#dbeafe',
    borderColor: '#bfdbfe',
  },
  miniKnob: {
    position: 'absolute',
    top: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#9ca3af',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1.5,
  },
  miniKnobOn: {
    backgroundColor: '#007AFF',
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  tooltipTitle: { color: '#111827', fontSize: 11, fontWeight: '700' },
  tooltipText: { color: '#374151', fontSize: 11 },
  infoButton: { padding: 4, marginLeft: 8 },
  infoModalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.18)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  infoModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '85%',
    maxWidth: 360
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  infoTitle: { fontSize: 18, fontWeight: '700', color: '#23272f' },
  infoText: { fontSize: 14, color: '#23272f', marginTop: 4 },
  infoBullet: { fontWeight: '700', color: '#273c75' },
});

export default BacktestCard;



import AsyncStorage from '@react-native-async-storage/async-storage';
import sp500Service from './sp500Service';
import marketDataService from './marketDataService';
import Colors from '../constants/colors';
import type { Portfolio } from './portfolioService';

export type SectorAllocation = { sector: string; value: number; };
export type RegionAllocation = { region: string; value: number; };
export type MarketCapAllocation = { bucket: string; value: number; };
export type AssetTypeAllocation = { assetType: string; value: number; };
export type Contribution = { portfolioId: string; portfolioName: string; value: number; };

type Classification = {
  sector?: string;
  country?: string; // ISO-ish name
  region?: string;
  marketCap?: number; // absolute USD
};

// In-memory cache for this session
const classificationCache: Map<string, Classification> = new Map();

// Normalize sector names to a consistent set used by UI
const normalizeSector = (raw?: string): string => {
  const name = (raw || 'Unknown').trim();
  const map: Record<string, string> = {
    'Information Technology': 'Technology',
    'Health Care': 'Healthcare',
    'Financials': 'Financial Services',
    'Consumer Discretionary': 'Consumer Cyclical',
    'Consumer Staples': 'Consumer Defensive',
    'Materials': 'Basic Materials',
  };
  return map[name] || name;
};

// ISO 3166-1 alpha-2 to broad region mapping
const ISO_TO_REGION: Record<string, string> = {
  // North America
  US: 'North America', CA: 'North America', MX: 'North America',
  // Europe
  GB: 'Europe', IE: 'Europe', FR: 'Europe', DE: 'Europe', IT: 'Europe', ES: 'Europe', NL: 'Europe', SE: 'Europe', CH: 'Europe', BE: 'Europe', AT: 'Europe', DK: 'Europe', FI: 'Europe', NO: 'Europe', PT: 'Europe', PL: 'Europe', CZ: 'Europe', HU: 'Europe', GR: 'Europe', RO: 'Europe',
  // Asia Pacific
  CN: 'Asia Pacific', JP: 'Asia Pacific', KR: 'Asia Pacific', IN: 'Asia Pacific', AU: 'Asia Pacific', NZ: 'Asia Pacific', TW: 'Asia Pacific', HK: 'Asia Pacific', SG: 'Asia Pacific', TH: 'Asia Pacific', MY: 'Asia Pacific', ID: 'Asia Pacific', PH: 'Asia Pacific', VN: 'Asia Pacific',
  // Latin America
  BR: 'Latin America', AR: 'Latin America', CL: 'Latin America', CO: 'Latin America', PE: 'Latin America', MX2: 'Latin America',
  // Africa & Middle East
  ZA: 'Africa', EG: 'Africa', NG: 'Africa', KE: 'Africa', MA: 'Africa',
  AE: 'Middle East', SA: 'Middle East', QA: 'Middle East', IL: 'Middle East', TR: 'Middle East'
};

const countryStringToISO: Record<string, string> = {
  'united states': 'US', 'usa': 'US', 'us': 'US', 'u.s.': 'US',
  'united kingdom': 'GB', 'uk': 'GB', 'england': 'GB',
  'germany': 'DE', 'france': 'FR', 'italy': 'IT', 'spain': 'ES', 'netherlands': 'NL', 'sweden': 'SE', 'switzerland': 'CH', 'ireland': 'IE', 'denmark': 'DK', 'finland': 'FI', 'norway': 'NO', 'portugal': 'PT', 'poland': 'PL', 'czech republic': 'CZ', 'hungary': 'HU', 'greece': 'GR', 'romania': 'RO',
  'canada': 'CA', 'mexico': 'MX',
  'brazil': 'BR', 'argentina': 'AR', 'chile': 'CL', 'colombia': 'CO', 'peru': 'PE',
  'china': 'CN', 'japan': 'JP', 'south korea': 'KR', 'korea': 'KR', 'india': 'IN', 'australia': 'AU', 'new zealand': 'NZ', 'taiwan': 'TW', 'hong kong': 'HK', 'singapore': 'SG', 'thailand': 'TH', 'malaysia': 'MY', 'indonesia': 'ID', 'philippines': 'PH', 'vietnam': 'VN',
  'south africa': 'ZA', 'nigeria': 'NG', 'egypt': 'EG', 'kenya': 'KE', 'morocco': 'MA',
  'united arab emirates': 'AE', 'saudi arabia': 'SA', 'qatar': 'QA', 'israel': 'IL', 'turkey': 'TR'
};

const regionFromCountry = (country?: string): string => {
  const name = (country || '').trim().toLowerCase();
  const code = countryStringToISO[name];
  if (code && ISO_TO_REGION[code]) return ISO_TO_REGION[code];
  // Try simple fallbacks by keyword
  if (name.includes('united states')) return 'North America';
  if (name.includes('china') || name.includes('japan') || name.includes('india')) return 'Asia Pacific';
  if (name.includes('brazil') || name.includes('mexico')) return 'North America';
  return 'Other';
};

const marketCapBucket = (mc?: number): string => {
  if (!mc || mc <= 0) return 'Other';
  if (mc >= 10_000_000_000) return 'Large Cap';
  if (mc >= 2_000_000_000) return 'Mid Cap';
  if (mc >= 300_000_000) return 'Small Cap';
  return 'Micro/Other';
};

// Normalize asset class names for display
const normalizeAssetType = (assetClass?: string): string => {
  const typeMap: Record<string, string> = {
    'equity': 'Stocks',
    'bond': 'Bonds',
    'commodity': 'Commodities',
    'real_estate': 'Real Estate',
    'cash': 'Cash',
    'alternative': 'Alternatives'
  };
  return typeMap[assetClass || ''] || 'Other';
};

const CLASSIFICATION_CACHE_KEY = 'security-classification-cache-v1';

// Load persisted cache if any
const ensureCacheLoaded = async () => {
  if (classificationCache.size > 0) return;
  try {
    const raw = await AsyncStorage.getItem(CLASSIFICATION_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, Classification>;
      Object.entries(parsed).forEach(([k, v]) => classificationCache.set(k, v));
    }
  } catch {}
};

const persistCache = async () => {
  try {
    const obj: Record<string, Classification> = {};
    classificationCache.forEach((v, k) => (obj[k] = v));
    await AsyncStorage.setItem(CLASSIFICATION_CACHE_KEY, JSON.stringify(obj));
  } catch {}
};

export const classifySymbol = async (symbol: string): Promise<Classification> => {
  await ensureCacheLoaded();
  const key = symbol.toUpperCase();
  if (classificationCache.has(key)) return classificationCache.get(key)!;

  let classified: Classification | null = null;

  try {
    // Try SP500 dataset first (fast, mostly local/mocked)
    const companies = await sp500Service.getSP500Companies();
    const hit = companies.find(c => c.symbol.toUpperCase() === key);
    if (hit) {
      classified = {
        sector: normalizeSector(hit.sector),
        country: 'United States',
        region: regionFromCountry('United States'),
        marketCap: undefined,
      };
    }
  } catch {}

  try {
    // Fallback to market data service details
    if (!classified) {
      const details = await marketDataService.getSecurityDetails(key);
      classified = {
        sector: normalizeSector(details.sector),
        country: 'United States',
        region: regionFromCountry('United States'),
        marketCap: details.marketCap,
      };
    }
  } catch {}

  const finalClass: Classification = classified || { sector: 'Unknown', country: 'United States', region: 'North America', marketCap: undefined };
  classificationCache.set(key, finalClass);
  persistCache();
  return finalClass;
};

export const aggregateBySector = async (portfolios: Portfolio[]): Promise<SectorAllocation[]> => {
  const sectorMap: Record<string, number> = {};
  for (const p of portfolios) {
    for (const asset of p.assets) {
      const value = asset.price * asset.quantity;
      if (value <= 0) continue;
      const c = await classifySymbol(asset.symbol);
      const sector = normalizeSector(c.sector);
      sectorMap[sector] = (sectorMap[sector] || 0) + value;
    }
  }
  return Object.entries(sectorMap).map(([sector, value]) => ({ sector, value }));
};

export const aggregateByRegion = async (portfolios: Portfolio[]): Promise<RegionAllocation[]> => {
  const regionMap: Record<string, number> = {};
  for (const p of portfolios) {
    for (const asset of p.assets) {
      const value = asset.price * asset.quantity;
      if (value <= 0) continue;
      const c = await classifySymbol(asset.symbol);
      const region = c.region || regionFromCountry(c.country);
      regionMap[region] = (regionMap[region] || 0) + value;
    }
  }
  return Object.entries(regionMap).map(([region, value]) => ({ region, value }));
};

export const aggregateByMarketCap = async (portfolios: Portfolio[]): Promise<MarketCapAllocation[]> => {
  const mcMap: Record<string, number> = {};
  for (const p of portfolios) {
    for (const asset of p.assets) {
      const value = asset.price * asset.quantity;
      if (value <= 0) continue;
      const c = await classifySymbol(asset.symbol);
      const bucket = marketCapBucket(c.marketCap);
      mcMap[bucket] = (mcMap[bucket] || 0) + value;
    }
  }
  return Object.entries(mcMap).map(([bucket, value]) => ({ bucket, value }));
};

export const aggregateByAssetType = async (portfolios: Portfolio[]): Promise<AssetTypeAllocation[]> => {
  const assetTypeMap: Record<string, number> = {};
  for (const p of portfolios) {
    for (const asset of p.assets) {
      const value = asset.price * asset.quantity;
      if (value <= 0) continue;
      const assetType = normalizeAssetType(asset.assetClass);
      assetTypeMap[assetType] = (assetTypeMap[assetType] || 0) + value;
    }
  }
  return Object.entries(assetTypeMap).map(([assetType, value]) => ({ assetType, value }));
};

export const computeContributionBreakdown = async (portfolios: Portfolio[]) => {
  const sectorMap: Record<string, { total: number; byPortfolio: Record<string, number> }> = {};
  const regionMap: Record<string, { total: number; byPortfolio: Record<string, number> }> = {};
  const capMap: Record<string, { total: number; byPortfolio: Record<string, number> }> = {};
  const assetTypeMap: Record<string, { total: number; byPortfolio: Record<string, number> }> = {};

  for (const p of portfolios) {
    for (const a of p.assets) {
      const value = a.price * a.quantity;
      if (value <= 0) continue;
      const c = await classifySymbol(a.symbol);
      const sec = normalizeSector(c.sector);
      const reg = c.region || regionFromCountry(c.country);
      const cap = marketCapBucket(c.marketCap);
      const assetType = normalizeAssetType(a.assetClass);

      if (!sectorMap[sec]) sectorMap[sec] = { total: 0, byPortfolio: {} };
      sectorMap[sec].total += value;
      sectorMap[sec].byPortfolio[p.id] = (sectorMap[sec].byPortfolio[p.id] || 0) + value;

      if (!regionMap[reg]) regionMap[reg] = { total: 0, byPortfolio: {} };
      regionMap[reg].total += value;
      regionMap[reg].byPortfolio[p.id] = (regionMap[reg].byPortfolio[p.id] || 0) + value;

      if (!capMap[cap]) capMap[cap] = { total: 0, byPortfolio: {} };
      capMap[cap].total += value;
      capMap[cap].byPortfolio[p.id] = (capMap[cap].byPortfolio[p.id] || 0) + value;

      if (!assetTypeMap[assetType]) assetTypeMap[assetType] = { total: 0, byPortfolio: {} };
      assetTypeMap[assetType].total += value;
      assetTypeMap[assetType].byPortfolio[p.id] = (assetTypeMap[assetType].byPortfolio[p.id] || 0) + value;
    }
  }

  const idToName: Record<string, string> = Object.fromEntries(portfolios.map(p => [p.id, p.name]));

  const toList = (m: Record<string, { total: number; byPortfolio: Record<string, number> }>) => {
    const out: Record<string, Contribution[]> = {};
    Object.entries(m).forEach(([k, v]) => {
      const list: Contribution[] = Object.entries(v.byPortfolio)
        .map(([pid, val]) => ({ portfolioId: pid, portfolioName: idToName[pid] || pid, value: val }))
        .sort((a, b) => b.value - a.value);
      out[k] = list;
    });
    return out;
  };

  return {
    sectors: toList(sectorMap),
    regions: toList(regionMap),
    marketCaps: toList(capMap),
    assetTypes: toList(assetTypeMap)
  } as {
    sectors: Record<string, Contribution[]>;
    regions: Record<string, Contribution[]>;
    marketCaps: Record<string, Contribution[]>;
    assetTypes: Record<string, Contribution[]>;
  };
};

export const computeAllAggregations = async (portfolios: Portfolio[]) => {
  const [sectors, regions, marketCaps, assetTypes] = await Promise.all([
    aggregateBySector(portfolios),
    aggregateByRegion(portfolios),
    aggregateByMarketCap(portfolios),
    aggregateByAssetType(portfolios)
  ]);
  const total = portfolios.reduce((s, p) => s + p.assets.reduce((ss, a) => ss + a.price * a.quantity, 0), 0) || 1;
  
  // Color palettes per tab (cycle if more items than palette length)
  const sectorPalette = [
    Colors.primary, Colors.warning, Colors.success, Colors.danger, Colors.info,
    '#8b5cf6', '#0ea5e9', '#f43f5e', '#22c55e', '#f59e0b'
  ];
  const regionPalette = [
    Colors.secondary, Colors.info, Colors.warning, Colors.danger, Colors.primary,
    '#06b6d4', '#a78bfa', '#84cc16', '#f97316'
  ];
  const marketCapPalette = [
    Colors.warning, Colors.primary, Colors.success, Colors.danger, Colors.info,
    '#f43f5e', '#22c55e'
  ];
  const assetTypePalette = [
    Colors.primary, Colors.success, Colors.warning, Colors.danger, Colors.info,
    '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'
  ];

  const sectorsOut = sectors
    .map((s, idx) => ({ name: s.sector, percentage: (s.value / total) * 100, value: s.value, color: sectorPalette[idx % sectorPalette.length] }));
  const regionsOut = regions
    .map((r, idx) => ({ name: r.region, percentage: (r.value / total) * 100, value: r.value, color: regionPalette[idx % regionPalette.length] }));
  const capsOut = marketCaps
    .map((m, idx) => ({ name: m.bucket, percentage: (m.value / total) * 100, value: m.value, color: marketCapPalette[idx % marketCapPalette.length] }));
  const assetTypesOut = assetTypes
    .map((a, idx) => ({ name: a.assetType, percentage: (a.value / total) * 100, value: a.value, color: assetTypePalette[idx % assetTypePalette.length] }));

  return {
    sectors: sectorsOut,
    regions: regionsOut,
    marketCaps: capsOut,
    assetTypes: assetTypesOut,
  };
};

export default {
  classifySymbol,
  aggregateBySector,
  aggregateByRegion,
  aggregateByMarketCap,
  aggregateByAssetType,
  computeContributionBreakdown,
  computeAllAggregations
};



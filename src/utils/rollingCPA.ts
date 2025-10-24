/**
 * 7-day rolling CPA calculation utilities
 * Implements the core requirement for rolling average cost per acquisition tracking
 */

export interface DailyMetrics {
  date: string;
  platform: 'google' | 'facebook';
  adSetId: string;
  adSetName: string;
  spend: number;
  conversions: number;
  costPerConversion: number;
}

export interface RollingCPAResult {
  adSetId: string;
  adSetName: string;
  platform: string;
  currentDayCPA: number;
  rolling7DayAvgCPA: number;
  changeFromRollingAvg: number;
  changePercent: number;
  trend: 'improving' | 'worsening' | 'stable';
  dataPoints: number; // How many days of data were available for calculation
}

/**
 * Calculate 7-day rolling average CPA for ad sets
 * This is the core MVP requirement - compare daily CPA against 7-day rolling average
 */
export function calculateRollingCPA(
  historicalData: DailyMetrics[], 
  targetDate: string = new Date().toISOString().split('T')[0]
): RollingCPAResult[] {
  
  if (!historicalData || historicalData.length === 0) {
    throw new Error('Historical data is required for rolling CPA calculation');
  }

  // Validate that we have real advertising data, not mock data
  validateRealData(historicalData);

  // Get unique ad sets
  const adSetIds = [...new Set(historicalData.map(record => record.adSetId))];
  
  const results: RollingCPAResult[] = [];

  for (const adSetId of adSetIds) {
    const adSetData = historicalData.filter(record => record.adSetId === adSetId);
    
    if (adSetData.length === 0) continue;

    // Sort by date descending (most recent first)
    adSetData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const result = calculateAdSetRollingCPA(adSetData, targetDate);
    if (result) {
      results.push(result);
    }
  }

  // Sort by current day CPA descending (highest cost first - most urgent)
  return results.sort((a, b) => b.currentDayCPA - a.currentDayCPA);
}

/**
 * Calculate rolling CPA for a single ad set
 */
function calculateAdSetRollingCPA(
  adSetData: DailyMetrics[], 
  targetDate: string
): RollingCPAResult | null {
  
  if (adSetData.length === 0) return null;

  // Find current day data
  const currentDayData = adSetData.find(record => record.date === targetDate);
  
  if (!currentDayData) {
    // If no data for target date, use most recent available
    console.warn(`No data for ${targetDate}, using most recent available for ad set ${adSetData[0].adSetId}`);
  }

  const latestData = currentDayData || adSetData[0];

  // Get 7 days of historical data (including current day)
  const targetDateObj = new Date(targetDate);
  const sevenDaysAgo = new Date(targetDateObj);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // 6 days back + today = 7 days

  const rollingData = adSetData.filter(record => {
    const recordDate = new Date(record.date);
    return recordDate >= sevenDaysAgo && recordDate <= targetDateObj;
  });

  if (rollingData.length === 0) {
    console.warn(`No historical data available for ad set ${latestData.adSetId}`);
    return null;
  }

  // Calculate 7-day rolling average
  const totalSpend = rollingData.reduce((sum, record) => sum + record.spend, 0);
  const totalConversions = rollingData.reduce((sum, record) => sum + record.conversions, 0);
  
  if (totalConversions === 0) {
    console.warn(`No conversions in rolling period for ad set ${latestData.adSetId}`);
    return {
      adSetId: latestData.adSetId,
      adSetName: latestData.adSetName,
      platform: latestData.platform,
      currentDayCPA: latestData.costPerConversion,
      rolling7DayAvgCPA: 0,
      changeFromRollingAvg: latestData.costPerConversion,
      changePercent: 100, // Infinite increase from 0
      trend: 'worsening',
      dataPoints: rollingData.length
    };
  }

  const rolling7DayAvgCPA = totalSpend / totalConversions;
  const changeFromRollingAvg = latestData.costPerConversion - rolling7DayAvgCPA;
  const changePercent = rolling7DayAvgCPA > 0 ? 
    (changeFromRollingAvg / rolling7DayAvgCPA) * 100 : 0;

  // Determine trend
  let trend: 'improving' | 'worsening' | 'stable';
  if (Math.abs(changePercent) < 5) {
    trend = 'stable';
  } else if (changePercent > 0) {
    trend = 'worsening'; // CPA increased
  } else {
    trend = 'improving'; // CPA decreased
  }

  return {
    adSetId: latestData.adSetId,
    adSetName: latestData.adSetName,
    platform: latestData.platform,
    currentDayCPA: latestData.costPerConversion,
    rolling7DayAvgCPA,
    changeFromRollingAvg,
    changePercent,
    trend,
    dataPoints: rollingData.length
  };
}

/**
 * Get ad sets with significant CPA changes (alerts)
 */
export function getSignificantCPAChanges(
  rollingResults: RollingCPAResult[],
  thresholds = {
    critical: 25, // 25% increase
    warning: 15,  // 15% increase
    improvement: -10 // 10% decrease
  }
): {
  critical: RollingCPAResult[];
  warning: RollingCPAResult[];
  improvements: RollingCPAResult[];
} {
  
  return {
    critical: rollingResults.filter(result => 
      result.changePercent > thresholds.critical
    ),
    warning: rollingResults.filter(result => 
      result.changePercent > thresholds.warning && 
      result.changePercent <= thresholds.critical
    ),
    improvements: rollingResults.filter(result => 
      result.changePercent < thresholds.improvement
    )
  };
}

/**
 * Calculate daily conversion tracking summary
 */
export function calculateDailyConversionSummary(
  data: DailyMetrics[],
  targetDate: string = new Date().toISOString().split('T')[0]
): {
  totalSpend: number;
  totalConversions: number;
  averageCPA: number;
  adSetCount: number;
  platformBreakdown: {
    google: { spend: number; conversions: number; cpa: number; adSets: number };
    facebook: { spend: number; conversions: number; cpa: number; adSets: number };
  };
} {
  
  const dayData = data.filter(record => record.date === targetDate);
  
  if (dayData.length === 0) {
    throw new Error(`No data available for ${targetDate}`);
  }

  const totalSpend = dayData.reduce((sum, record) => sum + record.spend, 0);
  const totalConversions = dayData.reduce((sum, record) => sum + record.conversions, 0);
  const averageCPA = totalConversions > 0 ? totalSpend / totalConversions : 0;

  const googleData = dayData.filter(record => record.platform === 'google');
  const facebookData = dayData.filter(record => record.platform === 'facebook');

  function calculatePlatformMetrics(platformData: DailyMetrics[]) {
    const spend = platformData.reduce((sum, record) => sum + record.spend, 0);
    const conversions = platformData.reduce((sum, record) => sum + record.conversions, 0);
    return {
      spend,
      conversions,
      cpa: conversions > 0 ? spend / conversions : 0,
      adSets: platformData.length
    };
  }

  return {
    totalSpend,
    totalConversions,
    averageCPA,
    adSetCount: dayData.length,
    platformBreakdown: {
      google: calculatePlatformMetrics(googleData),
      facebook: calculatePlatformMetrics(facebookData)
    }
  };
}

/**
 * Validate that data comes from real advertising sources
 */
function validateRealData(data: DailyMetrics[]): void {
  // Check for suspicious patterns that indicate mock data
  const suspiciousPatterns = [
    // All spend amounts are round numbers
    data.every(record => record.spend % 100 === 0 && record.spend > 100),
    
    // All CPA values are identical
    data.length > 1 && new Set(data.map(r => r.costPerConversion)).size === 1,
    
    // Test IDs in ad set names
    data.some(record => /^(test|mock|fake|demo)_/i.test(record.adSetId || record.adSetName)),
    
    // Unrealistic conversion rates
    data.some(record => record.conversions > record.spend), // More conversions than dollars spent
  ];

  if (suspiciousPatterns.some(pattern => pattern)) {
    throw new Error('Mock or suspicious data detected. Only real advertising data is allowed.');
  }

  // Validate required fields
  for (const record of data) {
    if (!record.date || !record.adSetId || typeof record.spend !== 'number' || typeof record.conversions !== 'number') {
      throw new Error('Invalid data format detected. All records must have date, adSetId, spend, and conversions.');
    }

    if (record.spend < 0 || record.conversions < 0) {
      throw new Error('Invalid data values. Spend and conversions cannot be negative.');
    }
  }
}

/**
 * Format CPA change for display
 */
export function formatCPAChange(result: RollingCPAResult): {
  badge: string;
  color: string;
  message: string;
} {
  const absChange = Math.abs(result.changePercent);
  
  if (result.trend === 'improving') {
    return {
      badge: `↓ ${absChange.toFixed(1)}%`,
      color: 'green',
      message: `CPA improved by $${Math.abs(result.changeFromRollingAvg).toFixed(2)}`
    };
  } else if (result.trend === 'worsening') {
    return {
      badge: `↑ ${absChange.toFixed(1)}%`,
      color: result.changePercent > 25 ? 'red' : 'yellow',
      message: `CPA increased by $${result.changeFromRollingAvg.toFixed(2)}`
    };
  } else {
    return {
      badge: `~ ${absChange.toFixed(1)}%`,
      color: 'gray',
      message: 'CPA relatively stable'
    };
  }
}
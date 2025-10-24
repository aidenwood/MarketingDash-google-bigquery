/**
 * Data validation utilities to ensure only real advertising data is used
 * NEVER allow mock data in production
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface DataSource {
  source: 'google_ads_api' | 'facebook_csv' | 'manual_upload';
  timestamp: string;
  recordCount: number;
}

/**
 * Validates that data comes from real advertising platforms
 */
export function validateDataSource(data: any[]): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  if (!Array.isArray(data) || data.length === 0) {
    result.isValid = false;
    result.errors.push('No data provided for validation');
    return result;
  }

  // Check each record for required real data properties
  for (const [index, record] of data.entries()) {
    // Must have a valid source
    if (!record.source || !['google_ads_api', 'facebook_csv', 'manual_upload'].includes(record.source)) {
      result.errors.push(`Record ${index}: Invalid or missing data source`);
      result.isValid = false;
    }

    // Must have recent timestamp (within last 7 days for daily data)
    if (!record.sync_timestamp && !record.date) {
      result.errors.push(`Record ${index}: Missing timestamp information`);
      result.isValid = false;
    }

    // Must have realistic advertising metrics
    if (typeof record.spend !== 'number' || record.spend < 0) {
      result.errors.push(`Record ${index}: Invalid spend amount`);
      result.isValid = false;
    }

    if (typeof record.conversions !== 'number' || record.conversions < 0) {
      result.errors.push(`Record ${index}: Invalid conversions count`);
      result.isValid = false;
    }

    // Warn about suspicious patterns
    if (record.cost_per_conversion === 0 && record.conversions > 0) {
      result.warnings.push(`Record ${index}: Zero CPA with conversions (unusual)`);
    }

    if (record.cost_per_conversion > 1000) {
      result.warnings.push(`Record ${index}: Very high CPA detected ($${record.cost_per_conversion})`);
    }
  }

  return result;
}

/**
 * Calculates 7-day rolling average CPA
 */
export function calculateRollingCPA(historicalData: any[], currentDate: string): number {
  if (!historicalData || historicalData.length === 0) {
    throw new Error('Historical data required for rolling CPA calculation');
  }

  // Get last 7 days of data
  const currentDateObj = new Date(currentDate);
  const sevenDaysAgo = new Date(currentDateObj);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentData = historicalData.filter(record => {
    const recordDate = new Date(record.date);
    return recordDate >= sevenDaysAgo && recordDate <= currentDateObj;
  });

  if (recentData.length === 0) {
    throw new Error('No data available for 7-day rolling calculation');
  }

  const totalSpend = recentData.reduce((sum, record) => sum + (record.spend || 0), 0);
  const totalConversions = recentData.reduce((sum, record) => sum + (record.conversions || 0), 0);

  if (totalConversions === 0) {
    return 0; // No conversions in the period
  }

  return totalSpend / totalConversions;
}

/**
 * Validates daily conversion tracking requirements
 */
export function validateDailyConversions(data: any[]): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  if (!data || data.length === 0) {
    result.isValid = false;
    result.errors.push('No daily conversion data available');
    return result;
  }

  // Check that we have data for today (or latest available day)
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const hasRecentData = data.some(record => 
    record.date === today || record.date === yesterdayStr
  );

  if (!hasRecentData) {
    result.warnings.push('No data from today or yesterday - may be delayed');
  }

  // Validate that each platform has conversion tracking
  const platforms = [...new Set(data.map(record => record.platform))];
  
  for (const platform of platforms) {
    const platformData = data.filter(record => record.platform === platform);
    const hasConversions = platformData.some(record => record.conversions > 0);
    
    if (!hasConversions) {
      result.warnings.push(`No conversions tracked for ${platform} platform`);
    }
  }

  return result;
}

/**
 * Detects and prevents mock data patterns
 */
export function detectMockData(data: any[]): string[] {
  const mockPatterns: string[] = [];

  if (!data || data.length === 0) {
    return mockPatterns;
  }

  // Check for suspicious patterns that indicate mock data
  const suspiciousPatterns = [
    // Perfect round numbers
    data.filter(record => record.spend % 100 === 0 && record.spend > 100).length > data.length * 0.5,
    
    // Sequential IDs that look generated
    data.filter(record => /^(test|mock|fake|demo)_/i.test(record.id || '')).length > 0,
    
    // Unrealistic conversion rates (too perfect)
    data.filter(record => record.conversion_rate === 5.0 || record.conversion_rate === 10.0).length > 2,
    
    // Identical metrics across multiple records
    data.length > 1 && new Set(data.map(r => `${r.spend}-${r.conversions}`)).size === 1
  ];

  if (suspiciousPatterns[0]) {
    mockPatterns.push('Too many round number spends detected');
  }

  if (suspiciousPatterns[1]) {
    mockPatterns.push('Test/mock IDs detected in data');
  }

  if (suspiciousPatterns[2]) {
    mockPatterns.push('Unrealistic conversion rates detected');
  }

  if (suspiciousPatterns[3]) {
    mockPatterns.push('Identical metrics across records (possible mock data)');
  }

  return mockPatterns;
}

/**
 * Environment check to ensure we're not using development data in production
 */
export function validateProductionEnvironment(): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  const isProduction = import.meta.env.PROD;
  const nodeEnv = import.meta.env.NODE_ENV;

  if (isProduction && nodeEnv !== 'production') {
    result.errors.push('Environment mismatch: Production build with non-production NODE_ENV');
    result.isValid = false;
  }

  // Check for required production environment variables
  const requiredProdVars = [
    'GOOGLE_ADS_DEVELOPER_TOKEN',
    'GOOGLE_ADS_CLIENT_ID',
    'GOOGLE_ADS_CUSTOMER_ID'
  ];

  if (isProduction) {
    for (const varName of requiredProdVars) {
      if (!import.meta.env[varName]) {
        result.errors.push(`Missing required production environment variable: ${varName}`);
        result.isValid = false;
      }
    }
  }

  return result;
}

/**
 * Main validation function for the dashboard
 */
export function validateDashboardData(data: any[]): ValidationResult {
  const sourceValidation = validateDataSource(data);
  const conversionValidation = validateDailyConversions(data);
  const envValidation = validateProductionEnvironment();
  const mockPatterns = detectMockData(data);

  return {
    isValid: sourceValidation.isValid && conversionValidation.isValid && envValidation.isValid && mockPatterns.length === 0,
    errors: [
      ...sourceValidation.errors,
      ...conversionValidation.errors,
      ...envValidation.errors,
      ...mockPatterns.map(pattern => `Mock data detected: ${pattern}`)
    ],
    warnings: [
      ...sourceValidation.warnings,
      ...conversionValidation.warnings,
      ...envValidation.warnings
    ]
  };
}
export interface AdSetPerformance {
  id: string;
  name: string;
  platform: 'google' | 'facebook';
  date: string;
  spend: number;
  conversions: number;
  costPerConversion: number;
  changePercent?: number;
  impressions: number;
  clicks: number;
  clickThroughRate: number;
  conversionRate: number;
}

export interface DashboardMetrics {
  totalSpend: number;
  totalConversions: number;
  averageCPA: number;
  totalChangePercent: number;
  platformBreakdown: {
    google: {
      spend: number;
      conversions: number;
      cpa: number;
    };
    facebook: {
      spend: number;
      conversions: number;
      cpa: number;
    };
  };
}

export interface ChartDataPoint {
  date: string;
  value: number;
  platform: string;
  adSetName: string;
}

export interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  adSetId: string;
  changePercent: number;
  timestamp: string;
}

export interface GoogleAdsData {
  customerId: string;
  adGroupId: string;
  adGroupName: string;
  campaignName: string;
  costMicros: string;
  conversions: number;
  impressions: string;
  clicks: string;
  date: string;
}

export interface FacebookCSVData {
  'Ad Set ID': string;
  'Ad Set Name': string;
  'Campaign Name': string;
  'Amount Spent': string;
  'Results': string;
  'Cost per Result': string;
  'Impressions': string;
  'Link Clicks': string;
  'Reach': string;
}

export interface ProcessedCSVData {
  platform: 'facebook';
  adSetId: string;
  adSetName: string;
  campaignName: string;
  spend: number;
  conversions: number;
  costPerConversion: number;
  impressions: number;
  clicks: number;
  date: string;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface UploadResult {
  fileName: string;
  recordsProcessed: number;
  errors: string[];
  summary: {
    totalSpend: number;
    totalConversions: number;
    averageCPA: number;
  };
}
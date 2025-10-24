import Papa from 'papaparse';
import type { CPAData } from '@/components/CPAAreaChart';
import type { DailyMetrics } from './rollingCPA';

export interface FacebookCSVRow {
  'Ad set name'?: string;
  'Ad Set Name'?: string;
  'Amount spent (AUD)'?: string;
  'Amount Spent'?: string;
  'Results': string;
  'Cost per results'?: string;
  'Cost per Result'?: string;
  'Impressions': string;
  'Link clicks'?: string;
  'Link Clicks'?: string;
  'Reporting starts'?: string;
  'Reporting Starts'?: string;
  'Reporting ends'?: string;
  'Reporting Ends'?: string;
  [key: string]: string; // Allow for additional columns
}

export interface ParsedFacebookData {
  success: boolean;
  data: DailyMetrics[];
  errors: string[];
  summary: {
    totalRows: number;
    validRows: number;
    totalSpend: number;
    totalConversions: number;
    averageCPA: number;
    dateRange: {
      start: string;
      end: string;
    };
  };
}

/**
 * Parse Facebook CSV file and convert to DailyMetrics format
 */
export function parseFacebookCSV(file: File): Promise<ParsedFacebookData> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => {
        // Clean and normalize headers
        return header.trim();
      },
      complete: (results) => {
        try {
          const parsed = processFacebookCSVData(results.data as FacebookCSVRow[]);
          resolve(parsed);
        } catch (error) {
          resolve({
            success: false,
            data: [],
            errors: [`Processing error: ${error instanceof Error ? error.message : 'Unknown error'}`],
            summary: {
              totalRows: 0,
              validRows: 0,
              totalSpend: 0,
              totalConversions: 0,
              averageCPA: 0,
              dateRange: { start: '', end: '' }
            }
          });
        }
      },
      error: (error) => {
        resolve({
          success: false,
          data: [],
          errors: [`CSV parsing error: ${error.message}`],
          summary: {
            totalRows: 0,
            validRows: 0,
            totalSpend: 0,
            totalConversions: 0,
            averageCPA: 0,
            dateRange: { start: '', end: '' }
          }
        });
      }
    });
  });
}

/**
 * Process Facebook CSV data into DailyMetrics format
 */
function processFacebookCSVData(rows: FacebookCSVRow[]): ParsedFacebookData {
  const data: DailyMetrics[] = [];
  const errors: string[] = [];
  let totalSpend = 0;
  let totalConversions = 0;
  const dates: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    
    try {
      // Get values with fallbacks for different column name formats
      const adSetName = row['Ad set name'] || row['Ad Set Name'] || '';
      const amountSpent = row['Amount spent (AUD)'] || row['Amount Spent'] || '';
      const results = row['Results'] || '0';
      const costPerResult = row['Cost per results'] || row['Cost per Result'] || '';
      const reportingStart = row['Reporting starts'] || row['Reporting Starts'] || '';
      const reportingEnd = row['Reporting ends'] || row['Reporting Ends'] || '';

      // Skip empty rows or rows without ad set name
      if (!adSetName || adSetName.trim() === '') {
        continue;
      }

      // Skip inactive or non-delivering ad sets
      const adSetDelivery = row['Ad set delivery'] || '';
      if (adSetDelivery === 'inactive' || adSetDelivery === 'not_delivering') {
        continue;
      }

      // Parse numeric values
      const spend = parseFloat(amountSpent.replace(/[$,]/g, ''));
      const conversions = parseFloat(results || '0');
      const costPerResultValue = parseFloat(costPerResult.replace(/[$,]/g, ''));

      // Validate numeric values
      if (isNaN(spend) || spend < 0) {
        errors.push(`Row ${i + 2}: Invalid spend amount: ${amountSpent}`);
        continue;
      }

      // Allow 0 conversions (some ads might have spend but no conversions)
      if (isNaN(conversions) || conversions < 0) {
        errors.push(`Row ${i + 2}: Invalid results count: ${results}`);
        continue;
      }

      // Skip rows with no spend (inactive ads)
      if (spend === 0) {
        continue;
      }

      // Validate CPA calculation (only if we have conversions)
      const calculatedCPA = conversions > 0 ? spend / conversions : 0;
      if (!isNaN(costPerResultValue) && Math.abs(calculatedCPA - costPerResultValue) > 0.01 && conversions > 0) {
        errors.push(`Row ${i + 2}: CPA calculation mismatch. Expected: ${calculatedCPA.toFixed(2)}, Got: ${costPerResultValue.toFixed(2)}`);
      }

      // Determine date - use reporting start date
      let reportingDate = '';
      if (reportingStart) {
        reportingDate = normalizeDate(reportingStart);
      } else if (reportingEnd) {
        reportingDate = normalizeDate(reportingEnd);
      } else {
        // Default to yesterday if no date provided
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        reportingDate = yesterday.toISOString().split('T')[0];
        errors.push(`Row ${i + 2}: No date found, using yesterday: ${reportingDate}`);
      }

      // Create DailyMetrics object
      const metrics: DailyMetrics = {
        date: reportingDate,
        platform: 'facebook',
        adSetId: generateAdSetId(adSetName, i),
        adSetName: adSetName.trim(),
        spend: spend,
        conversions: conversions,
        costPerConversion: conversions > 0 ? spend / conversions : 0
      };

      data.push(metrics);
      totalSpend += spend;
      totalConversions += conversions;
      dates.push(reportingDate);

    } catch (error) {
      errors.push(`Row ${i + 2}: Processing error - ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Calculate summary
  const uniqueDates = [...new Set(dates)].sort();
  const averageCPA = totalConversions > 0 ? totalSpend / totalConversions : 0;

  return {
    success: data.length > 0,
    data: data,
    errors: errors,
    summary: {
      totalRows: rows.length,
      validRows: data.length,
      totalSpend: totalSpend,
      totalConversions: totalConversions,
      averageCPA: averageCPA,
      dateRange: {
        start: uniqueDates[0] || '',
        end: uniqueDates[uniqueDates.length - 1] || ''
      }
    }
  };
}

/**
 * Convert DailyMetrics to CPAData format for the chart
 */
export function convertToCPAChartData(dailyMetrics: DailyMetrics[]): CPAData[] {
  // Group by date and calculate daily totals
  const dailyData = new Map<string, { spend: number; conversions: number }>();
  
  for (const metric of dailyMetrics) {
    const existing = dailyData.get(metric.date) || { spend: 0, conversions: 0 };
    dailyData.set(metric.date, {
      spend: existing.spend + metric.spend,
      conversions: existing.conversions + metric.conversions
    });
  }

  // Convert to array and sort by date
  const sortedData = Array.from(dailyData.entries())
    .map(([date, data]) => ({
      date,
      spend: data.spend,
      conversions: data.conversions,
      dailyCPA: data.conversions > 0 ? data.spend / data.conversions : 0
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Calculate 7-day rolling averages
  const chartData: CPAData[] = sortedData.map((item, index) => {
    // Get up to 7 days of data ending with current day
    const windowStart = Math.max(0, index - 6);
    const window = sortedData.slice(windowStart, index + 1);
    
    const windowSpend = window.reduce((sum, d) => sum + d.spend, 0);
    const windowConversions = window.reduce((sum, d) => sum + d.conversions, 0);
    const rolling7DayAvg = windowConversions > 0 ? windowSpend / windowConversions : 0;

    return {
      date: item.date,
      dailyCPA: item.dailyCPA,
      rolling7DayAvg: rolling7DayAvg,
      spend: item.spend,
      conversions: item.conversions
    };
  });

  return chartData;
}

/**
 * Normalize date from various Facebook date formats
 */
function normalizeDate(dateString: string): string {
  try {
    // Handle common Facebook date formats
    let date: Date;
    
    if (dateString.includes('/')) {
      // MM/DD/YYYY or DD/MM/YYYY
      const parts = dateString.split('/');
      if (parts.length === 3) {
        // Assume MM/DD/YYYY for US locale
        date = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
      } else {
        date = new Date(dateString);
      }
    } else if (dateString.includes('-')) {
      // YYYY-MM-DD or DD-MM-YYYY
      date = new Date(dateString);
    } else {
      date = new Date(dateString);
    }

    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date format: ${dateString}`);
    }

    return date.toISOString().split('T')[0];
  } catch (error) {
    // Fallback to yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  }
}

/**
 * Generate unique ad set ID from name and index
 */
function generateAdSetId(adSetName: string, index: number): string {
  // Create a simple hash of the ad set name for consistent IDs
  const hash = adSetName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .substring(0, 20);
  
  return `fb_${hash}_${index.toString().padStart(3, '0')}`;
}

/**
 * Validate Facebook CSV format
 */
export function validateFacebookCSVHeaders(headers: string[]): { valid: boolean; errors: string[] } {
  const requiredHeaders = [
    { primary: 'Ad set name', alternatives: ['Ad Set Name'] },
    { primary: 'Amount spent (AUD)', alternatives: ['Amount Spent', 'Amount spent', 'Spend'] },
    { primary: 'Results', alternatives: [] },
  ];

  const errors: string[] = [];
  const normalizedHeaders = headers.map(h => h.trim());

  for (const required of requiredHeaders) {
    const allOptions = [required.primary, ...required.alternatives];
    const found = allOptions.some(option => normalizedHeaders.includes(option));
    
    if (!found) {
      errors.push(`Missing required column: "${required.primary}" (or alternatives: ${required.alternatives.join(', ')})`);
    }
  }

  // Check for reporting dates
  const dateColumns = ['Reporting starts', 'Reporting Starts', 'Reporting ends', 'Reporting Ends'];
  const hasDateColumn = dateColumns.some(col => normalizedHeaders.includes(col));
  
  if (!hasDateColumn) {
    errors.push('Missing date columns. Expected "Reporting starts" or "Reporting ends"');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
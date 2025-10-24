import Papa from 'papaparse';
import type { CPAData } from '@/components/CPAAreaChart';
import type { DailyMetrics } from './rollingCPA';

export interface FacebookCSVRow {
  'Ad Set Name': string;
  'Amount Spent': string;
  'Results': string;
  'Cost per Result': string;
  'Impressions': string;
  'Link Clicks': string;
  'Reporting Starts': string;
  'Reporting Ends': string;
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
      // Validate required columns
      const requiredColumns = ['Ad Set Name', 'Amount Spent', 'Results', 'Cost per Result'];
      const missingColumns = requiredColumns.filter(col => !row[col] || row[col].trim() === '');
      
      if (missingColumns.length > 0) {
        errors.push(`Row ${i + 2}: Missing required columns: ${missingColumns.join(', ')}`);
        continue;
      }

      // Parse numeric values
      const spend = parseFloat(row['Amount Spent'].replace(/[$,]/g, ''));
      const conversions = parseFloat(row['Results'] || '0');
      const costPerResult = parseFloat(row['Cost per Result'].replace(/[$,]/g, ''));

      // Validate numeric values
      if (isNaN(spend) || spend < 0) {
        errors.push(`Row ${i + 2}: Invalid spend amount: ${row['Amount Spent']}`);
        continue;
      }

      if (isNaN(conversions) || conversions < 0) {
        errors.push(`Row ${i + 2}: Invalid results count: ${row['Results']}`);
        continue;
      }

      // Validate CPA calculation
      const calculatedCPA = conversions > 0 ? spend / conversions : 0;
      if (!isNaN(costPerResult) && Math.abs(calculatedCPA - costPerResult) > 0.01 && conversions > 0) {
        errors.push(`Row ${i + 2}: CPA calculation mismatch. Expected: ${calculatedCPA.toFixed(2)}, Got: ${costPerResult.toFixed(2)}`);
      }

      // Determine date - Facebook can export different date formats
      let reportingDate = '';
      if (row['Reporting Starts']) {
        reportingDate = normalizeDate(row['Reporting Starts']);
      } else if (row['Reporting Ends']) {
        reportingDate = normalizeDate(row['Reporting Ends']);
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
        adSetId: generateAdSetId(row['Ad Set Name'], i),
        adSetName: row['Ad Set Name'].trim(),
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
    'Ad Set Name',
    'Amount Spent', 
    'Results',
    'Cost per Result'
  ];

  const errors: string[] = [];
  const normalizedHeaders = headers.map(h => h.trim());

  for (const required of requiredHeaders) {
    if (!normalizedHeaders.includes(required)) {
      errors.push(`Missing required column: "${required}"`);
    }
  }

  // Check for common variations
  if (!normalizedHeaders.includes('Amount Spent')) {
    const variations = ['Spend', 'Amount Spent (USD)', 'Total Spent'];
    const found = variations.find(v => normalizedHeaders.includes(v));
    if (found) {
      errors.push(`Found "${found}" instead of "Amount Spent". Please use standard Facebook export format.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
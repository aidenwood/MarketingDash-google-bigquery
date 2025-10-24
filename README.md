# MarketingDash - Google BigQuery Integration

A comprehensive marketing dashboard that tracks Cost Per Acquisition (CPA) across Google Ads and Facebook advertising platforms, with automated daily reporting and BigQuery data warehousing.

## Overview

MarketingDash provides automated daily tracking of your top-performing ad sets across multiple platforms, calculating CPA changes and providing actionable insights for marketing teams. The system focuses on the top 5 ad sets by total spend and monitors day-over-day CPA fluctuations.

## Key Features

- **Daily CPA Tracking**: Automated calculation of Cost Per Conversion for top 5 ad sets
- **Multi-Platform Support**: Google Ads API and Facebook browser automation integration
- **BigQuery Integration**: Centralized data warehouse for all marketing metrics
- **Real-time Dashboards**: Visual reporting with Looker Studio integration
- **Automated Alerts**: Notifications for significant CPA changes
- **Historical Analysis**: Trend tracking and performance comparisons

## Architecture

```
Google Ads API ──────┐
                     ├── BigQuery Data Transfer ──► BigQuery ──► Looker Studio
Facebook CSV Export ─┘                              │
(Browser Automation)                                └── Cloud Functions (CPA Calculations)
                                                        │
                                                        └── Cloud Scheduler (Daily Automation)
```

## Industry Benchmarks (2025)

- **Average CPA across all industries**: $70.11
- **Top performing industries**: Restaurants, Food & Beverage (<$21 CPA)
- **Highest CPA industries**: Legal, Finance, Roofing ($60-$140 CPA)
- **Recommended daily budget**: 3x target CPA for optimal performance

## Prerequisites

- Google Cloud Platform account with BigQuery enabled
- Google Ads account with API access
- Facebook Business account with Ads Manager access
- Node.js environment for browser automation
- Valid payment method for Google Cloud services

## Getting Started

### 1. Google Cloud Setup

```bash
# Enable required APIs
gcloud services enable bigquery.googleapis.com
gcloud services enable bigquerydatatransfer.googleapis.com
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable cloudscheduler.googleapis.com
```

### 2. Authentication Setup

#### Google Ads API
1. Visit [Google Ads API Developer Console](https://developers.google.com/google-ads/api/docs/first-call/overview)
2. Request API access and obtain Developer Token
3. Create OAuth 2.0 credentials in Google Cloud Console
4. Configure refresh token for automated access

#### Facebook Browser Automation
1. Install Puppeteer for headless browser automation
2. Configure Facebook Ads Manager login credentials
3. Set up automated CSV export workflow
4. Validate data extraction and parsing

### 3. BigQuery Configuration

```sql
-- Create dataset for marketing data
CREATE SCHEMA `marketing_data`
OPTIONS(
  description="Marketing performance data from Google Ads and Facebook",
  location="US"
);

-- Create table for daily CPA tracking
CREATE TABLE `marketing_data.daily_cpa` (
  date DATE,
  platform STRING,
  ad_set_id STRING,
  ad_set_name STRING,
  total_spend FLOAT64,
  conversions INT64,
  cost_per_conversion FLOAT64,
  cpa_change_percent FLOAT64,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);
```

## Google Ads Integration

### API Endpoints Used

- **Ad Groups Performance**: `customers/{customer_id}/adGroups`
- **Campaign Performance**: `customers/{customer_id}/campaigns`
- **Conversion Metrics**: Using Google Ads Query Language (GAQL)

### Key Metrics Tracked

- Total Spend (cost_micros / 1,000,000)
- Conversions (conversions)
- Cost Per Conversion (cost_micros / conversions / 1,000,000)
- Click-through Rate (clicks / impressions)
- Conversion Rate (conversions / clicks)

### Sample GAQL Query

```sql
SELECT 
  ad_group.id,
  ad_group.name,
  campaign.name,
  metrics.cost_micros,
  metrics.conversions,
  segments.date
FROM ad_group 
WHERE segments.date DURING LAST_30_DAYS
ORDER BY metrics.cost_micros DESC
LIMIT 5
```

## Facebook Ads Integration

### Browser Automation Approach (MVP)

For rapid implementation, we use browser automation to extract data from Facebook Ads Manager, avoiding API complexity while achieving the same CPA tracking functionality.

### Dependencies Installation

```bash
# Install required packages
npm install puppeteer cheerio csv-parser fs-extra
npm install --save-dev @types/node

# For alternative Selenium approach
npm install selenium-webdriver chromedriver
```

### Facebook Automation Script

```javascript
const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const path = require('path');

class FacebookAdsExtractor {
  constructor(options = {}) {
    this.downloadPath = options.downloadPath || './downloads';
    this.headless = options.headless !== false;
    this.credentials = options.credentials;
  }

  async initialize() {
    this.browser = await puppeteer.launch({
      headless: this.headless,
      defaultViewport: { width: 1280, height: 720 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    this.page = await this.browser.newPage();
    
    // Set download behavior
    await this.page._client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: this.downloadPath
    });
  }

  async loginToFacebook() {
    await this.page.goto('https://business.facebook.com/adsmanager');
    
    // Wait for login form
    await this.page.waitForSelector('input[name="email"]', { timeout: 10000 });
    
    // Fill credentials
    await this.page.type('input[name="email"]', this.credentials.email);
    await this.page.type('input[name="pass"]', this.credentials.password);
    
    // Submit login
    await this.page.click('button[name="login"]');
    
    // Wait for dashboard
    await this.page.waitForSelector('[data-testid="adsmanager-table"]', { 
      timeout: 30000 
    });
  }

  async navigateToAdSets() {
    // Click on Ad Sets tab
    await this.page.waitForSelector('[data-testid="adset-tab"]');
    await this.page.click('[data-testid="adset-tab"]');
    
    // Set date range to yesterday
    await this.page.waitForSelector('[data-testid="date-picker"]');
    await this.page.click('[data-testid="date-picker"]');
    await this.page.click('[data-testid="yesterday-option"]');
    
    // Sort by spend (descending)
    await this.page.waitForSelector('[data-testid="spend-column-header"]');
    await this.page.click('[data-testid="spend-column-header"]');
  }

  async exportTopAdSetsCSV() {
    // Click export button
    await this.page.waitForSelector('[data-testid="export-button"]');
    await this.page.click('[data-testid="export-button"]');
    
    // Select CSV format
    await this.page.waitForSelector('[data-testid="csv-option"]');
    await this.page.click('[data-testid="csv-option"]');
    
    // Configure columns for CPA tracking
    await this.page.waitForSelector('[data-testid="customize-columns"]');
    await this.page.click('[data-testid="customize-columns"]');
    
    // Ensure required metrics are selected
    const requiredMetrics = [
      'ad_set_name',
      'spend',
      'results',
      'cost_per_result',
      'impressions',
      'clicks'
    ];
    
    for (const metric of requiredMetrics) {
      await this.page.click(`[data-testid="metric-${metric}"]`);
    }
    
    // Start export
    await this.page.click('[data-testid="export-start"]');
    
    // Wait for download completion
    await this.page.waitForTimeout(5000);
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Usage example
async function extractFacebookData() {
  const extractor = new FacebookAdsExtractor({
    credentials: {
      email: process.env.FACEBOOK_EMAIL,
      password: process.env.FACEBOOK_PASSWORD
    },
    downloadPath: './facebook-exports'
  });

  try {
    await extractor.initialize();
    await extractor.loginToFacebook();
    await extractor.navigateToAdSets();
    await extractor.exportTopAdSetsCSV();
    
    console.log('Facebook data export completed');
  } catch (error) {
    console.error('Export failed:', error);
  } finally {
    await extractor.close();
  }
}
```

### Data Processing Pipeline

```javascript
const csv = require('csv-parser');
const { BigQuery } = require('@google-cloud/bigquery');

class FacebookDataProcessor {
  constructor() {
    this.bigquery = new BigQuery();
    this.dataset = this.bigquery.dataset('marketing_data');
    this.table = this.dataset.table('facebook_ad_sets');
  }

  async processCSV(filePath) {
    const results = [];
    
    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          // Transform Facebook CSV data to match our schema
          const transformedRow = {
            date: new Date().toISOString().split('T')[0],
            platform: 'facebook',
            ad_set_id: row['Ad Set ID'] || row['adset_id'],
            ad_set_name: row['Ad Set Name'] || row['adset_name'],
            total_spend: parseFloat(row['Amount Spent'] || row['spend'] || 0),
            conversions: parseInt(row['Results'] || row['conversions'] || 0),
            cost_per_conversion: parseFloat(row['Cost per Result'] || 0),
            impressions: parseInt(row['Impressions'] || 0),
            clicks: parseInt(row['Link Clicks'] || row['clicks'] || 0)
          };
          
          // Calculate CPA if not provided
          if (!transformedRow.cost_per_conversion && 
              transformedRow.total_spend && 
              transformedRow.conversions) {
            transformedRow.cost_per_conversion = 
              transformedRow.total_spend / transformedRow.conversions;
          }
          
          results.push(transformedRow);
        })
        .on('end', () => resolve(results))
        .on('error', reject);
    });
  }

  async uploadToBigQuery(data) {
    // Filter to top 5 by spend
    const top5 = data
      .sort((a, b) => b.total_spend - a.total_spend)
      .slice(0, 5);

    // Calculate day-over-day changes
    for (const row of top5) {
      const previousData = await this.getPreviousDay(row.ad_set_id);
      if (previousData) {
        row.cpa_change_percent = 
          ((row.cost_per_conversion - previousData.cost_per_conversion) / 
           previousData.cost_per_conversion) * 100;
      }
    }

    // Insert into BigQuery
    await this.table.insert(top5);
    console.log(`Inserted ${top5.length} Facebook ad sets into BigQuery`);
    
    return top5;
  }

  async getPreviousDay(adSetId) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 2);
    
    const query = `
      SELECT cost_per_conversion
      FROM \`marketing_data.daily_cpa\`
      WHERE ad_set_id = @adSetId
        AND platform = 'facebook'
        AND date = @yesterday
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const [rows] = await this.bigquery.query({
      query,
      params: {
        adSetId,
        yesterday: yesterday.toISOString().split('T')[0]
      }
    });

    return rows[0] || null;
  }
}
```

### Automation Scheduling

```javascript
// schedule-facebook-export.js
const cron = require('node-cron');
const FacebookAdsExtractor = require('./facebook-extractor');
const FacebookDataProcessor = require('./facebook-processor');

// Run daily at 3 AM UTC (after Google Ads sync)
cron.schedule('0 3 * * *', async () => {
  console.log('Starting Facebook data extraction...');
  
  try {
    // Extract data
    const extractor = new FacebookAdsExtractor({
      credentials: {
        email: process.env.FACEBOOK_EMAIL,
        password: process.env.FACEBOOK_PASSWORD
      }
    });

    await extractor.initialize();
    await extractor.loginToFacebook();
    await extractor.navigateToAdSets();
    await extractor.exportTopAdSetsCSV();
    await extractor.close();

    // Process and upload
    const processor = new FacebookDataProcessor();
    const latestFile = getLatestCSVFile('./facebook-exports');
    const data = await processor.processCSV(latestFile);
    await processor.uploadToBigQuery(data);

    console.log('Facebook data sync completed successfully');
  } catch (error) {
    console.error('Facebook sync failed:', error);
    // Send alert to team
    await sendSlackAlert('Facebook sync failed', error.message);
  }
});

function getLatestCSVFile(directory) {
  const files = fs.readdirSync(directory)
    .filter(file => file.endsWith('.csv'))
    .map(file => ({
      name: file,
      path: path.join(directory, file),
      mtime: fs.statSync(path.join(directory, file)).mtime
    }))
    .sort((a, b) => b.mtime - a.mtime);

  return files[0]?.path;
}
```

### Manual Export Steps (Backup Method)

If automation fails, manual export from Facebook Ads Manager:

1. **Login to Facebook Ads Manager**
   - Navigate to [business.facebook.com/adsmanager](https://business.facebook.com/adsmanager)
   - Select your ad account

2. **Configure Report View**
   - Click "Ad Sets" tab in the main navigation
   - Set date range to "Yesterday" 
   - Sort by "Amount Spent" (descending)
   - Select top 5 ad sets by spend

3. **Customize Columns**
   - Click the "Columns" dropdown
   - Select "Customize Columns"
   - Ensure these metrics are included:
     - Ad Set Name
     - Amount Spent
     - Results (or your custom conversion event)
     - Cost per Result
     - Impressions
     - Link Clicks
     - Reach

4. **Export Data**
   - Click "Export" button (top right)
   - Select "Export Table Data"
   - Choose "CSV" format
   - Click "Export"

5. **File Processing**
   - Download will appear in your browser's downloads folder
   - File naming convention: `AdsManagerReport_YYYY-MM-DD.csv`
   - Place file in `./facebook-exports/` directory for processing

### Error Handling and Monitoring

```javascript
// monitoring.js
const { Logging } = require('@google-cloud/logging');

class FacebookMonitor {
  constructor() {
    this.logging = new Logging();
    this.log = this.logging.log('facebook-automation');
  }

  async logError(operation, error, context = {}) {
    const metadata = {
      resource: { type: 'gce_instance' },
      severity: 'ERROR',
      labels: {
        operation,
        platform: 'facebook'
      }
    };

    const entry = this.log.entry(metadata, {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    });

    await this.log.write(entry);
    
    // Send Slack alert for critical errors
    if (this.isCriticalError(error)) {
      await this.sendSlackAlert(operation, error);
    }
  }

  isCriticalError(error) {
    const criticalPatterns = [
      'login failed',
      'timeout exceeded',
      'element not found',
      'bigquery insert failed'
    ];
    
    return criticalPatterns.some(pattern => 
      error.message.toLowerCase().includes(pattern)
    );
  }

  async sendSlackAlert(operation, error) {
    const webhook = process.env.SLACK_WEBHOOK_URL;
    if (!webhook) return;

    const payload = {
      text: `🚨 Facebook Automation Alert`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Operation:* ${operation}\n*Error:* ${error.message}\n*Time:* ${new Date().toISOString()}`
          }
        }
      ]
    };

    try {
      await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (slackError) {
      console.error('Failed to send Slack alert:', slackError);
    }
  }
}

// Enhanced error handling in main script
async function extractFacebookDataWithMonitoring() {
  const monitor = new FacebookMonitor();
  
  try {
    await extractFacebookData();
  } catch (error) {
    await monitor.logError('facebook_extraction', error, {
      timestamp: new Date().toISOString(),
      user_agent: 'puppeteer'
    });
    
    // Attempt fallback method
    try {
      await fallbackManualExport();
    } catch (fallbackError) {
      await monitor.logError('facebook_fallback', fallbackError);
      throw fallbackError;
    }
  }
}
```

### Troubleshooting Facebook Automation

#### Common Issues and Solutions

1. **Login Failures**
   ```javascript
   // Handle 2FA challenges
   async loginWithTwoFactor() {
     await this.page.type('input[name="email"]', this.credentials.email);
     await this.page.type('input[name="pass"]', this.credentials.password);
     await this.page.click('button[name="login"]');
     
     // Check for 2FA prompt
     try {
       await this.page.waitForSelector('input[name="approvals_code"]', { timeout: 5000 });
       console.log('2FA required - check your device for code');
       
       // Wait for manual 2FA entry (or implement automated solution)
       await this.page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 60000 });
     } catch (e) {
       // No 2FA required, continue
     }
   }
   ```

2. **Element Selector Changes**
   ```javascript
   // Use multiple fallback selectors
   async clickWithFallback(selectors) {
     for (const selector of selectors) {
       try {
         await this.page.waitForSelector(selector, { timeout: 2000 });
         await this.page.click(selector);
         return;
       } catch (e) {
         console.log(`Selector ${selector} failed, trying next...`);
       }
     }
     throw new Error('All selectors failed');
   }
   
   // Usage
   await this.clickWithFallback([
     '[data-testid="export-button"]',
     'button[aria-label="Export"]',
     'button:contains("Export")'
   ]);
   ```

3. **Rate Limiting and Timeouts**
   ```javascript
   // Add delays and retry logic
   async exportWithRetry(maxRetries = 3) {
     for (let attempt = 1; attempt <= maxRetries; attempt++) {
       try {
         await this.exportTopAdSetsCSV();
         return;
       } catch (error) {
         if (attempt === maxRetries) throw error;
         
         console.log(`Export attempt ${attempt} failed, retrying in ${attempt * 5}s...`);
         await this.page.waitForTimeout(attempt * 5000);
       }
     }
   }
   ```

### Security Considerations

#### Credential Management

```javascript
// Use Google Secret Manager for credentials
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

class CredentialManager {
  constructor() {
    this.client = new SecretManagerServiceClient();
  }

  async getFacebookCredentials() {
    const [emailSecret] = await this.client.accessSecretVersion({
      name: 'projects/your-project/secrets/facebook-email/versions/latest'
    });
    
    const [passwordSecret] = await this.client.accessSecretVersion({
      name: 'projects/your-project/secrets/facebook-password/versions/latest'
    });

    return {
      email: emailSecret.payload.data.toString(),
      password: passwordSecret.payload.data.toString()
    };
  }
}
```

#### Browser Security

```javascript
// Enhanced security settings
async initialize() {
  this.browser = await puppeteer.launch({
    headless: this.headless,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--disable-default-apps',
      '--disable-extensions',
      '--incognito'
    ],
    defaultViewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true
  });
}
```

## BigQuery Data Transfer Setup

### Automated Daily Imports

The BigQuery Data Transfer Service automatically imports Google Ads data daily:

1. Navigate to BigQuery → Data Transfers
2. Create new Google Ads transfer
3. Configure schedule for daily execution at 2 AM UTC
4. Map to `marketing_data` dataset

### Transfer Configuration

```json
{
  "destination_dataset_id": "marketing_data",
  "schedule": "every day 02:00",
  "data_source_id": "google_ads",
  "display_name": "Daily Google Ads Import",
  "params": {
    "customer_id": "YOUR_GOOGLE_ADS_CUSTOMER_ID",
    "table_filter": "AdGroupStats,CampaignStats"
  }
}
```

## CPA Calculation Logic

### Daily Processing Workflow

1. **Data Extraction**: Pull previous day's ad performance data
2. **Top 5 Identification**: Rank ad sets by total spend
3. **CPA Calculation**: cost_micros ÷ conversions ÷ 1,000,000
4. **Change Detection**: Compare with previous day's CPA
5. **Alert Generation**: Flag changes > 20%

### Cloud Function Implementation

```javascript
exports.calculateDailyCPA = async (req, res) => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Query top 5 ad sets by spend
  const query = `
    SELECT 
      ad_set_id,
      ad_set_name,
      SUM(cost_micros) / 1000000 as total_spend,
      SUM(conversions) as total_conversions,
      (SUM(cost_micros) / 1000000) / SUM(conversions) as cpa
    FROM \`marketing_data.google_ads_adgroup_stats\`
    WHERE _DATA_DATE = @yesterday
    GROUP BY ad_set_id, ad_set_name
    ORDER BY total_spend DESC
    LIMIT 5
  `;
  
  // Execute calculation and store results
  const results = await bigquery.query({
    query: query,
    params: { yesterday: yesterday.toISOString().split('T')[0] }
  });
  
  // Calculate day-over-day changes and send alerts
  await processCPAChanges(results);
};
```

## Monitoring and Alerts

### Alert Thresholds

- **Critical**: CPA increase > 50%
- **Warning**: CPA increase > 20%
- **Info**: CPA change > 10%

### Notification Channels

- Email reports to marketing team
- Slack integration for real-time alerts
- Dashboard annotations for significant changes

## Dashboard and Reporting

### Looker Studio Integration

Connect BigQuery to Looker Studio for real-time visualization:

1. Create new Looker Studio report
2. Add BigQuery connector
3. Select `marketing_data` dataset
4. Configure charts for CPA trends and top performers

### Key Visualizations

- Daily CPA trend lines for top 5 ad sets
- Spend vs. CPA scatter plot
- Platform comparison charts
- Alert timeline and resolution tracking

## Development Setup

```bash
# Clone repository
git clone <repository-url>
cd MarketingDash-google-bigquery

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API credentials

# Deploy Cloud Functions
npm run deploy

# Set up scheduled jobs
npm run setup-scheduler
```

## Environment Variables

```bash
# Google Ads API
GOOGLE_ADS_DEVELOPER_TOKEN=your_developer_token
GOOGLE_ADS_CLIENT_ID=your_client_id
GOOGLE_ADS_CLIENT_SECRET=your_client_secret
GOOGLE_ADS_REFRESH_TOKEN=your_refresh_token

# Google Cloud
GOOGLE_CLOUD_PROJECT_ID=your_project_id
BIGQUERY_DATASET_ID=marketing_data

# Facebook Browser Automation
FACEBOOK_EMAIL=your_facebook_email
FACEBOOK_PASSWORD=your_facebook_password
SLACK_WEBHOOK_URL=your_slack_webhook_for_alerts

# Future Facebook Marketing API
FACEBOOK_APP_ID=your_app_id
FACEBOOK_APP_SECRET=your_app_secret
FACEBOOK_ACCESS_TOKEN=your_long_lived_token
```

## Cost Considerations

### Google Cloud Pricing

- **BigQuery**: ~$0.02 per GB processed (estimated $5-10/month)
- **Cloud Functions**: ~$0.0000004 per invocation (estimated $1-2/month)
- **Data Transfer**: Free for Google Ads imports
- **Storage**: ~$0.02 per GB per month (estimated $1-3/month)

**Total estimated cost**: $7-15/month for typical usage

## Security Best Practices

- Store API credentials in Google Secret Manager
- Use service accounts with minimal required permissions
- Enable audit logging for all BigQuery operations
- Implement IP restrictions for API access
- Regular token rotation for Facebook access tokens

## Troubleshooting

### Common Issues

1. **API Rate Limits**: Implement exponential backoff
2. **Token Expiration**: Set up automated refresh mechanisms
3. **Data Delays**: Account for 24-48 hour reporting delays
4. **Schema Changes**: Monitor for API version updates

### Debug Logs

```bash
# View Cloud Function logs
gcloud functions logs read calculateDailyCPA --limit 50

# Check BigQuery job status
bq ls -j --max_results 10
```

## Roadmap

### Phase 1 (Current)
- ✅ Google Ads API integration
- ✅ BigQuery data warehouse setup
- ✅ Daily CPA calculation logic

### Phase 2 (Current)
- ✅ Facebook browser automation integration
- 🔄 Unified dashboard development
- 🔄 Advanced alerting system

### Phase 3 (Future)
- Facebook Marketing API migration (from browser automation)
- Microsoft Ads integration
- TikTok Ads API support
- Machine learning predictions
- Custom attribution modeling

## Future Facebook Marketing API Integration

### Migration Path from Browser Automation

When ready to upgrade from browser automation to the Facebook Marketing API:

#### API Authentication Setup

```javascript
// facebook-api-client.js
const FacebookAdsApi = require('facebook-nodejs-business-sdk').FacebookAdsApi;
const AdAccount = require('facebook-nodejs-business-sdk').AdAccount;
const AdsInsights = require('facebook-nodejs-business-sdk').AdsInsights;

class FacebookApiClient {
  constructor(accessToken, adAccountId) {
    this.api = FacebookAdsApi.init(accessToken);
    this.adAccount = new AdAccount(adAccountId);
  }

  async getAdSetInsights(datePreset = 'yesterday') {
    const fields = [
      AdsInsights.Field.adset_id,
      AdsInsights.Field.adset_name,
      AdsInsights.Field.spend,
      AdsInsights.Field.actions,
      AdsInsights.Field.impressions,
      AdsInsights.Field.clicks
    ];

    const params = {
      time_range: datePreset,
      level: 'adset',
      limit: 5,
      sort: ['spend_descending']
    };

    const insights = await this.adAccount.getInsights(fields, params);
    return this.processInsightsData(insights);
  }

  processInsightsData(insights) {
    return insights.map(insight => {
      const conversions = this.extractConversions(insight.actions);
      const spend = parseFloat(insight.spend || 0);
      
      return {
        ad_set_id: insight.adset_id,
        ad_set_name: insight.adset_name,
        total_spend: spend,
        conversions: conversions,
        cost_per_conversion: conversions > 0 ? spend / conversions : 0,
        impressions: parseInt(insight.impressions || 0),
        clicks: parseInt(insight.clicks || 0)
      };
    });
  }

  extractConversions(actions) {
    if (!actions) return 0;
    
    // Look for purchase or lead events
    const conversionEvents = ['purchase', 'lead', 'complete_registration'];
    
    for (const action of actions) {
      if (conversionEvents.includes(action.action_type)) {
        return parseInt(action.value || 0);
      }
    }
    
    return 0;
  }
}
```

#### API Rate Limit Management

```javascript
// rate-limiter.js
class FacebookRateLimiter {
  constructor() {
    this.callCount = 0;
    this.windowStart = Date.now();
    this.maxCallsPerHour = 200; // Conservative limit
  }

  async throttle() {
    const now = Date.now();
    const hourElapsed = (now - this.windowStart) / (1000 * 60 * 60);
    
    if (hourElapsed >= 1) {
      // Reset window
      this.callCount = 0;
      this.windowStart = now;
    }
    
    if (this.callCount >= this.maxCallsPerHour) {
      const waitTime = (1000 * 60 * 60) - (now - this.windowStart);
      console.log(`Rate limit reached, waiting ${waitTime / 1000}s`);
      await this.sleep(waitTime);
      return this.throttle();
    }
    
    this.callCount++;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

#### Enhanced Error Handling for API

```javascript
// facebook-api-with-fallback.js
class FacebookDataExtractorHybrid {
  constructor(options) {
    this.apiClient = new FacebookApiClient(
      options.accessToken, 
      options.adAccountId
    );
    this.browserExtractor = new FacebookAdsExtractor(options);
    this.rateLimiter = new FacebookRateLimiter();
  }

  async extractData() {
    try {
      // Try API first
      await this.rateLimiter.throttle();
      const apiData = await this.apiClient.getAdSetInsights();
      console.log('Successfully extracted data via API');
      return apiData;
      
    } catch (apiError) {
      console.warn('API extraction failed, falling back to browser automation:', apiError.message);
      
      try {
        // Fallback to browser automation
        await this.browserExtractor.initialize();
        await this.browserExtractor.loginToFacebook();
        await this.browserExtractor.navigateToAdSets();
        await this.browserExtractor.exportTopAdSetsCSV();
        
        const processor = new FacebookDataProcessor();
        const latestFile = getLatestCSVFile('./facebook-exports');
        const browserData = await processor.processCSV(latestFile);
        
        console.log('Successfully extracted data via browser automation');
        return browserData;
        
      } catch (browserError) {
        console.error('Both API and browser extraction failed');
        throw new Error(`API Error: ${apiError.message}, Browser Error: ${browserError.message}`);
      } finally {
        await this.browserExtractor.close();
      }
    }
  }
}
```

#### Migration Benefits

- **Reliability**: Direct API access eliminates browser dependency
- **Speed**: Faster data retrieval (seconds vs minutes)
- **Accuracy**: Real-time data without CSV parsing inconsistencies
- **Maintenance**: No need to update selectors for UI changes

#### Migration Timeline

1. **Week 1**: Set up Facebook App and API credentials
2. **Week 2**: Implement API client and test data extraction
3. **Week 3**: Add rate limiting and error handling
4. **Week 4**: Deploy hybrid system with fallback capability
5. **Week 5**: Monitor and optimize, gradually phase out browser automation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## Support

- Documentation: [Link to detailed docs]
- Issues: [GitHub Issues]
- Slack: #marketing-dash channel

## License

MIT License - see LICENSE file for details

---

**Last Updated**: October 2025
**Version**: 1.0.0
**Maintainer**: Marketing Engineering Team
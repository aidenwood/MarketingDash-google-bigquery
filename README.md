# MarketingDash - Google BigQuery Integration

A comprehensive marketing dashboard that tracks Cost Per Acquisition (CPA) across Google Ads and Facebook advertising platforms, with automated daily reporting and BigQuery data warehousing.

## Overview

MarketingDash provides automated daily tracking of your top-performing ad sets across multiple platforms, calculating CPA changes and providing actionable insights for marketing teams. The system focuses on the top 5 ad sets by total spend and monitors day-over-day CPA fluctuations.

## Key Features

- **Daily CPA Tracking**: Automated calculation of Cost Per Conversion for top 5 ad sets
- **Multi-Platform Support**: Google Ads and Facebook Marketing API integration
- **BigQuery Integration**: Centralized data warehouse for all marketing metrics
- **Real-time Dashboards**: Visual reporting with Looker Studio integration
- **Automated Alerts**: Notifications for significant CPA changes
- **Historical Analysis**: Trend tracking and performance comparisons

## Architecture

```
Google Ads API ──┐
                 ├── BigQuery Data Transfer ──► BigQuery ──► Looker Studio
Facebook API ────┘                              │
                                                └── Cloud Functions (CPA Calculations)
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
- Facebook Business account with Marketing API access
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

#### Facebook Marketing API
1. Create a Facebook App in [Facebook for Developers](https://developers.facebook.com/)
2. Add Marketing API product
3. Generate long-lived access tokens
4. Configure app permissions for ads insights

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

# Facebook Marketing API (coming soon)
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

### Phase 2 (Next)
- 🔄 Facebook Marketing API integration
- 🔄 Unified dashboard development
- 🔄 Advanced alerting system

### Phase 3 (Future)
- Microsoft Ads integration
- TikTok Ads API support
- Machine learning predictions
- Custom attribution modeling

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
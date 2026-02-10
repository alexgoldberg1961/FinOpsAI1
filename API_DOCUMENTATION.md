# FinOps Backend API Documentation

## Overview

The FinOps Backend is a Flask-based REST API that analyzes Azure usage data and provides cost insights and optimization recommendations.

## API Reference

### Authentication

Currently, the API uses no authentication. For production, implement:
- API Keys
- Azure AD/OAuth2
- Mutual TLS

### Response Format

All responses are JSON with the following structure:

**Success:**
```json
{
  "data": {},
  "timestamp": "2024-02-05T10:30:00Z",
  "status": "success"
}
```

**Error:**
```json
{
  "error": "Error message",
  "status": "error",
  "code": 400
}
```

## Endpoints

### Health Check
```
GET /api/health
```
Check if the service is running and healthy.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-02-05T10:30:00Z",
  "service": "FinOps Azure Cost Analysis"
}
```

### Cost Summary
```
GET /api/cost-summary
```
Get overall cost metrics and summary statistics.

**Response:**
```json
{
  "total_cost": 5432.10,
  "average_daily_cost": 181.07,
  "resource_count": 45,
  "unique_resources": 40,
  "unique_locations": 3,
  "unique_resource_types": 8,
  "total_usage": 12345.67,
  "data_points": 450,
  "timestamp": "2024-02-05T10:30:00Z"
}
```

### Cost Breakdown
```
GET /api/cost-breakdown?by=resource_type|location|service|meter
```

**Parameters:**
- `by` (string): Breakdown category (default: resource_type)

**Response:**
```json
{
  "breakdown_by": "resource_type",
  "data": [
    {
      "category": "Virtual Machine",
      "cost": 2500.00,
      "usage_quantity": 5000,
      "percentage": 46.05
    },
    ...
  ],
  "timestamp": "2024-02-05T10:30:00Z"
}
```

### Cost Trends
```
GET /api/trend-analysis?days=30
```

**Parameters:**
- `days` (integer): Number of days to analyze (default: 30)

**Response:**
```json
{
  "trends": [
    {
      "date": "2024-01-06",
      "cost": 180.45
    },
    ...
  ],
  "period_days": 30,
  "timestamp": "2024-02-05T10:30:00Z"
}
```

### Most Expensive Resources
```
GET /api/most-expensive-resources?limit=10
```

**Parameters:**
- `limit` (integer): Number of resources to return (default: 10)

**Response:**
```json
{
  "resources": [
    {
      "name": "prod-vm-01",
      "cost": 450.00,
      "resource_type": "Virtual Machine",
      "location": "eastus",
      "usage_quantity": 730,
      "percentage": 8.28
    },
    ...
  ],
  "count": 10,
  "timestamp": "2024-02-05T10:30:00Z"
}
```

### Most Used Resources
```
GET /api/most-used-resources?limit=10
```

**Response:**
```json
{
  "resources": [
    {
      "name": "storage-account-01",
      "usage_quantity": 5000,
      "cost": 150.00,
      "resource_type": "Storage Account",
      "location": "eastus",
      "cost_per_unit": 0.03
    },
    ...
  ],
  "count": 10,
  "timestamp": "2024-02-05T10:30:00Z"
}
```

### Least Used Resources
```
GET /api/least-used-resources?limit=10
```

**Response:**
```json
{
  "resources": [
    {
      "name": "unused-app-service",
      "usage_quantity": 0.5,
      "cost": 25.00,
      "resource_type": "App Service",
      "location": "westus"
    },
    ...
  ],
  "count": 10,
  "timestamp": "2024-02-05T10:30:00Z"
}
```

### Usage Report
```
GET /api/usage-report?days=30&resource_type=Virtual Machine
```

**Parameters:**
- `days` (integer): Number of days (default: 30)
- `resource_type` (string): Filter by resource type (optional)

**Response:**
```json
{
  "total_cost": 5432.10,
  "total_usage": 12345.67,
  "resource_count": 45,
  "average_cost_per_resource": 120.71,
  "period_days": 30
}
```

### Recommendations
```
GET /api/recommendations
```
Get cost optimization recommendations based on usage patterns.

**Response:**
```json
{
  "recommendations": [
    {
      "id": "R001",
      "title": "Remove Unused Resources",
      "description": "Found 5 resources with minimal usage",
      "severity": "High",
      "estimated_savings": 500.00,
      "details": [
        {
          "resource": "unused-vm-01",
          "type": "Virtual Machine",
          "cost": 100.00,
          "usage": 0.5,
          "action": "Delete or stop the resource"
        }
      ]
    },
    {
      "id": "R003",
      "title": "Purchase Reserved Instances",
      "description": "Migrate high-usage resources to reserved instances",
      "severity": "High",
      "estimated_savings": 1500.00,
      "details": [...]
    },
    ...
  ],
  "count": 7,
  "timestamp": "2024-02-05T10:30:00Z"
}
```

### Refresh Data
```
POST /api/refresh-data
```
Manually trigger a refresh of data from Azure Storage.

**Response:**
```json
{
  "status": "success",
  "message": "Data refreshed successfully",
  "timestamp": "2024-02-05T10:30:00Z"
}
```

## Data Models

### Resource Object
```typescript
{
  name: string;
  cost: number;
  resource_type: string;
  location: string;
  usage_quantity: number;
  percentage?: number;
  cost_per_unit?: number;
}
```

### Cost Breakdown Item
```typescript
{
  category: string;
  cost: number;
  usage_quantity: number;
  percentage: number;
}
```

### Recommendation Object
```typescript
{
  id: string;
  title: string;
  description: string;
  severity: "High" | "Medium" | "Low";
  estimated_savings: number;
  details: object[];
}
```

## Error Codes

| Code | Message | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 400 | Bad Request | Invalid parameters |
| 404 | Not Found | Resource or endpoint not found |
| 500 | Internal Server Error | Server error |

## Rate Limiting

Currently not implemented. For production, implement:
- 100 requests per minute per API key
- 1000 requests per day per API key

## Pagination

For large result sets, implement:
- `limit` parameter (default: 100, max: 1000)
- `offset` parameter (default: 0)
- `total_count` in response

## Caching

- Cost data cached for 1 hour
- Manual refresh available via `POST /api/refresh-data`
- Cache invalidation on data upload

## WebSocket Events (Future)

```javascript
// Real-time cost updates
ws.on('cost_update', (data) => {
  console.log('Cost changed:', data);
});

// Recommendation alerts
ws.on('new_recommendation', (rec) => {
  console.log('New recommendation:', rec);
});
```

## Example Requests

### Using cURL

```bash
# Health check
curl http://localhost:5000/api/health

# Get cost summary
curl http://localhost:5000/api/cost-summary

# Get recommendations
curl http://localhost:5000/api/recommendations

# Get most expensive resources
curl 'http://localhost:5000/api/most-expensive-resources?limit=5'

# Get cost breakdown by location
curl 'http://localhost:5000/api/cost-breakdown?by=location'
```

### Using Python

```python
import requests

BASE_URL = "http://localhost:5000/api"

# Get cost summary
response = requests.get(f"{BASE_URL}/cost-summary")
summary = response.json()

# Get recommendations
response = requests.get(f"{BASE_URL}/recommendations")
recommendations = response.json()

# Refresh data
response = requests.post(f"{BASE_URL}/refresh-data")
```

### Using JavaScript

```javascript
const BASE_URL = 'http://localhost:5000/api';

// Get cost summary
fetch(`${BASE_URL}/cost-summary`)
  .then(res => res.json())
  .then(data => console.log(data));

// Get recommendations
fetch(`${BASE_URL}/recommendations`)
  .then(res => res.json())
  .then(data => console.log(data));
```

## Best Practices

1. **Caching**: Cache responses on the client side for frequently accessed data
2. **Pagination**: Use pagination for large result sets
3. **Filtering**: Filter data on the client when possible to reduce API calls
4. **Error Handling**: Implement proper error handling and retry logic
5. **Rate Limiting**: Respect rate limits and implement exponential backoff

## Versioning

Current API Version: `v1`

Future versions will support:
- `/api/v2/` endpoints
- Backward compatibility
- Deprecation notices

---

**Last Updated:** February 2026
**API Version:** 1.0.0

/**
 * Mock Backend Server for Testing
 * Simulates the Flask API responses
 */

const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Sample data
const sampleData = {
  costSummary: {
    total_cost: 5432.10,
    average_daily_cost: 181.07,
    resource_count: 45,
    unique_resources: 40,
    unique_locations: 3,
    unique_resource_types: 8,
    total_usage: 12345.67,
    data_points: 450,
    timestamp: new Date().toISOString()
  },
  
  trends: Array.from({ length: 30 }, (_, i) => ({
    date: new Date(new Date().setDate(new Date().getDate() - (30 - i))).toISOString().split('T')[0],
    cost: Math.random() * 200 + 150
  })),
  
  costBreakdown: {
    resource_type: [
      { category: 'Virtual Machine', cost: 1200, usage_quantity: 2000, percentage: 22.1 },
      { category: 'Storage Account', cost: 450, usage_quantity: 10000, percentage: 8.3 },
      { category: 'Database', cost: 920, usage_quantity: 2000, percentage: 16.9 },
      { category: 'App Service', cost: 180, usage_quantity: 350, percentage: 3.3 },
      { category: 'Key Vault', cost: 15, usage_quantity: 1000, percentage: 0.3 },
      { category: 'Other', cost: 2667.1, usage_quantity: -1, percentage: 49.1 }
    ],
    location: [
      { category: 'eastus', cost: 3200, usage_quantity: 5000, percentage: 58.9 },
      { category: 'westus', cost: 1500, usage_quantity: 3000, percentage: 27.6 },
      { category: 'northeurope', cost: 732.1, usage_quantity: 1000, percentage: 13.5 }
    ],
    service: [
      { category: 'Compute', cost: 2500, usage_quantity: 5000, percentage: 46.0 },
      { category: 'Storage', cost: 1200, usage_quantity: 8000, percentage: 22.1 },
      { category: 'Database', cost: 1000, usage_quantity: 2000, percentage: 18.4 },
      { category: 'Networking', cost: 400, usage_quantity: 1000, percentage: 7.4 },
      { category: 'Other', cost: 332.1, usage_quantity: 500, percentage: 6.1 }
    ],
    meter: [
      { category: 'Compute Hours', cost: 1800, usage_quantity: 3000, percentage: 33.1 },
      { category: 'Data Stored', cost: 450, usage_quantity: 5000, percentage: 8.3 },
      { category: 'Database Compute', cost: 920, usage_quantity: 1200, percentage: 16.9 },
      { category: 'Other', cost: 2262.1, usage_quantity: 2000, percentage: 41.7 }
    ]
  },
  
  mostExpensive: [
    { name: 'prod-sql-01', cost: 600, resource_type: 'SQL Database', location: 'eastus', usage_quantity: 1200, percentage: 11.0 },
    { name: 'prod-vm-01', cost: 450, resource_type: 'Virtual Machine', location: 'eastus', usage_quantity: 730, percentage: 8.3 },
    { name: 'prod-vm-02', cost: 420, resource_type: 'Virtual Machine', location: 'eastus', usage_quantity: 680, percentage: 7.7 },
    { name: 'prod-db-01', cost: 320, resource_type: 'Database', location: 'eastus', usage_quantity: 600, percentage: 5.9 },
    { name: 'dev-vm-01', cost: 250, resource_type: 'Virtual Machine', location: 'westus', usage_quantity: 400, percentage: 4.6 }
  ],
  
  mostUsed: [
    { name: 'prodsa01', usage_quantity: 5000, cost: 150, resource_type: 'Storage Account', location: 'eastus', cost_per_unit: 0.03 },
    { name: 'prod-eh-01', usage_quantity: 2500, cost: 200, resource_type: 'Event Hub', location: 'eastus', cost_per_unit: 0.08 },
    { name: 'prod-vm-01', usage_quantity: 730, cost: 450, resource_type: 'Virtual Machine', location: 'eastus', cost_per_unit: 0.62 },
    { name: 'devsa01', usage_quantity: 2000, cost: 80, resource_type: 'Storage Account', location: 'westus', cost_per_unit: 0.04 },
    { name: 'prod-sb-01', usage_quantity: 1500, cost: 120, resource_type: 'Service Bus', location: 'eastus', cost_per_unit: 0.08 }
  ],
  
  leastUsed: [
    { name: 'unused-vm-01', usage_quantity: 0.5, cost: 25, resource_type: 'Virtual Machine', location: 'eastus' },
    { name: 'unused-app-service', usage_quantity: 10, cost: 50, resource_type: 'App Service', location: 'westus' },
    { name: 'old-storage-01', usage_quantity: 5, cost: 15, resource_type: 'Storage Account', location: 'eastus' }
  ],
  
  recommendations: [
    {
      id: 'R001',
      title: 'Remove Unused Resources',
      description: 'Found 5 resources with minimal usage that can be deleted',
      severity: 'High',
      estimated_savings: 500,
      details: [
        { resource: 'unused-vm-01', type: 'Virtual Machine', cost: 25, usage: 0.5, action: 'Delete' },
        { resource: 'unused-app-service', type: 'App Service', cost: 50, usage: 10, action: 'Stop' }
      ]
    },
    {
      id: 'R003',
      title: 'Purchase Reserved Instances',
      description: 'Migrate high-usage resources to reserved instances for better pricing',
      severity: 'High',
      estimated_savings: 1500,
      details: [
        { resource_type: 'Virtual Machine', current_cost: 1200, estimated_savings_with_ri: 360 },
        { resource_type: 'Database', current_cost: 920, estimated_savings_with_ri: 276 }
      ]
    },
    {
      id: 'R004',
      title: 'Right-size Over-provisioned Resources',
      description: 'Downsize resources with low utilization',
      severity: 'Medium',
      estimated_savings: 250,
      details: [
        { resource_type: 'Virtual Machine', avg_usage: 50, current_cost: 1200, estimated_savings: 300 }
      ]
    },
    {
      id: 'R002',
      title: 'Optimize by Location',
      description: 'Consider consolidating resources to lower-cost regions',
      severity: 'Medium',
      estimated_savings: 400,
      details: [
        { from: 'westus', to: 'eastus', current_cost: 1500, potential_savings: 300 }
      ]
    },
    {
      id: 'R005',
      title: 'Apply Azure Hybrid Benefit',
      description: 'Use existing licenses for Windows and SQL Server',
      severity: 'Medium',
      estimated_savings: 600,
      details: [
        { benefit: 'Azure Hybrid Benefit for Windows Server and SQL Server', current_cost: 1500, estimated_savings: 600 }
      ]
    }
  ]
};

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'FinOps Azure Cost Analysis (Mock)'
  });
});

// Cost summary
app.get('/api/cost-summary', (req, res) => {
  res.json(sampleData.costSummary);
});

// Cost breakdown
app.get('/api/cost-breakdown', (req, res) => {
  const breakdownBy = req.query.by || 'resource_type';
  res.json({
    breakdown_by: breakdownBy,
    data: sampleData.costBreakdown[breakdownBy] || [],
    timestamp: new Date().toISOString()
  });
});

// Trends
app.get('/api/trend-analysis', (req, res) => {
  const days = req.query.days || 30;
  res.json({
    trends: sampleData.trends,
    period_days: days,
    timestamp: new Date().toISOString()
  });
});

// Most expensive
app.get('/api/most-expensive-resources', (req, res) => {
  const limit = req.query.limit || 10;
  res.json({
    resources: sampleData.mostExpensive.slice(0, limit),
    count: sampleData.mostExpensive.length,
    timestamp: new Date().toISOString()
  });
});

// Most used
app.get('/api/most-used-resources', (req, res) => {
  const limit = req.query.limit || 10;
  res.json({
    resources: sampleData.mostUsed.slice(0, limit),
    count: sampleData.mostUsed.length,
    timestamp: new Date().toISOString()
  });
});

// Least used
app.get('/api/least-used-resources', (req, res) => {
  const limit = req.query.limit || 10;
  res.json({
    resources: sampleData.leastUsed.slice(0, limit),
    count: sampleData.leastUsed.length,
    timestamp: new Date().toISOString()
  });
});

// Usage report
app.get('/api/usage-report', (req, res) => {
  const days = req.query.days || 30;
  res.json({
    total_cost: 5432.10,
    total_usage: 12345.67,
    resource_count: 45,
    average_cost_per_resource: 120.71,
    period_days: days
  });
});

// Recommendations
app.get('/api/recommendations', (req, res) => {
  res.json({
    recommendations: sampleData.recommendations,
    count: sampleData.recommendations.length,
    timestamp: new Date().toISOString()
  });
});

// Refresh data
app.post('/api/refresh-data', (req, res) => {
  res.json({
    status: 'success',
    message: 'Data refreshed successfully (mock)',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`✓ Mock API server running on http://localhost:${PORT}`);
  console.log(`✓ CORS enabled for http://localhost:3000`);
});

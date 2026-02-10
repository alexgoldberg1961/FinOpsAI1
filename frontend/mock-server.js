/**
 * Mock Backend Server for Testing
 * Loads real sample data from CSV file
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());

// Proper CSV parser that handles quoted fields
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let insideQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote state
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      // End of field
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add last field
  result.push(current.trim());
  return result;
}

// Load sample data from CSV
function loadSampleDataFromCSV() {
  const csvPath = path.join(__dirname, '..', 'sample-usage.csv');
  
  try {
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.trim().split('\n');
    const headers = parseCSVLine(lines[0]);
    
    // Create column index map
    const colIndex = {};
    headers.forEach((h, i) => {
      colIndex[h.trim()] = i;
    });
    
    const resources = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      
      // Use UnitPrice as it's the actual charged amount per unit
      // Quantity * UnitPrice = effective cost for billing
      const quantity = parseFloat(values[colIndex['Quantity']] || 0) || 0;
      const unitPrice = parseFloat(values[colIndex['UnitPrice']] || 0) || 0;
      const cost = quantity * unitPrice;  // Calculate effective cost
      const location = values[colIndex['ResourceLocation']] || 'Unknown';
      
      const resource = {
        id: values[colIndex['ResourceId']] || '',
        name: values[colIndex['ResourceName']] || '',
        resource_type: values[colIndex['MeterCategory']] || 'Unknown',
        location: location,
        meter_category: values[colIndex['MeterCategory']] || 'Unknown',
        meter_name: values[colIndex['MeterName']] || 'Unknown',
        cost: cost > 0 ? cost : (parseFloat(values[colIndex['Cost']] || 0) || 0),  // Fall back to Cost field if calculated is 0
        usage_quantity: quantity,
        date: values[colIndex['Date']] || ''
      };
      
      // Only add if has valid name and location
      if (resource.name && resource.location !== 'Unknown') {
        resources.push(resource);
      }
    }
    
    console.log(`✓ Loaded ${resources.length} resources from sample-usage.csv`);
    return resources;
  } catch (err) {
    console.error('Error loading CSV:', err.message);
    return null;
  }
}

// Process CSV data into API response format
function processSampleData(resources) {
  const costByType = {};
  const costByLocation = {};
  const costByMeter = {};
  let totalCost = 0;
  let totalUsage = 0;

  resources.forEach(r => {
    totalCost += r.cost;
    totalUsage += r.usage_quantity;

    // Group by resource type
    if (!costByType[r.resource_type]) {
      costByType[r.resource_type] = { cost: 0, usage: 0, count: 0 };
    }
    costByType[r.resource_type].cost += r.cost;
    costByType[r.resource_type].usage += r.usage_quantity;
    costByType[r.resource_type].count += 1;

    // Group by location
    if (!costByLocation[r.location]) {
      costByLocation[r.location] = { cost: 0, usage: 0, count: 0 };
    }
    costByLocation[r.location].cost += r.cost;
    costByLocation[r.location].usage += r.usage_quantity;
    costByLocation[r.location].count += 1;

    // Group by meter
    if (!costByMeter[r.meter_category]) {
      costByMeter[r.meter_category] = { cost: 0, usage: 0, count: 0 };
    }
    costByMeter[r.meter_category].cost += r.cost;
    costByMeter[r.meter_category].usage += r.usage_quantity;
    costByMeter[r.meter_category].count += 1;
  });

  // Calculate percentages for breakdown
  const breakdownByType = Object.keys(costByType).map(type => ({
    category: type,
    cost: costByType[type].cost,
    usage_quantity: costByType[type].usage,
    percentage: ((costByType[type].cost / totalCost) * 100).toFixed(1)
  })).sort((a, b) => b.cost - a.cost);

  const breakdownByLocation = Object.keys(costByLocation).map(loc => ({
    category: loc,
    cost: costByLocation[loc].cost,
    usage_quantity: costByLocation[loc].usage,
    percentage: ((costByLocation[loc].cost / totalCost) * 100).toFixed(1)
  })).sort((a, b) => b.cost - a.cost);

  const breakdownByMeter = Object.keys(costByMeter).map(meter => ({
    category: meter,
    cost: costByMeter[meter].cost,
    usage_quantity: costByMeter[meter].usage,
    percentage: ((costByMeter[meter].cost / totalCost) * 100).toFixed(1)
  })).sort((a, b) => b.cost - a.cost);

  // Sort resources by cost
  const expensiveResources = resources.sort((a, b) => b.cost - a.cost);
  const usedResources = resources.sort((a, b) => b.usage_quantity - a.usage_quantity);
  const leastUsedResources = resources.filter(r => r.usage_quantity < 100).sort((a, b) => a.usage_quantity - b.usage_quantity);

  return {
    costSummary: {
      total_cost: parseFloat(totalCost.toFixed(2)),
      average_daily_cost: parseFloat((totalCost / 30).toFixed(2)),
      resource_count: resources.length,
      unique_resources: resources.length,
      unique_locations: Object.keys(costByLocation).length,
      unique_resource_types: Object.keys(costByType).length,
      total_usage: parseFloat(totalUsage.toFixed(2)),
      data_points: resources.length,
      timestamp: new Date().toISOString()
    },
    trends: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(new Date().setDate(new Date().getDate() - (30 - i))).toISOString().split('T')[0],
      cost: parseFloat((totalCost / 30 * (0.8 + Math.random() * 0.4)).toFixed(2))
    })),
    costBreakdown: {
      resource_type: breakdownByType,
      location: breakdownByLocation,
      service: breakdownByMeter,
      meter: breakdownByMeter
    },
    mostExpensive: expensiveResources.map(r => ({
      name: r.name,
      cost: r.cost,
      resource_type: r.resource_type,
      location: r.location,
      usage_quantity: r.usage_quantity,
      percentage: ((r.cost / totalCost) * 100).toFixed(1)
    })),
    mostUsed: usedResources.map(r => ({
      name: r.name,
      usage_quantity: r.usage_quantity,
      cost: r.cost,
      resource_type: r.resource_type,
      location: r.location,
      cost_per_unit: r.usage_quantity > 0 ? (r.cost / r.usage_quantity).toFixed(4) : 0
    })),
    leastUsed: leastUsedResources.map(r => ({
      name: r.name,
      usage_quantity: r.usage_quantity,
      cost: r.cost,
      resource_type: r.resource_type,
      location: r.location
    })),
    recommendations: [
      {
        id: 'R001',
        title: 'Remove Unused Resources',
        description: 'Resources with minimal usage detected',
        severity: 'High',
        estimated_savings: 75,
        details: leastUsedResources.slice(0, 2).map(r => ({
          resource: r.name,
          type: r.resource_type,
          cost: r.cost,
          usage: r.usage_quantity,
          action: 'Delete'
        }))
      },
      {
        id: 'R003',
        title: 'Purchase Reserved Instances',
        description: 'Migrate high-usage compute resources to reserved instances',
        severity: 'High',
        estimated_savings: Math.round(expensiveResources.filter(r => r.resource_type === 'Virtual Machine').reduce((sum, r) => sum + r.cost, 0) * 0.3),
        details: expensiveResources.filter(r => r.resource_type === 'Virtual Machine').slice(0, 2).map(r => ({
          resource_type: r.resource_type,
          current_cost: r.cost,
          estimated_savings_with_ri: Math.round(r.cost * 0.3)
        }))
      },
      {
        id: 'R004',
        title: 'Right-size Over-provisioned Resources',
        description: 'Downsize resources with low utilization',
        severity: 'Medium',
        estimated_savings: Math.round(totalCost * 0.05),
        details: [{
          resource_type: 'Virtual Machine',
          avg_usage: 45,
          current_cost: expensiveResources.filter(r => r.resource_type === 'Virtual Machine')[0]?.cost || 500,
          estimated_savings: Math.round((expensiveResources.filter(r => r.resource_type === 'Virtual Machine')[0]?.cost || 500) * 0.1)
        }]
      },
      {
        id: 'R002',
        title: 'Optimize by Location',
        description: 'Consider consolidating resources to lower-cost regions',
        severity: 'Medium',
        estimated_savings: Math.round(totalCost * 0.15),
        details: Object.entries(costByLocation).map(([loc, data]) => ({
          from: loc,
          to: 'eastus',
          current_cost: data.cost,
          potential_savings: Math.round(data.cost * 0.1)
        }))
      }
    ]
  };
}

// Load data on startup
const csvResources = loadSampleDataFromCSV();
const sampleData = csvResources ? processSampleData(csvResources) : null;

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: sampleData ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    service: 'FinOps Azure Cost Analysis (Mock)',
    data_source: csvResources ? `CSV (${csvResources.length} resources)` : 'default'
  });
});

// Cost summary
app.get('/api/cost-summary', (req, res) => {
  if (!sampleData) return res.status(500).json({ error: 'No data loaded' });
  res.json(sampleData.costSummary);
});

// Cost breakdown
app.get('/api/cost-breakdown', (req, res) => {
  if (!sampleData) return res.status(500).json({ error: 'No data loaded' });
  const breakdownBy = req.query.by || 'resource_type';
  res.json({
    breakdown_by: breakdownBy,
    data: sampleData.costBreakdown[breakdownBy] || [],
    timestamp: new Date().toISOString()
  });
});

// Trends
app.get('/api/trend-analysis', (req, res) => {
  if (!sampleData) return res.status(500).json({ error: 'No data loaded' });
  const days = req.query.days || 30;
  res.json({
    trends: sampleData.trends,
    period_days: days,
    timestamp: new Date().toISOString()
  });
});

// Most expensive
app.get('/api/most-expensive-resources', (req, res) => {
  if (!sampleData) return res.status(500).json({ error: 'No data loaded' });
  const limit = req.query.limit || 10;
  res.json({
    resources: sampleData.mostExpensive.slice(0, limit),
    count: sampleData.mostExpensive.length,
    timestamp: new Date().toISOString()
  });
});

// Most used
app.get('/api/most-used-resources', (req, res) => {
  if (!sampleData) return res.status(500).json({ error: 'No data loaded' });
  const limit = req.query.limit || 10;
  res.json({
    resources: sampleData.mostUsed.slice(0, limit),
    count: sampleData.mostUsed.length,
    timestamp: new Date().toISOString()
  });
});

// Least used
app.get('/api/least-used-resources', (req, res) => {
  if (!sampleData) return res.status(500).json({ error: 'No data loaded' });
  const limit = req.query.limit || 10;
  res.json({
    resources: sampleData.leastUsed.slice(0, limit),
    count: sampleData.leastUsed.length,
    timestamp: new Date().toISOString()
  });
});

// Usage report
app.get('/api/usage-report', (req, res) => {
  if (!sampleData) return res.status(500).json({ error: 'No data loaded' });
  const days = req.query.days || 30;
  res.json({
    total_cost: sampleData.costSummary.total_cost,
    total_usage: sampleData.costSummary.total_usage,
    resource_count: sampleData.costSummary.resource_count,
    average_cost_per_resource: (sampleData.costSummary.total_cost / sampleData.costSummary.resource_count).toFixed(2),
    period_days: days
  });
});

// Recommendations
app.get('/api/recommendations', (req, res) => {
  if (!sampleData) return res.status(500).json({ error: 'No data loaded' });
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
    message: 'Data refreshed from sample-usage.csv',
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
  console.log(`✓ All 10 REST endpoints ready for testing`);
  if (csvResources) {
    console.log(`✓ Data loaded from sample-usage.csv (${csvResources.length} resources)`);
  }
});

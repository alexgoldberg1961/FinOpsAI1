import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Spinner, Alert, Button } from 'react-bootstrap';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import axios from 'axios';
import './Dashboard.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState(null);
  const [breakdown, setBreakdown] = useState(null);
  const [expensive, setExpensive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const [summaryRes, trendsRes, breakdownRes, expensiveRes] = await Promise.all([
        axios.get(`${apiUrl}/api/cost-summary`),
        axios.get(`${apiUrl}/api/trend-analysis?days=30`),
        axios.get(`${apiUrl}/api/cost-breakdown?by=resource_type`),
        axios.get(`${apiUrl}/api/most-expensive-resources?limit=5`)
      ]);

      setSummary(summaryRes.data);
      setTrends(trendsRes.data.trends);
      setBreakdown(breakdownRes.data.data);
      setExpensive(expensiveRes.data.resources);
      setError(null);
    } catch (err) {
      setError('Failed to load dashboard data: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container className="text-center p-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="p-5">
        <Alert variant="danger">{error}</Alert>
        <Button onClick={fetchDashboardData} variant="primary">
          Retry
        </Button>
      </Container>
    );
  }

  const trendChartData = {
    labels: trends?.map(t => t.date) || [],
    datasets: [
      {
        label: 'Daily Cost ($)',
        data: trends?.map(t => t.cost) || [],
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        tension: 0.4,
        fill: true,
        borderWidth: 2
      }
    ]
  };

  const breakdownChartData = {
    labels: breakdown?.map(b => b.category) || [],
    datasets: [
      {
        label: 'Cost Distribution',
        data: breakdown?.map(b => b.cost) || [],
        backgroundColor: [
          '#667eea',
          '#764ba2',
          '#f093fb',
          '#4facfe',
          '#00f2fe',
          '#43e97b',
          '#fa709a',
          '#fee140'
        ],
        borderWidth: 2,
        borderColor: '#fff'
      }
    ]
  };

  const expensiveChartData = {
    labels: expensive?.map(r => r.name.substring(0, 20)) || [],
    datasets: [
      {
        label: 'Cost ($)',
        data: expensive?.map(r => r.cost) || [],
        backgroundColor: '#667eea',
        borderColor: '#764ba2',
        borderWidth: 1
      }
    ]
  };

  return (
    <Container fluid>
      {/* Summary Cards */}
      <Row className="mb-4">
        <Col md={3} sm={6} className="mb-3">
          <Card className="summary-card">
            <Card.Body>
              <h6 className="card-title">Total Cost</h6>
              <h3 className="card-value">${summary?.total_cost?.toFixed(2) || '0.00'}</h3>
              <p className="card-subtitle">All Resources</p>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3} sm={6} className="mb-3">
          <Card className="summary-card">
            <Card.Body>
              <h6 className="card-title">Daily Average</h6>
              <h3 className="card-value">${summary?.average_daily_cost?.toFixed(2) || '0.00'}</h3>
              <p className="card-subtitle">Per Day</p>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3} sm={6} className="mb-3">
          <Card className="summary-card">
            <Card.Body>
              <h6 className="card-title">Unique Resources</h6>
              <h3 className="card-value">{summary?.unique_resources || '0'}</h3>
              <p className="card-subtitle">Deployed</p>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3} sm={6} className="mb-3">
          <Card className="summary-card">
            <Card.Body>
              <h6 className="card-title">Locations</h6>
              <h3 className="card-value">{summary?.unique_locations || '0'}</h3>
              <p className="card-subtitle">Regions</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Charts */}
      <Row className="mb-4">
        <Col lg={8} className="mb-4">
          <Card className="chart-card">
            <Card.Header className="bg-light">
              <h5 className="mb-0">Cost Trend (30 Days)</h5>
            </Card.Header>
            <Card.Body>
              <Line data={trendChartData} options={{ responsive: true, maintainAspectRatio: false }} height={300} />
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4} className="mb-4">
          <Card className="chart-card">
            <Card.Header className="bg-light">
              <h5 className="mb-0">Cost by Type</h5>
            </Card.Header>
            <Card.Body>
              <Doughnut data={breakdownChartData} options={{ responsive: true, maintainAspectRatio: false }} height={300} />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Most Expensive Resources */}
      <Row>
        <Col lg={12} className="mb-4">
          <Card className="chart-card">
            <Card.Header className="bg-light">
              <h5 className="mb-0">Top 5 Most Expensive Resources</h5>
            </Card.Header>
            <Card.Body>
              <Bar
                data={expensiveChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  indexAxis: 'y'
                }}
                height={250}
              />
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default Dashboard;

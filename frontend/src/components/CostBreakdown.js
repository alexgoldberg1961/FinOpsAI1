import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Spinner, Alert } from 'react-bootstrap';
import { Doughnut, Pie } from 'react-chartjs-2';
import axios from 'axios';
import './CostBreakdown.css';

function CostBreakdown() {
  const [breakdownBy, setBreakdownBy] = useState('resource_type');
  const [breakdownData, setBreakdownData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBreakdown();
  }, [breakdownBy]);

  const fetchBreakdown = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await axios.get(`${apiUrl}/api/cost-breakdown?by=${breakdownBy}`);
      setBreakdownData(response.data.data);
      setError(null);
    } catch (err) {
      setError('Failed to load cost breakdown: ' + err.message);
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

  const chartData = {
    labels: breakdownData?.map(b => b.category) || [],
    datasets: [
      {
        label: 'Cost Distribution',
        data: breakdownData?.map(b => b.cost) || [],
        backgroundColor: [
          '#667eea',
          '#764ba2',
          '#f093fb',
          '#4facfe',
          '#00f2fe',
          '#43e97b',
          '#fa709a',
          '#fee140',
          '#30b0fe',
          '#ec77de'
        ],
        borderWidth: 2,
        borderColor: '#fff'
      }
    ]
  };

  return (
    <Container fluid>
      {error && <Alert variant="danger">{error}</Alert>}

      <Row className="mb-4">
        <Col md={12}>
          <Card>
            <Card.Body>
              <h5 className="mb-3">Break Down By:</h5>
              <div className="button-group">
                <Button
                  variant={breakdownBy === 'resource_type' ? 'primary' : 'outline-primary'}
                  onClick={() => setBreakdownBy('resource_type')}
                  className="me-2"
                >
                  Resource Type
                </Button>
                <Button
                  variant={breakdownBy === 'location' ? 'primary' : 'outline-primary'}
                  onClick={() => setBreakdownBy('location')}
                  className="me-2"
                >
                  Location
                </Button>
                <Button
                  variant={breakdownBy === 'service' ? 'primary' : 'outline-primary'}
                  onClick={() => setBreakdownBy('service')}
                  className="me-2"
                >
                  Service
                </Button>
                <Button
                  variant={breakdownBy === 'meter' ? 'primary' : 'outline-primary'}
                  onClick={() => setBreakdownBy('meter')}
                >
                  Meter
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col lg={6} className="mb-4">
          <Card className="chart-card">
            <Card.Header className="bg-light">
              <h5 className="mb-0">Cost Distribution - {breakdownBy}</h5>
            </Card.Header>
            <Card.Body>
              <Doughnut data={chartData} options={{ responsive: true, maintainAspectRatio: false }} height={300} />
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6} className="mb-4">
          <Card className="chart-card">
            <Card.Header className="bg-light">
              <h5 className="mb-0">Cost Details</h5>
            </Card.Header>
            <Card.Body style={{ maxHeight: '500px', overflowY: 'auto' }}>
              <table className="table table-hover table-sm">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Cost</th>
                    <th>Usage</th>
                    <th>%</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdownData?.map((item, index) => (
                    <tr key={index}>
                      <td>{item.category}</td>
                      <td>${item.cost?.toFixed(2) || '0.00'}</td>
                      <td>{item.usage_quantity?.toFixed(2) || '0'}</td>
                      <td>{item.percentage?.toFixed(1) || '0'}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default CostBreakdown;

import React, { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Card, Tabs, Tab, Spinner, Alert, Badge } from 'react-bootstrap';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import './ResourceAnalysis.css';

function ResourceAnalysis() {
  const [mostExpensive, setMostExpensive] = useState([]);
  const [mostUsed, setMostUsed] = useState([]);
  const [leastUsed, setLeastUsed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('expensive');

  // Sorting state per view
  const [expSortField, setExpSortField] = useState('cost');
  const [expSortOrder, setExpSortOrder] = useState('desc');

  const [usedSortField, setUsedSortField] = useState('usage_quantity');
  const [usedSortOrder, setUsedSortOrder] = useState('desc');

  const [leastSortField, setLeastSortField] = useState('usage_quantity');
  const [leastSortOrder, setLeastSortOrder] = useState('asc');

  useEffect(() => {
    fetchResourceData();
  }, []);

  const fetchResourceData = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const [expensiveRes, mostUsedRes, leastUsedRes] = await Promise.all([
        axios.get(`${apiUrl}/api/most-expensive-resources?limit=20`),
        axios.get(`${apiUrl}/api/most-used-resources?limit=20`),
        axios.get(`${apiUrl}/api/least-used-resources?limit=20`)
      ]);

      setMostExpensive(expensiveRes.data.resources);
      setMostUsed(mostUsedRes.data.resources);
      setLeastUsed(leastUsedRes.data.resources);
      setError(null);
    } catch (err) {
      setError('Failed to load resource data: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Generic comparator for sorting
  const comparator = (field, order = 'desc') => (a, b) => {
    const va = a[field];
    const vb = b[field];
    if (va == null && vb == null) return 0;
    if (va == null) return order === 'asc' ? -1 : 1;
    if (vb == null) return order === 'asc' ? 1 : -1;
    if (typeof va === 'number' && typeof vb === 'number') {
      return order === 'asc' ? va - vb : vb - va;
    }
    // fallback to string compare
    return order === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
  };

  const sortedMostExpensive = useMemo(() => {
    return [...mostExpensive].sort(comparator(expSortField, expSortOrder));
  }, [mostExpensive, expSortField, expSortOrder]);

  const sortedMostUsed = useMemo(() => {
    return [...mostUsed].sort(comparator(usedSortField, usedSortOrder));
  }, [mostUsed, usedSortField, usedSortOrder]);

  const sortedLeastUsed = useMemo(() => {
    return [...leastUsed].sort(comparator(leastSortField, leastSortOrder));
  }, [leastUsed, leastSortField, leastSortOrder]);

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
      </Container>
    );
  }

  return (
    <Container fluid>
      <Tabs defaultActiveKey="expensive" id="resource-tabs" className="mb-4">
        {/* Most Expensive Resources */}
        <Tab eventKey="expensive" title="Most Expensive">
          <Row className="mt-4">
            <Col lg={12} className="mb-4">
              <Card className="resource-card">
                <Card.Header className="bg-light d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Top 20 Most Expensive Resources</h5>
                  <div>
                    <select className="form-select form-select-sm me-2" value={expSortField} onChange={(e) => setExpSortField(e.target.value)} style={{display:'inline-block', width: '160px'}}>
                      <option value="cost">Sort by: Cost</option>
                      <option value="name">Name</option>
                      <option value="usage_quantity">Usage</option>
                      <option value="resource_type">Type</option>
                    </select>
                    <select className="form-select form-select-sm" value={expSortOrder} onChange={(e) => setExpSortOrder(e.target.value)} style={{display:'inline-block', width: '110px'}}>
                      <option value="desc">Descending</option>
                      <option value="asc">Ascending</option>
                    </select>
                  </div>
                </Card.Header>
                <Card.Body>
                  <div style={{ width: '100%', height: 400 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sortedMostExpensive}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="cost" fill="#667eea" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row>
            {sortedMostExpensive.map((resource, index) => (
              <Col lg={6} key={index} className="mb-3">
                <Card className="resource-item-card">
                  <Card.Body>
                    <div className="resource-name-section">
                      <h6 className="resource-name">{resource.name}</h6>
                      <Badge bg="danger">${resource.cost?.toFixed(2) || '0.00'}</Badge>
                    </div>

                    <div className="resource-details">
                      <div className="detail-row">
                        <span className="detail-label">Type:</span>
                        <span className="detail-value">{resource.resource_type}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Location:</span>
                        <span className="detail-value">{resource.location}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Usage:</span>
                        <span className="detail-value">{resource.usage_quantity?.toFixed(2) || '0'}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">% of Total:</span>
                        <span className="detail-value text-danger">{resource.percentage || '0'}%</span>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </Tab>

        {/* Most Used Resources */}
        <Tab eventKey="mostUsed" title="Most Used">
          <Row className="mt-4">
            <Col lg={12} className="mb-4">
              <Card className="resource-card">
                <Card.Header className="bg-light d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Top 20 Most Used Resources</h5>
                  <div>
                    <select className="form-select form-select-sm me-2" value={usedSortField} onChange={(e) => setUsedSortField(e.target.value)} style={{display:'inline-block', width: '160px'}}>
                      <option value="usage_quantity">Sort by: Usage</option>
                      <option value="name">Name</option>
                      <option value="cost">Cost</option>
                      <option value="resource_type">Type</option>
                    </select>
                    <select className="form-select form-select-sm" value={usedSortOrder} onChange={(e) => setUsedSortOrder(e.target.value)} style={{display:'inline-block', width: '110px'}}>
                      <option value="desc">Descending</option>
                      <option value="asc">Ascending</option>
                    </select>
                  </div>
                </Card.Header>
                <Card.Body>
                  <div style={{ width: '100%', height: 400 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sortedMostUsed}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="usage_quantity" fill="#43e97b" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row>
            {sortedMostUsed.map((resource, index) => (
              <Col lg={6} key={index} className="mb-3">
                <Card className="resource-item-card">
                  <Card.Body>
                    <div className="resource-name-section">
                      <h6 className="resource-name">{resource.name}</h6>
                      <Badge bg="success">{resource.usage_quantity?.toFixed(2) || '0'} units</Badge>
                    </div>

                    <div className="resource-details">
                      <div className="detail-row">
                        <span className="detail-label">Type:</span>
                        <span className="detail-value">{resource.resource_type}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Location:</span>
                        <span className="detail-value">{resource.location}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Cost:</span>
                        <span className="detail-value">${resource.cost?.toFixed(2) || '0.00'}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Cost per Unit:</span>
                        <span className="detail-value">${resource.cost_per_unit?.toFixed(4) || '0.00'}</span>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </Tab>

        {/* Least Used Resources */}
        <Tab eventKey="leastUsed" title="Least Used">
          <Row className="mt-4">
            <Col lg={12} className="mb-4">
              <Card className="resource-card">
                <Card.Header className="bg-light d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Top 20 Least Used Resources</h5>
                  <div>
                    <select className="form-select form-select-sm me-2" value={leastSortField} onChange={(e) => setLeastSortField(e.target.value)} style={{display:'inline-block', width: '160px'}}>
                      <option value="usage_quantity">Sort by: Usage</option>
                      <option value="name">Name</option>
                      <option value="cost">Cost</option>
                    </select>
                    <select className="form-select form-select-sm" value={leastSortOrder} onChange={(e) => setLeastSortOrder(e.target.value)} style={{display:'inline-block', width: '110px'}}>
                      <option value="asc">Ascending</option>
                      <option value="desc">Descending</option>
                    </select>
                  </div>
                </Card.Header>
                <Card.Body>
                  <div style={{ width: '100%', height: 400 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sortedLeastUsed}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="usage_quantity" fill="#fa709a" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row>
            {sortedLeastUsed.map((resource, index) => (
              <Col lg={6} key={index} className="mb-3">
                <Card className="resource-item-card">
                  <Card.Body>
                    <div className="resource-name-section">
                      <h6 className="resource-name">{resource.name}</h6>
                      <Badge bg="warning">{resource.usage_quantity?.toFixed(2) || '0'} units</Badge>
                    </div>

                    <div className="resource-details">
                      <div className="detail-row">
                        <span className="detail-label">Type:</span>
                        <span className="detail-value">{resource.resource_type}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Location:</span>
                        <span className="detail-value">{resource.location}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Cost:</span>
                        <span className="detail-value">${resource.cost?.toFixed(2) || '0.00'}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Recommendation:</span>
                        <span className="detail-value text-warning">Consider removing</span>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </Tab>
      </Tabs>
    </Container>
  );
}

export default ResourceAnalysis;

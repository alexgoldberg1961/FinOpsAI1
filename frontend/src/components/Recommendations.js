import React, { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Card, Spinner, Alert, Badge } from 'react-bootstrap';
import { FaLightbulb, FaDollarSign, FaCheckCircle } from 'react-icons/fa';
import axios from 'axios';
import './Recommendations.css';

function Recommendations() {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalSavings, setTotalSavings] = useState(0);
  const [recSortField, setRecSortField] = useState('severity');
  const [recSortOrder, setRecSortOrder] = useState('desc');

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await axios.get(`${apiUrl}/api/recommendations`);
      setRecommendations(response.data.recommendations);
      const total = response.data.recommendations.reduce((sum, rec) => sum + (rec.estimated_savings || 0), 0);
      setTotalSavings(total);
      setError(null);
    } catch (err) {
      setError('Failed to load recommendations: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'High':
        return 'danger';
      case 'Medium':
        return 'warning';
      case 'Low':
        return 'info';
      default:
        return 'secondary';
    }
  };

  const recComparator = (field, order = 'desc') => (a, b) => {
    const va = a[field];
    const vb = b[field];
    if (va == null && vb == null) return 0;
    if (va == null) return order === 'asc' ? -1 : 1;
    if (vb == null) return order === 'asc' ? 1 : -1;
    // severity sorting: High > Medium > Low
    if (field === 'severity') {
      const rank = (s) => (s === 'High' ? 3 : s === 'Medium' ? 2 : s === 'Low' ? 1 : 0);
      return order === 'asc' ? rank(va) - rank(vb) : rank(vb) - rank(va);
    }
    if (typeof va === 'number' && typeof vb === 'number') return order === 'asc' ? va - vb : vb - va;
    return order === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
  };

  const sortedRecommendations = useMemo(() => {
    return [...recommendations].sort(recComparator(recSortField, recSortOrder));
  }, [recommendations, recSortField, recSortOrder]);

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
      {/* Savings Summary */}
      <Row className="mb-4">
        <Col md={12}>
          <Card className="savings-card">
            <Card.Body>
              <Row>
                <Col md={6}>
                  <h5 className="mb-2">Potential Monthly Savings</h5>
                  <h2 className="text-success">
                    <FaDollarSign /> ${totalSavings?.toFixed(2) || '0.00'}
                  </h2>
                </Col>
                <Col md={6} className="text-end">
                  <h5 className="mb-2">Total Recommendations</h5>
                  <h2 className="text-primary">{recommendations.length}</h2>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Recommendations */}
      <Row className="mb-3">
        <Col md={12} className="d-flex justify-content-end">
          <select className="form-select form-select-sm me-2" style={{width: '200px'}} value={recSortField} onChange={(e) => setRecSortField(e.target.value)}>
            <option value="severity">Sort by: Severity</option>
            <option value="estimated_savings">Estimated Savings</option>
            <option value="title">Title</option>
          </select>
          <select className="form-select form-select-sm" style={{width: '140px'}} value={recSortOrder} onChange={(e) => setRecSortOrder(e.target.value)}>
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </Col>
      </Row>
      <Row>
        {sortedRecommendations.map((rec, index) => (
          <Col lg={12} key={index} className="mb-4">
            <Card className="recommendation-card">
              <Card.Body>
                <div className="rec-header">
                  <div className="rec-title">
                    <FaLightbulb className="me-2" />
                    <h5 className="mb-0">{rec.title}</h5>
                  </div>
                  <Badge bg={getSeverityColor(rec.severity)}>{rec.severity}</Badge>
                </div>

                <p className="rec-description">{rec.description}</p>

                <div className="rec-savings">
                  <strong>Estimated Savings: </strong>
                  <span className="savings-amount">${rec.estimated_savings?.toFixed(2) || '0.00'}/month</span>
                </div>

                {rec.details && rec.details.length > 0 && (
                  <div className="rec-details mt-3">
                    <h6>Details:</h6>
                    <table className="table table-sm">
                      <tbody>
                        {rec.details.map((detail, idx) => (
                          <tr key={idx}>
                            <td>
                              {Object.entries(detail).map(([key, value]) => (
                                <div key={key} className="detail-item">
                                  <strong>{key.replace(/_/g, ' ')}:</strong> {
                                    value != null && typeof value === 'number' 
                                      ? (key.includes('cost') || key.includes('savings') 
                                          ? `$${value.toFixed(2)}` 
                                          : value.toFixed(2))
                                      : (value ?? 'N/A')
                                  }
                                </div>
                              ))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {recommendations.length === 0 && (
        <Row>
          <Col md={12}>
            <Card>
              <Card.Body className="text-center p-5">
                <FaCheckCircle size={48} className="text-success mb-3" />
                <h5>No Recommendations at This Time</h5>
                <p className="text-muted">Your Azure resources are optimized for cost!</p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </Container>
  );
}

export default Recommendations;

import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Spinner, Alert } from 'react-bootstrap';
import axios from 'axios';
import './App.css';
import Dashboard from './components/Dashboard';
import CostBreakdown from './components/CostBreakdown';
import Recommendations from './components/Recommendations';
import ResourceAnalysis from './components/ResourceAnalysis';
import Navigation from './components/Navigation';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [healthStatus, setHealthStatus] = useState(false);

  useEffect(() => {
    // Check backend health
    checkHealth();
  }, []);

  const checkHealth = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await axios.get(`${apiUrl}/api/health`);
      setHealthStatus(response.status === 200);
      setError(null);
      setLoading(false);
    } catch (err) {
      setError('Unable to connect to backend service. Please ensure the service is running on port 5000.');
      setHealthStatus(false);
      setLoading(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'costBreakdown':
        return <CostBreakdown />;
      case 'recommendations':
        return <Recommendations />;
      case 'resourceAnalysis':
        return <ResourceAnalysis />;
      default:
        return <Dashboard />;
    }
  };

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    );
  }

  return (
    <div className="App">
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
      
      {error && (
        <Alert variant="danger" className="m-3">
          {error}
        </Alert>
      )}

      {!healthStatus && (
        <Alert variant="warning" className="m-3">
          Backend service is not responding. Please check your connection and try again.
        </Alert>
      )}

      <Container fluid className="p-4">
        {healthStatus && renderContent()}
      </Container>
    </div>
  );
}

export default App;

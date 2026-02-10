import React from 'react';
import { Navbar, Nav, Container } from 'react-bootstrap';
import { FaChartBar, FaChartPie, FaLightbulb, FaServer } from 'react-icons/fa';
import './Navigation.css';

function Navigation({ activeTab, setActiveTab }) {
  return (
    <Navbar bg="dark" expand="lg" sticky="top" className="navbar-custom">
      <Container fluid>
        <Navbar.Brand href="#" className="brand-text">
          💰 FinOps Azure Cost Analytics
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto">
            <Nav.Link
              active={activeTab === 'dashboard'}
              onClick={() => setActiveTab('dashboard')}
              className="nav-link-custom"
            >
              <FaChartBar /> Dashboard
            </Nav.Link>
            <Nav.Link
              active={activeTab === 'costBreakdown'}
              onClick={() => setActiveTab('costBreakdown')}
              className="nav-link-custom"
            >
              <FaChartPie /> Cost Breakdown
            </Nav.Link>
            <Nav.Link
              active={activeTab === 'resourceAnalysis'}
              onClick={() => setActiveTab('resourceAnalysis')}
              className="nav-link-custom"
            >
              <FaServer /> Resources
            </Nav.Link>
            <Nav.Link
              active={activeTab === 'recommendations'}
              onClick={() => setActiveTab('recommendations')}
              className="nav-link-custom"
            >
              <FaLightbulb /> Recommendations
            </Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default Navigation;

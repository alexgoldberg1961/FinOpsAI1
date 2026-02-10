# FinOps Application Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│                    End Users                             │
└────────────────────────┬────────────────────────────────┘
                         │
                         │ HTTPS
                         │
        ┌────────────────┴────────────────┐
        │                                 │
        │         Azure Application       │
        │           Gateway               │
        │                                 │
        └────────────────┬────────────────┘
                         │
        ┌────────────────┴────────────────┐
        │                                 │
   ┌────▼─────┐                   ┌──────▼────┐
   │ Frontend  │                   │  Backend   │
   │ Pods      │◄─────────────────►│  Pods      │
   │ (React)   │    JSON/REST      │ (Flask)    │
   └────┬─────┘                   └──────┬────┘
        │                               │
        │                    ┌──────────┤
        │                    │          │
        │              ┌─────▼──┐  ┌────▼────┐
        │              │ Azure  │  │ Azure   │
        │              │Storage │  │ Compute │
        │              │Account │  │ Mgmt API│
        │              └────────┘  └─────────┘
        │
        └─────────────────────┐
                              │
                          Config
                          & Cache
```

## Component Descriptions

### Frontend (React)
- **Responsibilities:**
  - User interface and experience
  - Data visualization and charts
  - User interactions and navigation
  - Client-side caching

- **Components:**
  - Navigation bar with tabs
  - Dashboard with cost summary and trends
  - Cost breakdown visualization
  - Resource analysis (expensive, used, unused)
  - Recommendations display

- **Technologies:**
  - React 18
  - Bootstrap 5
  - Chart.js
  - Axios for API calls

### Backend (Flask)
- **Responsibilities:**
  - REST API endpoints
  - Data processing and analysis
  - Azure integration
  - Business logic

- **Modules:**
  - `app.py`: Main Flask application
  - `azure_integration.py`: Azure SDK integration
  - `cost_analyzer.py`: Cost analysis logic
  - `recommendations.py`: Recommendation engine

- **Technologies:**
  - Python Flask
  - Pandas for data processing
  - Azure SDK

### Azure Services
- **Storage Account:**
  - Stores daily usage CSV files
  - Blob storage for data persistence

- **Cost Management API:**
  - Retrieves cost and usage data
  - Service principal authentication

## Data Flow

### 1. Cost Analysis Flow
```
CSV File in Storage
    ↓
Backend reads CSV
    ↓
Pandas processes data
    ↓
Cost analyzer calculates metrics
    ↓
REST API returns results
    ↓
React dashboard visualizes data
```

### 2. Recommendation Generation Flow
```
Usage data from CSV
    ↓
Analyze patterns
    ↓
Identify optimization opportunities
    ↓
Calculate potential savings
    ↓
Generate recommendations
    ↓
Return via API
    ↓
Display in frontend
```

## Deployment Topology

### Local Development
```
Docker Compose
├── Backend Container (Port 5000)
├── Frontend Container (Port 80→3000)
└── Volume mounts for development
```

### Kubernetes (AKS)
```
AKS Cluster
├── Namespace: finops
├── Backend Deployment (3 replicas)
├── Frontend Deployment (2 replicas)
├── Services (ClusterIP)
├── HPA (Auto-scaling)
├── Ingress (External access)
└── PDB (Pod Disruption Budget)
```

## Scaling Strategy

### Horizontal Pod Autoscaling (HPA)
- **Backend:** 3-10 replicas based on CPU (70%) and Memory (80%)
- **Frontend:** 2-5 replicas based on CPU (75%)

### Vertical Pod Autoscaling (Optional)
- Auto-adjust resource requests based on usage

### Database Optimization
- CSV caching (1-hour TTL)
- Pagination for large result sets
- Data compression for storage

## High Availability

- **Multi-replica deployments:** Backend (3), Frontend (2)
- **Pod Distribution:** Anti-affinity rules spread pods across nodes
- **Pod Disruption Budgets:** Ensure minimum availability during updates
- **Health Checks:** Liveness and readiness probes
- **Load Balancing:** Kubernetes service load balancing

## Security Architecture

```
┌─────────────────────────────────────────┐
│         Azure Network                    │
│  ┌───────────────────────────────────┐  │
│  │   Virtual Network                 │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │  AKS Cluster               │  │  │
│  │  │ ┌────────────────────────┐  │  │  │
│  │  │ │ Network Policy         │  │  │  │
│  │  │ │ • Pod-to-pod traffic   │  │  │  │
│  │  │ │ • Ingress rules        │  │  │  │
│  │  │ └────────────────────────┘  │  │  │
│  │  │ ┌────────────────────────┐  │  │  │
│  │  │ │ RBAC                   │  │  │  │
│  │  │ │ • Service accounts     │  │  │  │
│  │  │ │ • Role bindings        │  │  │  │
│  │  │ └────────────────────────┘  │  │  │
│  │  └─────────────────────────────┘  │  │
│  └───────────────────────────────────┘  │
│          ↓                                │
│  ┌───────────────────────────────────┐  │
│  │  Key Vault                        │  │
│  │  • Azure credentials              │  │
│  │  • API keys                       │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

## Monitoring Stack

```
AKS Cluster
    ↓
Container Insights
    ↓
Azure Monitor
    ↓
Alerts & Dashboards
    ↓
Log Analytics Workspace
```

## Disaster Recovery

- **Backup:**
  - Kubernetes manifests version controlled
  - Secrets in Azure Key Vault
  - Configuration as code

- **Recovery:**
  - Automated pod restart via health checks
  - Node failure handling via Kubernetes
  - Azure region failover (optional)

## Cost Optimization in the Application

The application itself is optimized for cost:
- **Auto-scaling:** Only run what you need
- **Resource limits:** Prevents resource waste
- **Spot instances:** Optional for non-critical workloads
- **Reserved instances:** Recommended by the application
- **Efficient APIs:** Minimal data transfer

---

**Last Updated:** February 2026
**Version:** 1.0.0

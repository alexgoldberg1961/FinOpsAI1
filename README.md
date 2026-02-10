# FinOps Azure Cost Analytics Platform

A comprehensive web-based platform for analyzing Azure cloud costs, identifying optimization opportunities, and generating actionable recommendations.

## 📋 Overview

FinOps Azure Cost Analytics provides:

- **Cost Analysis Dashboard**: Real-time visualization of your Azure spending
- **Resource Analytics**: Identify most/least expensive and most/least used resources
- **Cost Breakdown**: Analyze costs by resource type, location, service, or meter
- **Smart Recommendations**: AI-powered cost optimization suggestions
- **Trend Analysis**: Monitor cost trends over time
- **Interactive Interface**: Beautiful, responsive React dashboard

## 🏗️ Architecture

### Technology Stack

**Backend:**
- Python Flask REST API
- Azure SDK for Python
- Pandas for data analysis
- Gunicorn WSGI server

**Frontend:**
- React 18
- Bootstrap 5
- Chart.js for visualizations
- Axios for API calls

**Deployment:**
- Docker containers
- Kubernetes (AKS)
- Azure Storage for data persistence

## 📦 Project Structure

```
FinOps/
├── backend/
│   ├── app.py                 # Main Flask application
│   ├── azure_integration.py   # Azure SDK integration
│   ├── cost_analyzer.py       # Cost analysis logic
│   ├── recommendations.py     # Recommendation engine
│   ├── requirements.txt       # Python dependencies
│   └── .env.example          # Environment template
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── App.js            # Main React component
│   │   ├── components/       # React components
│   │   ├── index.js
│   │   └── index.css
│   └── package.json          # Node dependencies
├── docker/
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   ├── nginx.conf
│   └── docker-compose.yml
├── kubernetes/
│   ├── 00-namespace.yaml
│   ├── 01-backend-deployment.yaml
│   ├── 02-frontend-deployment.yaml
│   ├── 03-ingress.yaml
│   ├── 04-pod-disruption-budget.yaml
│   └── 05-monitoring.yaml
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Python 3.11+
- Node.js 18+
- Azure subscription with:
  - Storage Account for CSV data
  - Service Principal for API access

### Local Development with Docker Compose

1. **Clone and setup environment:**
```bash
cd FinOps
cp backend/.env.example backend/.env
# Edit backend/.env with your Azure credentials
```

2. **Build and run:**
```bash
cd docker
docker-compose up --build
```

3. **Access the application:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

### Local Development without Docker

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your credentials
python app.py
```

**Frontend:**
```bash
cd frontend
npm install
npm start
```

## 🔧 Configuration

### Azure Credentials

Create a `backend/.env` file:

```env
FLASK_ENV=production
PORT=5000

# Azure Storage
AZURE_STORAGE_ACCOUNT_NAME=your_account_name
AZURE_STORAGE_ACCOUNT_KEY=your_account_key
AZURE_STORAGE_CONTAINER_NAME=finops-data

# Azure Cost Management (Service Principal)
AZURE_SUBSCRIPTION_ID=your_subscription_id
AZURE_TENANT_ID=your_tenant_id
AZURE_CLIENT_ID=your_client_id
AZURE_CLIENT_SECRET=your_client_secret
```

### Azure Setup Instructions

1. **Create a Storage Account:**
   - Upload daily usage CSV exports to the `finops-data` container
   - CSV format should include columns: ResourceName, ResourceType, Location, Cost, UsageQuantity

2. **Create a Service Principal:**
```bash
az ad sp create-for-rbac --name finops-sp --role Reader \
  --scopes /subscriptions/{subscription-id}
```

3. **Upload Usage Data:**
   - Configure Azure to export daily usage reports to Storage Account
   - Or manually upload CSV files to the `finops-data` container

## 📊 API Endpoints

### Health & Status
- `GET /api/health` - Health check

### Cost Analysis
- `GET /api/cost-summary` - Overall cost metrics
- `GET /api/cost-breakdown?by=resource_type|location|service|meter` - Cost breakdown
- `GET /api/trend-analysis?days=30` - Cost trends

### Resource Analysis
- `GET /api/most-expensive-resources?limit=10` - Top expensive resources
- `GET /api/most-used-resources?limit=10` - Top used resources
- `GET /api/least-used-resources?limit=10` - Least used resources
- `GET /api/usage-report?days=30` - Full usage analysis

### Recommendations
- `GET /api/recommendations` - Cost optimization recommendations

### Administration
- `POST /api/refresh-data` - Manually refresh data from storage

## 🐳 Docker Deployment

### Build Images

```bash
# Backend
docker build -f docker/Dockerfile.backend -t finops-backend:latest .

# Frontend
docker build -f docker/Dockerfile.frontend -t finops-frontend:latest .

# Tag for registry
docker tag finops-backend:latest yourregistry.azurecr.io/finops-backend:latest
docker tag finops-frontend:latest yourregistry.azurecr.io/finops-frontend:latest

# Push to registry
docker push yourregistry.azurecr.io/finops-backend:latest
docker push yourregistry.azurecr.io/finops-frontend:latest
```

### Docker Compose

```bash
cd docker
docker-compose up -d
docker-compose logs -f
```

## ☸️ Kubernetes Deployment (AKS)

### Prerequisites

```bash
# Install CLI tools
az aks install-cli
kubectl version --client

# Get AKS credentials
az aks get-credentials --resource-group myResourceGroup --name myAKSCluster
```

### Deployment Steps

1. **Update image references:**
```bash
# Edit kubernetes manifests and replace YOUR_REGISTRY with your ACR address
sed -i 's|YOUR_REGISTRY|yourregistry.azurecr.io|g' kubernetes/*.yaml
```

2. **Create namespace and secrets:**
```bash
kubectl apply -f kubernetes/00-namespace.yaml
```

3. **Update secrets with your credentials:**
```bash
kubectl edit secret finops-secrets -n finops
```

4. **Deploy applications:**
```bash
kubectl apply -f kubernetes/01-backend-deployment.yaml
kubectl apply -f kubernetes/02-frontend-deployment.yaml
kubectl apply -f kubernetes/03-ingress.yaml
kubectl apply -f kubernetes/04-pod-disruption-budget.yaml
kubectl apply -f kubernetes/05-monitoring.yaml
```

5. **Verify deployment:**
```bash
kubectl get pods -n finops
kubectl get services -n finops
kubectl get ingress -n finops
```

### Access the Application

```bash
# Port forward for testing
kubectl port-forward -n finops svc/finops-frontend 3000:80
kubectl port-forward -n finops svc/finops-backend 5000:5000

# Get ingress IP/DNS
kubectl get ingress -n finops
```

## 📈 Key Features

### Dashboard
- **Cost Summary Cards**: Total cost, daily average, resource count, locations
- **Cost Trends**: 30-day cost visualization
- **Cost Distribution**: Breakdown by resource type
- **Top Resources**: Most expensive resources at a glance

### Cost Breakdown
- Filter by Resource Type, Location, Service, or Meter
- Visual pie chart distribution
- Detailed table with costs and percentages

### Resource Analysis
- **Most Expensive**: Resources consuming the most budget
- **Most Used**: Resources with highest usage
- **Least Used**: Underutilized resources (optimization candidates)
- Bar charts and detailed metrics

### Recommendations
- **Unused Resources Removal**: Identify and remove unused resources
- **Location Optimization**: Consolidate to lower-cost regions
- **Reserved Instances**: Migrate to reserved instances for savings
- **Right-sizing**: Downsize over-provisioned resources
- **Azure Hybrid Benefit**: Leverage existing licenses
- **Spot Instances**: Use spot VMs for non-critical workloads
- **Storage Optimization**: Archive cold data

## 🔐 Security Best Practices

1. **Secrets Management:**
   - Use Azure Key Vault for production
   - Never commit `.env` files
   - Rotate credentials regularly

2. **Network Security:**
   - Use Network Policies in Kubernetes
   - Enable HTTPS/TLS with cert-manager
   - Use Private Endpoints for storage

3. **Access Control:**
   - Implement RBAC in Kubernetes
   - Use Service Principals with minimal permissions
   - Audit and monitor API access

4. **Data Protection:**
   - Encrypt data at rest and in transit
   - Regular backups of configuration
   - Data retention policies

## 📊 Monitoring & Logging

### Application Logs
```bash
# Backend logs
kubectl logs -n finops deployment/finops-backend -f

# Frontend logs
kubectl logs -n finops deployment/finops-frontend -f
```

### Metrics
- CPU and memory usage (automatically collected)
- Pod availability and restart counts
- Request latency and error rates

### Integration with Azure Monitor
```bash
# Link AKS cluster to Log Analytics
az aks enable-addons --resource-group myRG --name myAKS --addons monitoring
```

## 🧪 Testing

### Backend Tests
```bash
cd backend
pip install pytest pytest-cov
pytest
pytest --cov=. --cov-report=html
```

### Frontend Tests
```bash
cd frontend
npm test
npm run build
```

## 📝 CSV Data Format

Expected columns in usage CSV files:

| Column | Description |
|--------|-------------|
| ResourceName | Name of the resource |
| ResourceId | Unique resource identifier |
| ResourceType | Type (VM, Storage, etc.) |
| Location | Azure region |
| Cost | Cost amount |
| UsageQuantity | Amount used |
| MeterCategory | Service category |
| MeterName | Specific meter name |
| Date | Usage date |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see LICENSE file for details.

## 🆘 Troubleshooting

### Backend can't connect to Azure Storage
- Verify storage account credentials in `.env`
- Check container name exists
- Ensure CSV files are uploaded

### Frontend shows "Backend unavailable"
- Check backend pod status: `kubectl get pods -n finops`
- Check backend logs: `kubectl logs -n finops deployment/finops-backend`
- Verify service connectivity: `kubectl describe svc finops-backend -n finops`

### High memory usage
- Increase resource limits in deployment manifests
- Consider pagination for large result sets
- Optimize pandas operations for large DataFrames

### Ingress not working
- Install ingress controller: `az aks create --enable-managed-identity --enable-addons http_application_routing`
- Check ingress status: `kubectl describe ingress finops-ingress -n finops`

## 📞 Support

For issues, questions, or suggestions:
- Check existing issues in the repository
- Create a detailed issue with logs and environment details
- Contact the development team

## 🎯 Roadmap

- [ ] Machine learning-based anomaly detection
- [ ] Automatic remediation for low-hanging fruit
- [ ] Budget alerts and notifications
- [ ] Custom report generation
- [ ] Integration with Azure DevOps
- [ ] Multi-cloud support (AWS, GCP)
- [ ] Advanced forecasting capabilities
- [ ] Chargeback and showback reporting

## 👥 Team

- Architecture & Backend: Cloud Engineering Team
- Frontend & UX: Frontend Development Team
- DevOps & Deployment: Platform Engineering Team

---

**Last Updated:** February 2026
**Version:** 1.0.0

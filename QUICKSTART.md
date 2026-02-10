# FinOps Quick Start Guide

## 5-Minute Setup (Local Development)

### Prerequisites
- Docker Desktop
- Git
- VS Code (optional)

### Step 1: Clone and Setup
```bash
cd FinOps
cp backend/.env.example backend/.env
# Edit backend/.env with your Azure credentials (or use dummy values for testing)
```

### Step 2: Run with Docker Compose
```bash
cd docker
docker-compose up --build
```

### Step 3: Access Application
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000/api/health

## Quick Commands

### Local Development
```bash
# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild containers
docker-compose up --build --force-recreate
```

### Backend Development
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set environment
cp .env.example .env
# Edit .env with your credentials

# Run Flask app
python app.py
```

### Frontend Development
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

## Deployment to AKS (15 minutes)

### Option 1: Automated (Recommended)
```bash
# On Linux/Mac
chmod +x deploy.sh
./deploy.sh

# On Windows
deploy.bat
```

### Option 2: Manual Steps
```bash
# 1. Create Azure resources
az group create --name finops-rg --location eastus

# 2. Create AKS cluster
az aks create --resource-group finops-rg --name finops-aks --node-count 3

# 3. Get credentials
az aks get-credentials --resource-group finops-rg --name finops-aks

# 4. Update manifests with your registry
sed -i 's|YOUR_REGISTRY|your-registry-url|g' kubernetes/*.yaml

# 5. Deploy
kubectl apply -f kubernetes/

# 6. Access
kubectl port-forward -n finops svc/finops-frontend 3000:80
```

## Using Sample Data

```bash
# Upload sample CSV to Azure Storage
az storage blob upload \
  --account-name your_storage_account \
  --container-name finops-data \
  --name usage-2024-02-05.csv \
  --file sample-usage.csv
```

The sample data includes:
- Virtual Machines (various costs and usage)
- Storage Accounts
- Databases
- App Services
- And more resources

## Key Features to Try

1. **Dashboard Tab**
   - View total cost: $5,432.10
   - See 30-day trends
   - Check cost distribution

2. **Cost Breakdown Tab**
   - Break down by resource type, location, service, or meter
   - See pie chart distribution
   - View detailed table

3. **Resources Tab**
   - Most expensive: prod-sql-01 ($600)
   - Most used: prodsa01 (5000 units)
   - Least used: unused-vm-01 (0.5 units)

4. **Recommendations Tab**
   - Remove unused resources: $500/month savings
   - Purchase reserved instances: $1,500/month savings
   - Right-size resources: $250/month savings

## Troubleshooting

### "Cannot connect to backend"
```bash
# Check if containers are running
docker-compose ps

# Check backend logs
docker-compose logs finops-backend

# Restart containers
docker-compose restart
```

### "No data in dashboard"
```bash
# Check if sample CSV is loaded
# Edit backend/.env to point to your storage account
# Or ensure sample-usage.csv is in the container

# Manually refresh data
curl -X POST http://localhost:5000/api/refresh-data
```

### Kubernetes pod issues
```bash
# Check pod status
kubectl get pods -n finops

# View pod logs
kubectl logs -n finops deployment/finops-backend

# Describe pod
kubectl describe pod <pod-name> -n finops
```

## Next Steps

1. **Add Real Data:**
   - Configure Azure Storage account
   - Upload actual usage CSV files
   - Set up automated exports

2. **Customize:**
   - Update Kubernetes manifests with your values
   - Configure custom domain
   - Set up SSL/TLS certificates

3. **Production Deployment:**
   - Enable Azure AD authentication
   - Set up monitoring and alerts
   - Configure auto-scaling policies
   - Enable backup and disaster recovery

4. **Integrate:**
   - Connect to Azure Cost Management APIs
   - Set up data export automation
   - Integrate with CI/CD pipeline

## File Structure Overview

```
FinOps/
├── backend/              # Flask API
│   ├── app.py           # Main application
│   ├── requirements.txt  # Python deps
│   └── .env.example     # Config template
├── frontend/            # React dashboard
│   ├── src/components/  # React components
│   └── package.json     # Node deps
├── docker/              # Container configs
│   ├── Dockerfile.*     # Container images
│   └── docker-compose.yml
├── kubernetes/          # K8s manifests
│   ├── *-deployment.yaml
│   └── *-ingress.yaml
├── README.md            # Full documentation
├── DEPLOYMENT_GUIDE.md  # Detailed setup
├── API_DOCUMENTATION.md # API reference
└── ARCHITECTURE.md      # System design
```

## Getting Help

### Documentation
- [README.md](README.md) - Complete overview
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Detailed setup
- [API_DOCUMENTATION.md](API_DOCUMENTATION.md) - API reference
- [ARCHITECTURE.md](ARCHITECTURE.md) - System design

### Support Resources
1. Check logs: `docker-compose logs`
2. Read troubleshooting section in README.md
3. Review Kubernetes events: `kubectl get events -n finops`
4. Check Azure Portal for resource status

## Tips & Tricks

### View all API endpoints
```bash
curl http://localhost:5000/api/health
curl http://localhost:5000/api/cost-summary
curl http://localhost:5000/api/recommendations
```

### Check K8s resources
```bash
# All resources in finops namespace
kubectl get all -n finops

# Specific resource types
kubectl get pods,svc,ingress -n finops

# Watch pod status in real-time
kubectl get pods -n finops -w
```

### View real-time logs
```bash
# Backend
kubectl logs -f deployment/finops-backend -n finops

# Frontend
kubectl logs -f deployment/finops-frontend -n finops
```

### Scale deployments
```bash
# Manually scale backend
kubectl scale deployment finops-backend --replicas=5 -n finops

# Check HPA status
kubectl get hpa -n finops
```

## Common Use Cases

### 1. Analyze Current Costs
1. Upload your usage CSV to storage
2. Go to Dashboard tab
3. Check "Most Expensive Resources"
4. Review recommendations

### 2. Find Cost Savings
1. Go to Recommendations tab
2. Review potential savings
3. Implement high-priority recommendations
4. Monitor reduction in costs

### 3. Track Usage Patterns
1. Go to Resources tab
2. Check "Most Used" vs "Most Expensive"
3. Identify underutilized resources
4. Plan for removal or rightsizing

### 4. Monitor Trends
1. Go to Dashboard tab
2. View 30-day cost trend
3. Identify cost increase patterns
4. Correlate with resource changes

## Performance Tips

- Backend caches data for 1 hour (automatically refreshes)
- Frontend uses local caching for better UX
- Optimize CSV file size for faster processing
- Use pagination for large datasets (coming soon)

## Security Notes

- Credentials stored in `.env` (never commit)
- Use Azure Key Vault in production
- Enable Azure AD for API authentication
- Network policies restrict pod-to-pod traffic
- Secrets managed separately from manifests

---

**Ready to deploy?** Start with Docker Compose, then move to AKS for production!

**Questions?** Check the documentation files or review logs for detailed error information.

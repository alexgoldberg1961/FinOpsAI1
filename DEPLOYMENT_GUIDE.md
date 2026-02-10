# FinOps Deployment Guide

## Prerequisites

### Local Development
- Docker Desktop (includes Docker Compose)
- Python 3.11+
- Node.js 18+
- Git

### Azure Deployment
- Azure Subscription
- Azure CLI (`az` command)
- kubectl (Kubernetes CLI)
- Docker registry (Azure Container Registry recommended)

## Step 1: Azure Setup

### 1.1 Create Storage Account

```bash
# Set variables
RESOURCE_GROUP="finops-rg"
STORAGE_ACCOUNT="finopsdata$(date +%s)"
LOCATION="eastus"

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create storage account
az storage account create \
  --name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Standard_LRS \
  --kind StorageV2

# Create container
az storage container create \
  --name finops-data \
  --account-name $STORAGE_ACCOUNT

# Get connection string
az storage account show-connection-string \
  --name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP
```

### 1.2 Create Service Principal

```bash
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

# Create service principal
az ad sp create-for-rbac \
  --name finops-sp \
  --role Reader \
  --scopes /subscriptions/$SUBSCRIPTION_ID

# Output: Save the JSON output - you'll need these credentials:
# - appId (CLIENT_ID)
# - password (CLIENT_SECRET)
# - tenant (TENANT_ID)
```

### 1.3 Create Azure Container Registry

```bash
REGISTRY_NAME="finopsacr$(date +%s)"

az acr create \
  --resource-group $RESOURCE_GROUP \
  --name $REGISTRY_NAME \
  --sku Basic

# Get login credentials
az acr credential show --name $REGISTRY_NAME
```

### 1.4 Create AKS Cluster

```bash
CLUSTER_NAME="finops-aks"

az aks create \
  --resource-group $RESOURCE_GROUP \
  --name $CLUSTER_NAME \
  --node-count 3 \
  --vm-set-type VirtualMachineScaleSets \
  --load-balancer-sku standard \
  --enable-managed-identity \
  --network-plugin azure \
  --enable-addons monitoring,http_application_routing

# Attach ACR to AKS
az aks update \
  --name $CLUSTER_NAME \
  --resource-group $RESOURCE_GROUP \
  --attach-acr $REGISTRY_NAME

# Get credentials
az aks get-credentials \
  --resource-group $RESOURCE_GROUP \
  --name $CLUSTER_NAME
```

## Step 2: Prepare Application

### 2.1 Clone Repository

```bash
git clone https://github.com/yourusername/FinOps.git
cd FinOps
```

### 2.2 Create Environment File

```bash
cat > backend/.env << EOF
FLASK_ENV=production
PORT=5000
AZURE_STORAGE_ACCOUNT_NAME=$STORAGE_ACCOUNT
AZURE_STORAGE_ACCOUNT_KEY=$(az storage account keys list --name $STORAGE_ACCOUNT --query [0].value -o tsv)
AZURE_STORAGE_CONTAINER_NAME=finops-data
AZURE_SUBSCRIPTION_ID=$SUBSCRIPTION_ID
AZURE_TENANT_ID=YOUR_TENANT_ID
AZURE_CLIENT_ID=YOUR_CLIENT_ID
AZURE_CLIENT_SECRET=YOUR_CLIENT_SECRET
EOF
```

## Step 3: Local Testing with Docker Compose

```bash
# Build and start services
cd docker
docker-compose up --build

# In another terminal, test the API
curl http://localhost:5000/api/health
curl http://localhost:3000
```

## Step 4: Build and Push Container Images

```bash
# Login to ACR
az acr login --name $REGISTRY_NAME

# Set registry URL
REGISTRY_URL="${REGISTRY_NAME}.azurecr.io"

# Build backend
docker build \
  -f docker/Dockerfile.backend \
  -t ${REGISTRY_URL}/finops-backend:latest \
  -t ${REGISTRY_URL}/finops-backend:v1.0.0 \
  .

# Build frontend
docker build \
  -f docker/Dockerfile.frontend \
  -t ${REGISTRY_URL}/finops-frontend:latest \
  -t ${REGISTRY_URL}/finops-frontend:v1.0.0 \
  .

# Push images
docker push ${REGISTRY_URL}/finops-backend:latest
docker push ${REGISTRY_URL}/finops-backend:v1.0.0
docker push ${REGISTRY_URL}/finops-frontend:latest
docker push ${REGISTRY_URL}/finops-frontend:v1.0.0
```

## Step 5: Deploy to AKS

### 5.1 Update Kubernetes Manifests

```bash
# Update image references in manifests
sed -i "s|YOUR_REGISTRY|${REGISTRY_URL}|g" kubernetes/*.yaml

# Update ingress domain (if using custom domain)
# Edit kubernetes/03-ingress.yaml and set your domain
sed -i 's|finops.yourdomain.com|your-actual-domain.com|g' kubernetes/03-ingress.yaml
```

### 5.2 Create Namespace and Secrets

```bash
# Create namespace
kubectl create namespace finops

# Create secrets with Azure credentials
kubectl create secret generic finops-secrets \
  --from-literal=AZURE_STORAGE_ACCOUNT_NAME=$STORAGE_ACCOUNT \
  --from-literal=AZURE_STORAGE_ACCOUNT_KEY=$(az storage account keys list --name $STORAGE_ACCOUNT --query [0].value -o tsv) \
  --from-literal=AZURE_SUBSCRIPTION_ID=$SUBSCRIPTION_ID \
  --from-literal=AZURE_TENANT_ID=YOUR_TENANT_ID \
  --from-literal=AZURE_CLIENT_ID=YOUR_CLIENT_ID \
  --from-literal=AZURE_CLIENT_SECRET=YOUR_CLIENT_SECRET \
  -n finops
```

### 5.3 Deploy Applications

```bash
# Apply manifests
kubectl apply -f kubernetes/00-namespace.yaml
kubectl apply -f kubernetes/01-backend-deployment.yaml
kubectl apply -f kubernetes/02-frontend-deployment.yaml
kubectl apply -f kubernetes/03-ingress.yaml
kubectl apply -f kubernetes/04-pod-disruption-budget.yaml
kubectl apply -f kubernetes/05-monitoring.yaml

# Wait for deployments
kubectl rollout status deployment/finops-backend -n finops
kubectl rollout status deployment/finops-frontend -n finops

# Check pod status
kubectl get pods -n finops
```

## Step 6: Configure Ingress and DNS

### 6.1 Get Ingress IP

```bash
# Wait for LoadBalancer IP to be assigned
kubectl get ingress finops-ingress -n finops

# If using Application Gateway Ingress
az network public-ip list --resource-group $RESOURCE_GROUP
```

### 6.2 Configure DNS

For custom domain:
```bash
# Create A record pointing to ingress IP
# In your DNS provider (Azure DNS, GoDaddy, etc.)
# A record: finops.yourdomain.com -> INGRESS_IP
```

For Azure DNS:
```bash
# Create DNS zone
az network dns zone create \
  --resource-group $RESOURCE_GROUP \
  --name yourdomain.com

# Create A record
az network dns record-set a add-record \
  --resource-group $RESOURCE_GROUP \
  --zone-name yourdomain.com \
  --record-set-name finops \
  --ipv4-address INGRESS_IP
```

## Step 7: Upload Sample Data

```bash
# Upload sample usage CSV to storage account
az storage blob upload \
  --account-name $STORAGE_ACCOUNT \
  --container-name finops-data \
  --name usage-2024-02-05.csv \
  --file sample-usage.csv
```

## Step 8: Access Application

### Local Access
```bash
# Port forward to access locally
kubectl port-forward -n finops svc/finops-frontend 3000:80
kubectl port-forward -n finops svc/finops-backend 5000:5000

# Access:
# Frontend: http://localhost:3000
# Backend: http://localhost:5000
```

### Public Access
```bash
# Get ingress endpoint
kubectl get ingress finops-ingress -n finops

# Access:
# https://finops.yourdomain.com
```

## Step 9: Enable HTTPS (TLS)

### Install cert-manager
```bash
# Add cert-manager repo
helm repo add jetstack https://charts.jetstack.io
helm repo update

# Install cert-manager
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set installCRDs=true
```

### Configure Certificate Issuer
```bash
# Create ClusterIssuer for Let's Encrypt
cat > cert-issuer.yaml << EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF

kubectl apply -f cert-issuer.yaml
```

## Step 10: Monitoring and Logging

### Enable Container Insights
```bash
# Enable monitoring addon
az aks enable-addons \
  --addons monitoring \
  --name $CLUSTER_NAME \
  --resource-group $RESOURCE_GROUP

# View logs in Azure Monitor
az monitor metrics list-namespaces --resource-group $RESOURCE_GROUP
```

### View Application Logs
```bash
# Backend logs
kubectl logs -n finops deployment/finops-backend -f

# Frontend logs
kubectl logs -n finops deployment/finops-frontend -f

# Real-time logs
kubectl logs -n finops deployment/finops-backend -f --tail=50
```

## Troubleshooting

### 1. Pods not starting
```bash
# Check pod status
kubectl describe pod <pod-name> -n finops

# Check events
kubectl get events -n finops --sort-by='.lastTimestamp'

# Check logs
kubectl logs <pod-name> -n finops
```

### 2. No storage data available
```bash
# Verify CSV files in storage
az storage blob list --account-name $STORAGE_ACCOUNT --container-name finops-data

# Check if backend can access storage (pod logs)
kubectl logs -n finops deployment/finops-backend
```

### 3. Ingress not working
```bash
# Check ingress status
kubectl describe ingress finops-ingress -n finops

# Check ingress controller logs
kubectl logs -n ingress-nginx deployment/nginx-ingress-controller -f
```

### 4. High memory usage
```bash
# Check resource usage
kubectl top pods -n finops
kubectl top nodes

# Scale up cluster
az aks scale \
  --resource-group $RESOURCE_GROUP \
  --name $CLUSTER_NAME \
  --node-count 5
```

## Scaling

### Horizontal Pod Autoscaling
- Backend: 3-10 replicas based on CPU/Memory
- Frontend: 2-5 replicas based on CPU

```bash
# Check HPA status
kubectl get hpa -n finops
kubectl describe hpa finops-backend-hpa -n finops
```

### Vertical Pod Autoscaling
```bash
# Install VPA (optional)
git clone https://github.com/kubernetes/autoscaler.git
cd autoscaler/vertical-pod-autoscaler
./hack/vpa-up.sh
```

## Backup and Recovery

### Backup Configuration
```bash
# Backup Kubernetes manifests
kubectl get all -n finops -o yaml > finops-backup.yaml

# Backup secrets (securely)
kubectl get secrets -n finops -o yaml > finops-secrets-backup.yaml
```

### Restore from Backup
```bash
kubectl apply -f finops-backup.yaml
kubectl apply -f finops-secrets-backup.yaml
```

## Cleanup

### Remove Application
```bash
kubectl delete namespace finops
```

### Remove Azure Resources
```bash
az group delete --name $RESOURCE_GROUP
```

## Production Checklist

- [ ] Configure custom domain and HTTPS
- [ ] Set up monitoring and alerting
- [ ] Configure backup strategy
- [ ] Implement rate limiting on API
- [ ] Enable audit logging
- [ ] Set up CI/CD pipeline
- [ ] Configure resource quotas
- [ ] Set up cost alerts
- [ ] Implement disaster recovery
- [ ] Conduct security audit

---

**Last Updated:** February 2026
**Version:** 1.0.0

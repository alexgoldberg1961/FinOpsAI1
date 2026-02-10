#!/bin/bash

# FinOps Quick Deployment Script
# This script automates the deployment process to Azure AKS

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "\n${GREEN}===== $1 =====${NC}\n"
}

print_error() {
    echo -e "${RED}Error: $1${NC}"
    exit 1
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"
    
    command -v az >/dev/null 2>&1 || print_error "Azure CLI is not installed"
    print_success "Azure CLI found"
    
    command -v kubectl >/dev/null 2>&1 || print_error "kubectl is not installed"
    print_success "kubectl found"
    
    command -v docker >/dev/null 2>&1 || print_error "Docker is not installed"
    print_success "Docker found"
}

# Setup Azure resources
setup_azure() {
    print_header "Setting Up Azure Resources"
    
    read -p "Enter resource group name [finops-rg]: " RESOURCE_GROUP
    RESOURCE_GROUP=${RESOURCE_GROUP:-finops-rg}
    
    read -p "Enter location [eastus]: " LOCATION
    LOCATION=${LOCATION:-eastus}
    
    read -p "Enter storage account name (must be unique): " STORAGE_ACCOUNT
    
    read -p "Enter AKS cluster name [finops-aks]: " CLUSTER_NAME
    CLUSTER_NAME=${CLUSTER_NAME:-finops-aks}
    
    # Create resource group
    print_info "Creating resource group..."
    az group create \
        --name $RESOURCE_GROUP \
        --location $LOCATION
    print_success "Resource group created"
    
    # Create storage account
    print_info "Creating storage account..."
    az storage account create \
        --name $STORAGE_ACCOUNT \
        --resource-group $RESOURCE_GROUP \
        --location $LOCATION \
        --sku Standard_LRS \
        --kind StorageV2
    print_success "Storage account created"
    
    # Create container
    print_info "Creating storage container..."
    az storage container create \
        --name finops-data \
        --account-name $STORAGE_ACCOUNT
    print_success "Storage container created"
    
    # Save credentials for later
    echo "RESOURCE_GROUP=$RESOURCE_GROUP" > .deployment-env
    echo "STORAGE_ACCOUNT=$STORAGE_ACCOUNT" >> .deployment-env
    echo "LOCATION=$LOCATION" >> .deployment-env
    echo "CLUSTER_NAME=$CLUSTER_NAME" >> .deployment-env
}

# Create service principal
setup_service_principal() {
    print_header "Creating Service Principal"
    
    SUBSCRIPTION_ID=$(az account show --query id -o tsv)
    
    print_info "Creating service principal..."
    SP_OUTPUT=$(az ad sp create-for-rbac \
        --name finops-sp \
        --role Reader \
        --scopes /subscriptions/$SUBSCRIPTION_ID)
    
    CLIENT_ID=$(echo $SP_OUTPUT | jq -r '.appId')
    CLIENT_SECRET=$(echo $SP_OUTPUT | jq -r '.password')
    TENANT_ID=$(echo $SP_OUTPUT | jq -r '.tenant')
    
    print_success "Service principal created"
    
    # Save to file
    echo "SUBSCRIPTION_ID=$SUBSCRIPTION_ID" >> .deployment-env
    echo "CLIENT_ID=$CLIENT_ID" >> .deployment-env
    echo "CLIENT_SECRET=$CLIENT_SECRET" >> .deployment-env
    echo "TENANT_ID=$TENANT_ID" >> .deployment-env
}

# Create container registry
setup_container_registry() {
    print_header "Creating Container Registry"
    
    source .deployment-env
    
    read -p "Enter container registry name (must be unique): " REGISTRY_NAME
    
    print_info "Creating container registry..."
    az acr create \
        --resource-group $RESOURCE_GROUP \
        --name $REGISTRY_NAME \
        --sku Basic
    print_success "Container registry created"
    
    echo "REGISTRY_NAME=$REGISTRY_NAME" >> .deployment-env
}

# Create AKS cluster
setup_aks_cluster() {
    print_header "Creating AKS Cluster"
    
    source .deployment-env
    
    print_info "Creating AKS cluster (this may take 10-15 minutes)..."
    az aks create \
        --resource-group $RESOURCE_GROUP \
        --name $CLUSTER_NAME \
        --node-count 3 \
        --vm-set-type VirtualMachineScaleSets \
        --load-balancer-sku standard \
        --enable-managed-identity \
        --network-plugin azure \
        --enable-addons monitoring,http_application_routing
    print_success "AKS cluster created"
    
    # Attach ACR to AKS
    print_info "Attaching container registry to AKS..."
    az aks update \
        --name $CLUSTER_NAME \
        --resource-group $RESOURCE_GROUP \
        --attach-acr $REGISTRY_NAME
    print_success "Container registry attached"
    
    # Get credentials
    print_info "Getting AKS credentials..."
    az aks get-credentials \
        --resource-group $RESOURCE_GROUP \
        --name $CLUSTER_NAME
    print_success "Credentials configured"
}

# Build and push images
build_and_push() {
    print_header "Building and Pushing Container Images"
    
    source .deployment-env
    
    REGISTRY_URL="${REGISTRY_NAME}.azurecr.io"
    
    # Login to ACR
    print_info "Logging into container registry..."
    az acr login --name $REGISTRY_NAME
    
    # Build backend
    print_info "Building backend image..."
    docker build \
        -f docker/Dockerfile.backend \
        -t ${REGISTRY_URL}/finops-backend:latest \
        -t ${REGISTRY_URL}/finops-backend:v1.0.0 \
        .
    print_success "Backend image built"
    
    # Build frontend
    print_info "Building frontend image..."
    docker build \
        -f docker/Dockerfile.frontend \
        -t ${REGISTRY_URL}/finops-frontend:latest \
        -t ${REGISTRY_URL}/finops-frontend:v1.0.0 \
        .
    print_success "Frontend image built"
    
    # Push images
    print_info "Pushing backend image..."
    docker push ${REGISTRY_URL}/finops-backend:latest
    docker push ${REGISTRY_URL}/finops-backend:v1.0.0
    print_success "Backend image pushed"
    
    print_info "Pushing frontend image..."
    docker push ${REGISTRY_URL}/finops-frontend:latest
    docker push ${REGISTRY_URL}/finops-frontend:v1.0.0
    print_success "Frontend image pushed"
    
    echo "REGISTRY_URL=$REGISTRY_URL" >> .deployment-env
}

# Deploy to Kubernetes
deploy_to_k8s() {
    print_header "Deploying to Kubernetes"
    
    source .deployment-env
    
    # Update image references
    print_info "Updating Kubernetes manifests..."
    sed -i.bak "s|YOUR_REGISTRY|${REGISTRY_URL}|g" kubernetes/*.yaml
    
    # Create namespace
    print_info "Creating namespace..."
    kubectl create namespace finops || print_info "Namespace already exists"
    
    # Create secrets
    print_info "Creating secrets..."
    kubectl delete secret finops-secrets -n finops 2>/dev/null || true
    
    STORAGE_KEY=$(az storage account keys list --name $STORAGE_ACCOUNT --query [0].value -o tsv)
    
    kubectl create secret generic finops-secrets \
        --from-literal=AZURE_STORAGE_ACCOUNT_NAME=$STORAGE_ACCOUNT \
        --from-literal=AZURE_STORAGE_ACCOUNT_KEY=$STORAGE_KEY \
        --from-literal=AZURE_SUBSCRIPTION_ID=$SUBSCRIPTION_ID \
        --from-literal=AZURE_TENANT_ID=$TENANT_ID \
        --from-literal=AZURE_CLIENT_ID=$CLIENT_ID \
        --from-literal=AZURE_CLIENT_SECRET=$CLIENT_SECRET \
        -n finops
    print_success "Secrets created"
    
    # Deploy applications
    print_info "Deploying applications..."
    kubectl apply -f kubernetes/00-namespace.yaml
    kubectl apply -f kubernetes/01-backend-deployment.yaml
    kubectl apply -f kubernetes/02-frontend-deployment.yaml
    kubectl apply -f kubernetes/03-ingress.yaml
    kubectl apply -f kubernetes/04-pod-disruption-budget.yaml
    print_success "Applications deployed"
    
    # Wait for rollout
    print_info "Waiting for deployments to be ready..."
    kubectl rollout status deployment/finops-backend -n finops
    kubectl rollout status deployment/finops-frontend -n finops
    print_success "All deployments are ready"
}

# Print summary
print_summary() {
    print_header "Deployment Summary"
    
    source .deployment-env
    
    echo -e "
${GREEN}Deployment Completed Successfully!${NC}

Resource Group:     $RESOURCE_GROUP
Storage Account:    $STORAGE_ACCOUNT
AKS Cluster:        $CLUSTER_NAME
Registry:           $REGISTRY_NAME

Pod Status:"
    
    kubectl get pods -n finops
    
    echo -e "
${YELLOW}Next Steps:${NC}
1. Upload usage CSV files to Azure Storage:
   az storage blob upload --account-name $STORAGE_ACCOUNT --container-name finops-data --name usage.csv --file /path/to/your/file.csv

2. Access the application:
   kubectl port-forward -n finops svc/finops-frontend 3000:80
   kubectl port-forward -n finops svc/finops-backend 5000:5000

3. Check logs:
   kubectl logs -n finops deployment/finops-backend -f
   kubectl logs -n finops deployment/finops-frontend -f

4. For ingress access, get the IP:
   kubectl get ingress -n finops
"
}

# Main execution
main() {
    print_header "FinOps Azure Deployment Script"
    
    read -p "Do you want to set up Azure resources? (y/n) [y]: " SETUP_AZURE
    SETUP_AZURE=${SETUP_AZURE:-y}
    
    if [ "$SETUP_AZURE" = "y" ]; then
        check_prerequisites
        setup_azure
        setup_service_principal
        setup_container_registry
        setup_aks_cluster
        build_and_push
        deploy_to_k8s
        print_summary
    else
        print_info "Skipping Azure setup"
    fi
}

# Run main function
main

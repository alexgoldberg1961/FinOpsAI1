@echo off
REM FinOps Quick Deployment Script for Windows
REM This script automates the deployment process to Azure AKS

setlocal enabledelayedexpansion

REM Check prerequisites
echo.
echo ===== Checking Prerequisites =====
echo.

where az >nul 2>nul
if errorlevel 1 (
    echo Error: Azure CLI is not installed
    exit /b 1
)
echo √ Azure CLI found

where kubectl >nul 2>nul
if errorlevel 1 (
    echo Error: kubectl is not installed
    exit /b 1
)
echo √ kubectl found

where docker >nul 2>nul
if errorlevel 1 (
    echo Error: Docker is not installed
    exit /b 1
)
echo √ Docker found

REM Setup Azure resources
echo.
echo ===== Setting Up Azure Resources =====
echo.

set /p RESOURCE_GROUP="Enter resource group name [finops-rg]: "
if "!RESOURCE_GROUP!"=="" set RESOURCE_GROUP=finops-rg

set /p LOCATION="Enter location [eastus]: "
if "!LOCATION!"=="" set LOCATION=eastus

set /p STORAGE_ACCOUNT="Enter storage account name (must be unique): "

set /p CLUSTER_NAME="Enter AKS cluster name [finops-aks]: "
if "!CLUSTER_NAME!"=="" set CLUSTER_NAME=finops-aks

REM Create resource group
echo Creating resource group...
call az group create --name !RESOURCE_GROUP! --location !LOCATION!

REM Create storage account
echo Creating storage account...
call az storage account create --name !STORAGE_ACCOUNT! --resource-group !RESOURCE_GROUP! --location !LOCATION! --sku Standard_LRS --kind StorageV2

REM Create container
echo Creating storage container...
call az storage container create --name finops-data --account-name !STORAGE_ACCOUNT!

REM Save credentials
(
    echo RESOURCE_GROUP=!RESOURCE_GROUP!
    echo STORAGE_ACCOUNT=!STORAGE_ACCOUNT!
    echo LOCATION=!LOCATION!
    echo CLUSTER_NAME=!CLUSTER_NAME!
) > .deployment-env

echo.
echo ===== Creating Service Principal =====
echo.

REM Get subscription ID
for /f "delims=" %%i in ('az account show --query id -o tsv') do set SUBSCRIPTION_ID=%%i

REM Create service principal
echo Creating service principal...
for /f "delims=" %%i in ('az ad sp create-for-rbac --name finops-sp --role Reader --scopes /subscriptions/!SUBSCRIPTION_ID! --query appId -o tsv') do set CLIENT_ID=%%i

REM Save to file
(
    echo SUBSCRIPTION_ID=!SUBSCRIPTION_ID!
    echo CLIENT_ID=!CLIENT_ID!
) >> .deployment-env

echo √ Service principal created

REM Create container registry
echo.
echo ===== Creating Container Registry =====
echo.

set /p REGISTRY_NAME="Enter container registry name (must be unique): "

echo Creating container registry...
call az acr create --resource-group !RESOURCE_GROUP! --name !REGISTRY_NAME! --sku Basic

echo REGISTRY_NAME=!REGISTRY_NAME! >> .deployment-env

echo.
echo ===== Creating AKS Cluster =====
echo.

echo Creating AKS cluster (this may take 10-15 minutes)...
call az aks create --resource-group !RESOURCE_GROUP! --name !CLUSTER_NAME! --node-count 3 --vm-set-type VirtualMachineScaleSets --load-balancer-sku standard --enable-managed-identity --network-plugin azure --enable-addons monitoring,http_application_routing

REM Attach ACR to AKS
echo Attaching container registry to AKS...
call az aks update --name !CLUSTER_NAME! --resource-group !RESOURCE_GROUP! --attach-acr !REGISTRY_NAME!

REM Get credentials
echo Getting AKS credentials...
call az aks get-credentials --resource-group !RESOURCE_GROUP! --name !CLUSTER_NAME!

echo √ Deployment completed successfully!
echo.
echo Next steps:
echo 1. Build and push images: docker build -f docker/Dockerfile.backend -t YOUR_REGISTRY/finops-backend .
echo 2. Deploy to AKS: kubectl apply -f kubernetes/
echo 3. Check status: kubectl get pods -n finops

endlocal

"""
Azure integration module for FinOps application
Handles Azure Storage and Cost Management API interactions
"""

import logging
import pandas as pd
from io import BytesIO
from datetime import datetime, timedelta
from azure.storage.blob import BlobServiceClient, ContainerClient
from azure.identity import ClientSecretCredential
from azure.mgmt.costmanagement import CostManagementClient
from azure.mgmt.costmanagement.models import QueryDefinition, QueryTimePeriod, QueryDataset, QueryAggregation

logger = logging.getLogger(__name__)


class AzureStorageManager:
    """Manages Azure Blob Storage operations"""
    
    def __init__(self, account_name: str, account_key: str, container_name: str = 'finops-data'):
        """
        Initialize Azure Storage Manager
        
        Args:
            account_name: Azure Storage account name
            account_key: Azure Storage account key
            container_name: Container name for usage data
        """
        self.account_name = account_name
        self.account_key = account_key
        self.container_name = container_name
        
        # Initialize blob service client
        connection_string = f"DefaultEndpointsProtocol=https;AccountName={account_name};AccountKey={account_key};EndpointSuffix=core.windows.net"
        self.blob_service_client = BlobServiceClient.from_connection_string(connection_string)
        self.container_client = self.blob_service_client.get_container_client(container_name)
        
        self._cache = None
        self._cache_timestamp = None
    
    def get_latest_usage_file(self) -> pd.DataFrame:
        """
        Get the latest usage CSV file from Azure Storage
        
        Returns:
            pandas.DataFrame: Usage data
        """
        try:
            # Check cache first (cache for 1 hour)
            if self._cache is not None:
                cache_age = datetime.utcnow() - self._cache_timestamp
                if cache_age < timedelta(hours=1):
                    logger.info("Using cached usage data")
                    return self._cache
            
            # List all blobs and get the latest
            blobs = list(self.container_client.list_blobs())
            if not blobs:
                logger.warning("No usage files found in container")
                return None
            
            # Sort by last modified date and get the latest
            latest_blob = max(blobs, key=lambda b: b.last_modified)
            logger.info(f"Fetching latest usage file: {latest_blob.name}")
            
            # Download and parse CSV
            blob_client = self.blob_service_client.get_blob_client(
                container=self.container_name,
                blob=latest_blob.name
            )
            
            blob_data = blob_client.download_blob().readall()
            df = pd.read_csv(BytesIO(blob_data))
            
            # Cache the data
            self._cache = df
            self._cache_timestamp = datetime.utcnow()
            
            logger.info(f"Loaded {len(df)} rows from usage file")
            return df
            
        except Exception as e:
            logger.error(f"Error fetching latest usage file: {str(e)}")
            return None
    
    def list_usage_files(self) -> list:
        """List all usage CSV files in the container"""
        try:
            blobs = list(self.container_client.list_blobs())
            return [{'name': blob.name, 'size': blob.size, 'last_modified': blob.last_modified} 
                    for blob in blobs]
        except Exception as e:
            logger.error(f"Error listing usage files: {str(e)}")
            return []
    
    def refresh_cache(self):
        """Clear the cache to force fresh data fetch"""
        self._cache = None
        self._cache_timestamp = None
        logger.info("Cache cleared, next fetch will be from storage")


class AzureCostManager:
    """Manages Azure Cost Management API operations"""
    
    def __init__(self, subscription_id: str, tenant_id: str, client_id: str, client_secret: str):
        """
        Initialize Azure Cost Manager
        
        Args:
            subscription_id: Azure subscription ID
            tenant_id: Azure tenant ID
            client_id: Service principal client ID
            client_secret: Service principal client secret
        """
        self.subscription_id = subscription_id
        self.tenant_id = tenant_id
        
        # Initialize credential
        credential = ClientSecretCredential(
            tenant_id=tenant_id,
            client_id=client_id,
            client_secret=client_secret
        )
        
        self.cost_client = CostManagementClient(credential)
    
    def get_cost_data(self, start_date: datetime = None, end_date: datetime = None) -> dict:
        """
        Get cost data from Azure Cost Management API
        
        Args:
            start_date: Start date for cost data (default: 30 days ago)
            end_date: End date for cost data (default: today)
            
        Returns:
            dict: Cost data from API
        """
        try:
            if not start_date:
                start_date = datetime.utcnow() - timedelta(days=30)
            if not end_date:
                end_date = datetime.utcnow()
            
            # Define query
            query = QueryDefinition(
                type="Usage",
                timeframe="Custom",
                time_period=QueryTimePeriod(
                    from_property=start_date.replace(hour=0, minute=0, second=0, microsecond=0),
                    to=end_date.replace(hour=23, minute=59, second=59, microsecond=999999)
                ),
                dataset=QueryDataset(
                    granularity="Daily",
                    aggregation={
                        "totalCost": QueryAggregation(name="PreTaxCost", function="Sum")
                    },
                    grouping=[
                        {"type": "Dimension", "name": "ResourceType"},
                        {"type": "Dimension", "name": "Location"}
                    ]
                )
            )
            
            # Execute query
            result = self.cost_client.query.usage(
                scope=f"/subscriptions/{self.subscription_id}",
                parameters=query
            )
            
            logger.info(f"Retrieved cost data for period {start_date} to {end_date}")
            return result
            
        except Exception as e:
            logger.error(f"Error getting cost data: {str(e)}")
            return None

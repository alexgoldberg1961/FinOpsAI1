"""
Cost analysis module for FinOps application
Analyzes Azure usage and cost data
"""

import logging
import pandas as pd
import numpy as np
from typing import Dict, List
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class CostAnalyzer:
    """Analyzes cost and usage data"""
    
    def __init__(self):
        """Initialize cost analyzer"""
        self.logger = logger
    
    def analyze_usage(self, df: pd.DataFrame, days: int = 30, resource_type: str = None) -> Dict:
        """
        Analyze usage data
        
        Args:
            df: Usage data DataFrame
            days: Number of days to analyze
            resource_type: Filter by resource type (optional)
            
        Returns:
            dict: Analysis results
        """
        try:
            # Filter data
            if resource_type:
                df = df[df.get('ResourceType', '').str.contains(resource_type, case=False, na=False)]
            
            # Parse cost columns
            df['Cost'] = pd.to_numeric(df.get('Cost', 0), errors='coerce')
            df['UsageQuantity'] = pd.to_numeric(df.get('UsageQuantity', 0), errors='coerce')
            
            return {
                'total_cost': float(df['Cost'].sum()),
                'total_usage': float(df['UsageQuantity'].sum()),
                'resource_count': len(df),
                'average_cost_per_resource': float(df['Cost'].mean()),
                'period_days': days
            }
        except Exception as e:
            self.logger.error(f"Error analyzing usage: {str(e)}")
            return {}
    
    def get_most_expensive_resources(self, df: pd.DataFrame, limit: int = 10) -> List[Dict]:
        """
        Get the most expensive resources
        
        Args:
            df: Usage data DataFrame
            limit: Number of resources to return
            
        Returns:
            list: Most expensive resources
        """
        try:
            df['Cost'] = pd.to_numeric(df.get('Cost', 0), errors='coerce')
            
            # Group by resource name and sum costs
            grouped = df.groupby(df.get('ResourceName', df.get('ResourceId', 'Unknown')), as_index=False).agg({
                'Cost': 'sum',
                'ResourceType': 'first',
                'Location': 'first',
                'UsageQuantity': 'sum'
            }).sort_values('Cost', ascending=False).head(limit)
            
            resources = []
            for _, row in grouped.iterrows():
                resources.append({
                    'name': str(row.get('ResourceName', row.get('ResourceId', 'Unknown'))),
                    'cost': float(row['Cost']),
                    'resource_type': str(row.get('ResourceType', 'Unknown')),
                    'location': str(row.get('Location', 'Unknown')),
                    'usage_quantity': float(row.get('UsageQuantity', 0)),
                    'percentage': round((float(row['Cost']) / df['Cost'].sum()) * 100, 2)
                })
            
            return resources
        except Exception as e:
            self.logger.error(f"Error getting most expensive resources: {str(e)}")
            return []
    
    def get_least_used_resources(self, df: pd.DataFrame, limit: int = 10) -> List[Dict]:
        """
        Get the least used resources
        
        Args:
            df: Usage data DataFrame
            limit: Number of resources to return
            
        Returns:
            list: Least used resources
        """
        try:
            df['UsageQuantity'] = pd.to_numeric(df.get('UsageQuantity', 0), errors='coerce')
            df['Cost'] = pd.to_numeric(df.get('Cost', 0), errors='coerce')
            
            # Group by resource and sum usage
            grouped = df.groupby(df.get('ResourceName', df.get('ResourceId', 'Unknown')), as_index=False).agg({
                'UsageQuantity': 'sum',
                'Cost': 'sum',
                'ResourceType': 'first',
                'Location': 'first'
            }).sort_values('UsageQuantity', ascending=True).head(limit)
            
            resources = []
            for _, row in grouped.iterrows():
                resources.append({
                    'name': str(row.get('ResourceName', row.get('ResourceId', 'Unknown'))),
                    'usage_quantity': float(row['UsageQuantity']),
                    'cost': float(row['Cost']),
                    'resource_type': str(row.get('ResourceType', 'Unknown')),
                    'location': str(row.get('Location', 'Unknown'))
                })
            
            return resources
        except Exception as e:
            self.logger.error(f"Error getting least used resources: {str(e)}")
            return []
    
    def get_most_used_resources(self, df: pd.DataFrame, limit: int = 10) -> List[Dict]:
        """
        Get the most used resources
        
        Args:
            df: Usage data DataFrame
            limit: Number of resources to return
            
        Returns:
            list: Most used resources
        """
        try:
            df['UsageQuantity'] = pd.to_numeric(df.get('UsageQuantity', 0), errors='coerce')
            df['Cost'] = pd.to_numeric(df.get('Cost', 0), errors='coerce')
            
            # Group by resource and sum usage
            grouped = df.groupby(df.get('ResourceName', df.get('ResourceId', 'Unknown')), as_index=False).agg({
                'UsageQuantity': 'sum',
                'Cost': 'sum',
                'ResourceType': 'first',
                'Location': 'first'
            }).sort_values('UsageQuantity', ascending=False).head(limit)
            
            resources = []
            for _, row in grouped.iterrows():
                resources.append({
                    'name': str(row.get('ResourceName', row.get('ResourceId', 'Unknown'))),
                    'usage_quantity': float(row['UsageQuantity']),
                    'cost': float(row['Cost']),
                    'resource_type': str(row.get('ResourceType', 'Unknown')),
                    'location': str(row.get('Location', 'Unknown')),
                    'cost_per_unit': float(row['Cost'] / row['UsageQuantity']) if row['UsageQuantity'] > 0 else 0
                })
            
            return resources
        except Exception as e:
            self.logger.error(f"Error getting most used resources: {str(e)}")
            return []
    
    def get_cost_breakdown(self, df: pd.DataFrame, breakdown_by: str = 'resource_type') -> List[Dict]:
        """
        Get cost breakdown by category
        
        Args:
            df: Usage data DataFrame
            breakdown_by: Category to break down by (resource_type, location, service, meter)
            
        Returns:
            list: Cost breakdown data
        """
        try:
            df['Cost'] = pd.to_numeric(df.get('Cost', 0), errors='coerce')
            
            # Map breakdown_by to column names
            column_map = {
                'resource_type': 'ResourceType',
                'location': 'Location',
                'service': 'MeterCategory',
                'meter': 'MeterName'
            }
            
            column = column_map.get(breakdown_by, 'ResourceType')
            
            # Group and aggregate
            grouped = df.groupby(column, as_index=False).agg({
                'Cost': 'sum',
                'UsageQuantity': 'sum'
            }).sort_values('Cost', ascending=False)
            
            total_cost = grouped['Cost'].sum()
            
            breakdown = []
            for _, row in grouped.iterrows():
                breakdown.append({
                    'category': str(row[column]),
                    'cost': float(row['Cost']),
                    'usage_quantity': float(row['UsageQuantity']),
                    'percentage': round((float(row['Cost']) / total_cost) * 100, 2)
                })
            
            return breakdown
        except Exception as e:
            self.logger.error(f"Error getting cost breakdown: {str(e)}")
            return []
    
    def get_cost_summary(self, df: pd.DataFrame) -> Dict:
        """
        Get overall cost summary
        
        Args:
            df: Usage data DataFrame
            
        Returns:
            dict: Cost summary
        """
        try:
            df['Cost'] = pd.to_numeric(df.get('Cost', 0), errors='coerce')
            df['UsageQuantity'] = pd.to_numeric(df.get('UsageQuantity', 0), errors='coerce')
            
            total_cost = float(df['Cost'].sum())
            avg_daily_cost = total_cost / 30  # Assume 30 days
            
            return {
                'total_cost': total_cost,
                'average_daily_cost': avg_daily_cost,
                'resource_count': len(df),
                'unique_resources': df['ResourceName'].nunique() if 'ResourceName' in df.columns else 0,
                'unique_locations': df['Location'].nunique() if 'Location' in df.columns else 0,
                'unique_resource_types': df['ResourceType'].nunique() if 'ResourceType' in df.columns else 0,
                'total_usage': float(df['UsageQuantity'].sum()),
                'data_points': len(df),
                'timestamp': datetime.utcnow().isoformat()
            }
        except Exception as e:
            self.logger.error(f"Error getting cost summary: {str(e)}")
            return {}
    
    def get_cost_trends(self, df: pd.DataFrame, days: int = 30) -> List[Dict]:
        """
        Get cost trends over time
        
        Args:
            df: Usage data DataFrame
            days: Number of days to analyze
            
        Returns:
            list: Cost trends
        """
        try:
            # Try to parse date columns
            date_columns = [col for col in df.columns if 'date' in col.lower() or 'time' in col.lower()]
            if date_columns:
                df['Date'] = pd.to_datetime(df[date_columns[0]], errors='coerce')
            else:
                # If no date column, create dummy dates
                df['Date'] = pd.date_range(start=datetime.utcnow() - timedelta(days=days), periods=len(df), freq='D')
            
            df['Cost'] = pd.to_numeric(df.get('Cost', 0), errors='coerce')
            
            # Group by date and sum costs
            daily_costs = df.groupby(df['Date'].dt.date).agg({'Cost': 'sum'}).reset_index()
            daily_costs.columns = ['date', 'cost']
            daily_costs = daily_costs.sort_values('date')
            
            trends = []
            for _, row in daily_costs.iterrows():
                trends.append({
                    'date': str(row['date']),
                    'cost': float(row['cost'])
                })
            
            return trends
        except Exception as e:
            self.logger.error(f"Error getting cost trends: {str(e)}")
            return []

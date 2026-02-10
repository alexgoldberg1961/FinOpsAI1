"""
Recommendation engine for cost optimization
Generates cost-saving recommendations based on usage patterns
"""

import logging
import pandas as pd
from typing import List, Dict

logger = logging.getLogger(__name__)


class RecommendationEngine:
    """Generates cost optimization recommendations"""
    
    def __init__(self):
        """Initialize recommendation engine"""
        self.logger = logger
    
    def generate_recommendations(self, df: pd.DataFrame) -> List[Dict]:
        """
        Generate cost optimization recommendations
        
        Args:
            df: Usage data DataFrame
            
        Returns:
            list: Cost optimization recommendations
        """
        recommendations = []
        
        try:
            df['Cost'] = pd.to_numeric(df.get('Cost', 0), errors='coerce')
            df['UsageQuantity'] = pd.to_numeric(df.get('UsageQuantity', 0), errors='coerce')
            
            # Recommendation 1: Identify and remove unused resources
            unused_resources = self._identify_unused_resources(df)
            if unused_resources:
                recommendations.append({
                    'id': 'R001',
                    'title': 'Remove Unused Resources',
                    'description': f'Found {len(unused_resources)} resources with minimal usage',
                    'severity': 'High',
                    'estimated_savings': sum(r['cost'] for r in unused_resources),
                    'details': unused_resources[:5]  # Top 5
                })
            
            # Recommendation 2: Consolidate by location
            location_consolidation = self._recommend_location_consolidation(df)
            if location_consolidation:
                recommendations.append({
                    'id': 'R002',
                    'title': 'Optimize by Location',
                    'description': 'Consider consolidating resources to lower-cost regions',
                    'severity': 'Medium',
                    'estimated_savings': location_consolidation['savings'],
                    'details': location_consolidation['details']
                })
            
            # Recommendation 3: Reserved instances
            reserved_instances = self._recommend_reserved_instances(df)
            if reserved_instances:
                recommendations.append({
                    'id': 'R003',
                    'title': 'Purchase Reserved Instances',
                    'description': 'Migrate high-usage resources to reserved instances for better pricing',
                    'severity': 'High',
                    'estimated_savings': reserved_instances['savings'],
                    'details': reserved_instances['details']
                })
            
            # Recommendation 4: Right-sizing
            rightsizing = self._recommend_rightsizing(df)
            if rightsizing:
                recommendations.append({
                    'id': 'R004',
                    'title': 'Right-size Over-provisioned Resources',
                    'description': 'Downsize resources with low utilization',
                    'severity': 'Medium',
                    'estimated_savings': rightsizing['savings'],
                    'details': rightsizing['details']
                })
            
            # Recommendation 5: Azure Hybrid Benefit
            hybrid_benefit = self._recommend_hybrid_benefit(df)
            if hybrid_benefit:
                recommendations.append({
                    'id': 'R005',
                    'title': 'Apply Azure Hybrid Benefit',
                    'description': 'Use existing licenses for Windows and SQL Server',
                    'severity': 'Medium',
                    'estimated_savings': hybrid_benefit['savings'],
                    'details': hybrid_benefit['details']
                })
            
            # Recommendation 6: Spot instances
            spot_instances = self._recommend_spot_instances(df)
            if spot_instances:
                recommendations.append({
                    'id': 'R006',
                    'title': 'Use Spot Virtual Machines',
                    'description': 'Leverage spot instances for non-critical workloads',
                    'severity': 'Low',
                    'estimated_savings': spot_instances['savings'],
                    'details': spot_instances['details']
                })
            
            # Recommendation 7: Storage optimization
            storage_opt = self._recommend_storage_optimization(df)
            if storage_opt:
                recommendations.append({
                    'id': 'R007',
                    'title': 'Optimize Storage Configuration',
                    'description': 'Move data to cheaper storage tiers and delete old snapshots',
                    'severity': 'Medium',
                    'estimated_savings': storage_opt['savings'],
                    'details': storage_opt['details']
                })
            
            # Sort by estimated savings
            recommendations.sort(key=lambda x: x.get('estimated_savings', 0), reverse=True)
            
            return recommendations
            
        except Exception as e:
            self.logger.error(f"Error generating recommendations: {str(e)}")
            return recommendations
    
    def _identify_unused_resources(self, df: pd.DataFrame) -> List[Dict]:
        """Identify unused resources with minimal cost"""
        try:
            df['UsageQuantity'] = pd.to_numeric(df.get('UsageQuantity', 0), errors='coerce')
            df['Cost'] = pd.to_numeric(df.get('Cost', 0), errors='coerce')
            
            # Find resources with zero or near-zero usage
            unused = df[df['UsageQuantity'] <= 1].copy()
            
            if len(unused) == 0:
                return []
            
            grouped = unused.groupby(df.get('ResourceName', df.get('ResourceId', 'Unknown')), as_index=False).agg({
                'Cost': 'sum',
                'UsageQuantity': 'sum',
                'ResourceType': 'first'
            }).sort_values('Cost', ascending=False).head(10)
            
            return [{
                'resource': str(row['ResourceName']),
                'type': str(row['ResourceType']),
                'cost': float(row['Cost']),
                'usage': float(row['UsageQuantity']),
                'action': 'Delete or stop the resource'
            } for _, row in grouped.iterrows()]
            
        except Exception as e:
            self.logger.error(f"Error identifying unused resources: {str(e)}")
            return []
    
    def _recommend_location_consolidation(self, df: pd.DataFrame) -> Dict:
        """Recommend location consolidation"""
        try:
            df['Cost'] = pd.to_numeric(df.get('Cost', 0), errors='coerce')
            
            locations = df.groupby('Location', as_index=False)['Cost'].sum().sort_values('Cost', ascending=False)
            
            if len(locations) <= 1:
                return {}
            
            expensive_location = locations.iloc[0]
            cheaper_location = locations.iloc[-1]
            
            if expensive_location['Cost'] > cheaper_location['Cost'] * 1.3:
                savings = (expensive_location['Cost'] - cheaper_location['Cost']) * 0.2
                
                return {
                    'savings': savings,
                    'details': [{
                        'from': expensive_location['Location'],
                        'to': cheaper_location['Location'],
                        'current_cost': float(expensive_location['Cost']),
                        'potential_savings': float(savings)
                    }]
                }
            
            return {}
        except Exception as e:
            self.logger.error(f"Error recommending location consolidation: {str(e)}")
            return {}
    
    def _recommend_reserved_instances(self, df: pd.DataFrame) -> Dict:
        """Recommend reserved instances"""
        try:
            df['Cost'] = pd.to_numeric(df.get('Cost', 0), errors='coerce')
            
            # High-cost resources could benefit from reserved instances
            high_cost = df.groupby(df.get('ResourceType', 'Unknown'), as_index=False)['Cost'].sum()
            high_cost = high_cost[high_cost['Cost'] > high_cost['Cost'].mean() * 2]
            
            if len(high_cost) == 0:
                return {}
            
            total_savings = high_cost['Cost'].sum() * 0.30  # 30% savings with reserved instances
            
            return {
                'savings': float(total_savings),
                'details': [{
                    'resource_type': str(row['ResourceType']),
                    'current_cost': float(row['Cost']),
                    'estimated_savings_with_ri': float(row['Cost'] * 0.30)
                } for _, row in high_cost.head(5).iterrows()]
            }
        except Exception as e:
            self.logger.error(f"Error recommending reserved instances: {str(e)}")
            return {}
    
    def _recommend_rightsizing(self, df: pd.DataFrame) -> Dict:
        """Recommend right-sizing of resources"""
        try:
            df['UsageQuantity'] = pd.to_numeric(df.get('UsageQuantity', 0), errors='coerce')
            df['Cost'] = pd.to_numeric(df.get('Cost', 0), errors='coerce')
            
            # Find resources with low usage relative to cost
            df['cost_per_unit'] = df['Cost'] / (df['UsageQuantity'] + 0.001)
            
            low_util = df[df['UsageQuantity'] < df['UsageQuantity'].quantile(0.25)].copy()
            
            if len(low_util) == 0:
                return {}
            
            grouped = low_util.groupby(df.get('ResourceType', 'Unknown'), as_index=False).agg({
                'Cost': 'sum',
                'UsageQuantity': 'mean'
            })
            
            potential_savings = grouped['Cost'].sum() * 0.25  # 25% savings from rightsizing
            
            return {
                'savings': float(potential_savings),
                'details': [{
                    'resource_type': str(row['ResourceType']),
                    'avg_usage': float(row['UsageQuantity']),
                    'current_cost': float(row['Cost']),
                    'estimated_savings': float(row['Cost'] * 0.25)
                } for _, row in grouped.head(5).iterrows()]
            }
        except Exception as e:
            self.logger.error(f"Error recommending right-sizing: {str(e)}")
            return {}
    
    def _recommend_hybrid_benefit(self, df: pd.DataFrame) -> Dict:
        """Recommend Azure Hybrid Benefit"""
        try:
            df['Cost'] = pd.to_numeric(df.get('Cost', 0), errors='coerce')
            
            # Check for Windows and SQL Server resources
            windows_sql = df[df.get('MeterName', '').str.contains('Windows|SQL', case=False, na=False)]
            
            if len(windows_sql) == 0:
                return {}
            
            total_cost = windows_sql['Cost'].sum()
            savings = total_cost * 0.40  # 40% savings with Azure Hybrid Benefit
            
            return {
                'savings': float(savings),
                'details': [{
                    'benefit': 'Azure Hybrid Benefit for Windows Server and SQL Server',
                    'current_cost': float(total_cost),
                    'estimated_savings': float(savings),
                    'action': 'Enroll licenses in Azure Hybrid Benefit program'
                }]
            }
        except Exception as e:
            self.logger.error(f"Error recommending hybrid benefit: {str(e)}")
            return {}
    
    def _recommend_spot_instances(self, df: pd.DataFrame) -> Dict:
        """Recommend Spot Instances"""
        try:
            df['Cost'] = pd.to_numeric(df.get('Cost', 0), errors='coerce')
            
            # VMs that could run on spot instances
            vms = df[df.get('ResourceType', '').str.contains('Virtual Machine|VM', case=False, na=False)]
            
            if len(vms) == 0:
                return {}
            
            total_vm_cost = vms['Cost'].sum()
            # Assume 30% of VMs can run on spot instances
            eligible_cost = total_vm_cost * 0.30
            savings = eligible_cost * 0.70  # 70% savings with spot instances
            
            return {
                'savings': float(savings),
                'details': [{
                    'recommendation': 'Use Spot Virtual Machines for non-critical workloads',
                    'vm_costs': float(total_vm_cost),
                    'eligible_percentage': 30,
                    'estimated_savings': float(savings)
                }]
            }
        except Exception as e:
            self.logger.error(f"Error recommending spot instances: {str(e)}")
            return {}
    
    def _recommend_storage_optimization(self, df: pd.DataFrame) -> Dict:
        """Recommend storage optimization"""
        try:
            df['Cost'] = pd.to_numeric(df.get('Cost', 0), errors='coerce')
            
            # Storage resources
            storage = df[df.get('MeterCategory', '').str.contains('Storage', case=False, na=False)]
            
            if len(storage) == 0:
                return {}
            
            total_storage_cost = storage['Cost'].sum()
            # Storage optimization can save 15-20%
            savings = total_storage_cost * 0.15
            
            return {
                'savings': float(savings),
                'details': [{
                    'action': 'Move cold data to Archive tier',
                    'current_cost': float(total_storage_cost),
                    'estimated_savings': float(savings),
                    'impact': 'Reduce hot storage by moving infrequently accessed data'
                }]
            }
        except Exception as e:
            self.logger.error(f"Error recommending storage optimization: {str(e)}")
            return {}

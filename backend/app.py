"""
FinOps Azure Cost Analysis Web Application Backend
Main Flask application for analyzing Azure usage and cost data
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
import os
import logging
from datetime import datetime, timedelta

# Import custom modules
from azure_integration import AzureStorageManager, AzureCostManager
from cost_analyzer import CostAnalyzer
from recommendations import RecommendationEngine

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize managers
azure_storage = None
cost_manager = None

# Try to initialize Azure managers only if credentials are available
try:
    if os.getenv('AZURE_STORAGE_ACCOUNT_NAME') and os.getenv('AZURE_STORAGE_ACCOUNT_KEY'):
        azure_storage = AzureStorageManager(
            account_name=os.getenv('AZURE_STORAGE_ACCOUNT_NAME'),
            account_key=os.getenv('AZURE_STORAGE_ACCOUNT_KEY'),
            container_name=os.getenv('AZURE_STORAGE_CONTAINER_NAME', 'finops-data')
        )
        logger.info("Azure Storage Manager initialized")
    else:
        logger.warning("Azure Storage credentials not provided, using mock data")
        
    if all([os.getenv('AZURE_SUBSCRIPTION_ID'), os.getenv('AZURE_TENANT_ID'), 
            os.getenv('AZURE_CLIENT_ID'), os.getenv('AZURE_CLIENT_SECRET')]):
        cost_manager = AzureCostManager(
            subscription_id=os.getenv('AZURE_SUBSCRIPTION_ID'),
            tenant_id=os.getenv('AZURE_TENANT_ID'),
            client_id=os.getenv('AZURE_CLIENT_ID'),
            client_secret=os.getenv('AZURE_CLIENT_SECRET')
        )
        logger.info("Azure Cost Manager initialized")
    else:
        logger.warning("Azure Cost credentials not provided, using mock data")
except Exception as e:
    logger.error(f"Error initializing Azure managers: {e}")
    logger.warning("Proceeding with mock data")

cost_analyzer = CostAnalyzer()
recommendation_engine = RecommendationEngine()

# Mock data cache
_mock_data_cache = None

def get_usage_data():
    """Get usage data from Azure Storage or mock data if credentials unavailable or fails"""
    global _mock_data_cache
    
    if azure_storage is not None:
        try:
            data = azure_storage.get_latest_usage_file()
            if data is not None:
                return data
            logger.warning("Azure Storage returned no data, falling back to mock data")
        except Exception as e:
            logger.warning(f"Azure Storage failed: {str(e)}, falling back to mock data")
    
    # Use mock data
    if _mock_data_cache is None:
        try:
            import pandas as pd
            mock_file_path = os.path.join(os.path.dirname(__file__), '..', 'sample-usage.CSV')
            if os.path.exists(mock_file_path):
                _mock_data_cache = pd.read_csv(mock_file_path)
                logger.info("Loaded mock data from sample-usage.CSV")
            else:
                logger.warning(f"Mock data file not found at {mock_file_path}")
                return None
        except Exception as e:
            logger.error(f"Error loading mock data: {str(e)}")
            return None
    
    return _mock_data_cache


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint for Kubernetes liveness and readiness probes"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'service': 'FinOps Azure Cost Analysis'
    }), 200


@app.route('/api/usage-report', methods=['GET'])
def get_usage_report():
    """
    Fetch and analyze the latest usage CSV report from Azure Storage
    Query params: 
    - days: number of days to analyze (default: 30)
    - resource_type: filter by resource type (optional)
    """
    try:
        days = request.args.get('days', 30, type=int)
        resource_type = request.args.get('resource_type', None)
        
        # Fetch latest CSV file
        logger.info(f"Fetching usage report for last {days} days")
        csv_data = get_usage_data()
        
        if not csv_data:
            return jsonify({'error': 'No usage data available'}), 404
        
        # Analyze the data
        analysis = cost_analyzer.analyze_usage(csv_data, days=days, resource_type=resource_type)
        
        return jsonify(analysis), 200
    except Exception as e:
        logger.error(f"Error fetching usage report: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/most-expensive-resources', methods=['GET'])
def get_most_expensive_resources():
    """Get the most expensive resources"""
    try:
        limit = request.args.get('limit', 10, type=int)
        
        csv_data = get_usage_data()
        if not csv_data:
            return jsonify({'error': 'No usage data available'}), 404
        
        expensive = cost_analyzer.get_most_expensive_resources(csv_data, limit=limit)
        
        return jsonify({
            'resources': expensive,
            'count': len(expensive),
            'timestamp': datetime.utcnow().isoformat()
        }), 200
    except Exception as e:
        logger.error(f"Error getting expensive resources: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/least-used-resources', methods=['GET'])
def get_least_used_resources():
    """Get the least used resources"""
    try:
        limit = request.args.get('limit', 10, type=int)
        
        csv_data = get_usage_data()
        if not csv_data:
            return jsonify({'error': 'No usage data available'}), 404
        
        least_used = cost_analyzer.get_least_used_resources(csv_data, limit=limit)
        
        return jsonify({
            'resources': least_used,
            'count': len(least_used),
            'timestamp': datetime.utcnow().isoformat()
        }), 200
    except Exception as e:
        logger.error(f"Error getting least used resources: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/most-used-resources', methods=['GET'])
def get_most_used_resources():
    """Get the most used resources"""
    try:
        limit = request.args.get('limit', 10, type=int)
        
        csv_data = get_usage_data()
        if not csv_data:
            return jsonify({'error': 'No usage data available'}), 404
        
        most_used = cost_analyzer.get_most_used_resources(csv_data, limit=limit)
        
        return jsonify({
            'resources': most_used,
            'count': len(most_used),
            'timestamp': datetime.utcnow().isoformat()
        }), 200
    except Exception as e:
        logger.error(f"Error getting most used resources: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/cost-breakdown', methods=['GET'])
def get_cost_breakdown():
    """Get cost breakdown by resource type, location, or service"""
    try:
        breakdown_by = request.args.get('by', 'resource_type', type=str)  # resource_type, location, service, meter
        
        csv_data = get_usage_data()
        if not csv_data:
            return jsonify({'error': 'No usage data available'}), 404
        
        breakdown = cost_analyzer.get_cost_breakdown(csv_data, breakdown_by=breakdown_by)
        
        return jsonify({
            'breakdown_by': breakdown_by,
            'data': breakdown,
            'timestamp': datetime.utcnow().isoformat()
        }), 200
    except Exception as e:
        logger.error(f"Error getting cost breakdown: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/recommendations', methods=['GET'])
def get_recommendations():
    """Get cost optimization recommendations"""
    try:
        csv_data = get_usage_data()
        if not csv_data:
            return jsonify({'error': 'No usage data available'}), 404
        
        recommendations = recommendation_engine.generate_recommendations(csv_data)
        
        return jsonify({
            'recommendations': recommendations,
            'count': len(recommendations),
            'timestamp': datetime.utcnow().isoformat()
        }), 200
    except Exception as e:
        logger.error(f"Error generating recommendations: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/cost-summary', methods=['GET'])
def get_cost_summary():
    """Get overall cost summary and metrics"""
    try:
        csv_data = get_usage_data()
        if not csv_data:
            return jsonify({'error': 'No usage data available'}), 404
        
        summary = cost_analyzer.get_cost_summary(csv_data)
        
        return jsonify(summary), 200
    except Exception as e:
        logger.error(f"Error getting cost summary: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/trend-analysis', methods=['GET'])
def get_trend_analysis():
    """Get cost trends over time"""
    try:
        days = request.args.get('days', 30, type=int)
        
        csv_data = get_usage_data()
        if not csv_data:
            return jsonify({'error': 'No usage data available'}), 404
        
        trends = cost_analyzer.get_cost_trends(csv_data, days=days)
        
        return jsonify({
            'trends': trends,
            'period_days': days,
            'timestamp': datetime.utcnow().isoformat()
        }), 200
    except Exception as e:
        logger.error(f"Error getting trend analysis: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/refresh-data', methods=['POST'])
def refresh_data():
    """Manually trigger data refresh from Azure Storage"""
    try:
        logger.info("Refreshing data from Azure Storage")
        global _mock_data_cache
        if azure_storage is not None:
            azure_storage.refresh_cache()
        else:
            _mock_data_cache = None  # Clear mock data cache
        
        return jsonify({
            'status': 'success',
            'message': 'Data refreshed successfully',
            'timestamp': datetime.utcnow().isoformat()
        }), 200
    except Exception as e:
        logger.error(f"Error refreshing data: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({'error': 'Endpoint not found'}), 404


@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    return jsonify({'error': 'Internal server error'}), 500


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=os.getenv('FLASK_ENV') == 'development')

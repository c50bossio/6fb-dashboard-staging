#!/bin/bash

# Monitoring Deployment Script for 6FB AI Agent System
# Deploys Prometheus, Grafana, and AlertManager

set -e

echo "📊 Deploying Monitoring Stack for 6FB AI Agent System..."

# Configuration
MONITORING_NAMESPACE="monitoring"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if namespace exists
check_namespace() {
    if kubectl get namespace ${MONITORING_NAMESPACE} &> /dev/null; then
        echo -e "${YELLOW}⚠️  Namespace ${MONITORING_NAMESPACE} already exists${NC}"
    else
        echo "Creating namespace ${MONITORING_NAMESPACE}..."
        kubectl create namespace ${MONITORING_NAMESPACE}
    fi
}

# Function to deploy Prometheus
deploy_prometheus() {
    echo "🎯 Deploying Prometheus..."
    
    # Apply ConfigMaps
    kubectl apply -f monitoring/prometheus-config.yaml
    kubectl apply -f monitoring/prometheus-rules.yaml
    
    # Deploy Prometheus
    kubectl apply -f monitoring/prometheus-deployment.yaml
    
    echo -e "${GREEN}✅ Prometheus deployed${NC}"
}

# Function to deploy Grafana
deploy_grafana() {
    echo "📈 Deploying Grafana..."
    
    # Apply ConfigMaps
    kubectl apply -f monitoring/grafana-dashboards.yaml
    
    # Deploy Grafana
    kubectl apply -f monitoring/grafana-deployment.yaml
    
    echo -e "${GREEN}✅ Grafana deployed${NC}"
}

# Function to deploy AlertManager
deploy_alertmanager() {
    echo "🚨 Deploying AlertManager..."
    
    # Deploy AlertManager
    kubectl apply -f monitoring/alertmanager-deployment.yaml
    
    echo -e "${GREEN}✅ AlertManager deployed${NC}"
}

# Function to deploy Ingress
deploy_ingress() {
    echo "🌐 Deploying Monitoring Ingress..."
    
    # Deploy Ingress
    kubectl apply -f monitoring/monitoring-ingress.yaml
    
    echo -e "${GREEN}✅ Monitoring Ingress deployed${NC}"
}

# Function to wait for deployments
wait_for_deployments() {
    echo "⏳ Waiting for monitoring services to be ready..."
    
    kubectl wait --for=condition=ready pod \
        -l app=prometheus -n ${MONITORING_NAMESPACE} \
        --timeout=300s || true
    
    kubectl wait --for=condition=ready pod \
        -l app=grafana -n ${MONITORING_NAMESPACE} \
        --timeout=300s || true
    
    kubectl wait --for=condition=ready pod \
        -l app=alertmanager -n ${MONITORING_NAMESPACE} \
        --timeout=300s || true
    
    echo -e "${GREEN}✅ All monitoring services are ready${NC}"
}

# Function to display access information
display_access_info() {
    echo ""
    echo "=================="
    echo "Access Information"
    echo "=================="
    
    # Get Ingress information
    INGRESS_IP=$(kubectl get ingress monitoring-ingress -n ${MONITORING_NAMESPACE} -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "pending")
    
    echo ""
    echo "📊 Prometheus:"
    echo "   URL: https://prometheus.yourdomain.com"
    echo "   Local: kubectl port-forward -n ${MONITORING_NAMESPACE} svc/prometheus 9090:9090"
    echo ""
    echo "📈 Grafana:"
    echo "   URL: https://grafana.yourdomain.com"
    echo "   Local: kubectl port-forward -n ${MONITORING_NAMESPACE} svc/grafana 3000:3000"
    echo "   Default Login: admin / changeme"
    echo ""
    echo "🚨 AlertManager:"
    echo "   URL: https://alerts.yourdomain.com"
    echo "   Local: kubectl port-forward -n ${MONITORING_NAMESPACE} svc/alertmanager 9093:9093"
    echo ""
    echo "🌐 Ingress IP: ${INGRESS_IP}"
    echo ""
    echo "📝 Notes:"
    echo "   - Update DNS records to point to the Ingress IP"
    echo "   - Configure SMTP settings in AlertManager for email alerts"
    echo "   - Configure Slack webhook for Slack notifications"
    echo "   - Change default Grafana password immediately"
    echo "   - Update monitoring-auth secret for basic authentication"
}

# Function to create sample alerts
create_sample_alerts() {
    echo ""
    echo "📋 Sample kubectl commands:"
    echo ""
    echo "# View Prometheus targets:"
    echo "kubectl port-forward -n ${MONITORING_NAMESPACE} svc/prometheus 9090:9090"
    echo "# Then visit http://localhost:9090/targets"
    echo ""
    echo "# View Grafana dashboards:"
    echo "kubectl port-forward -n ${MONITORING_NAMESPACE} svc/grafana 3000:3000"
    echo "# Then visit http://localhost:3000"
    echo ""
    echo "# Check AlertManager:"
    echo "kubectl port-forward -n ${MONITORING_NAMESPACE} svc/alertmanager 9093:9093"
    echo "# Then visit http://localhost:9093"
    echo ""
    echo "# View monitoring pods:"
    echo "kubectl get pods -n ${MONITORING_NAMESPACE}"
    echo ""
    echo "# View monitoring logs:"
    echo "kubectl logs -f -n ${MONITORING_NAMESPACE} -l app=prometheus"
    echo "kubectl logs -f -n ${MONITORING_NAMESPACE} -l app=grafana"
    echo "kubectl logs -f -n ${MONITORING_NAMESPACE} -l app=alertmanager"
}

# Main deployment flow
main() {
    echo "================================"
    echo "Monitoring Stack Deployment"
    echo "================================"
    echo ""
    
    # Check namespace
    check_namespace
    
    # Deploy components
    deploy_prometheus
    deploy_grafana
    deploy_alertmanager
    deploy_ingress
    
    # Wait for deployments
    wait_for_deployments
    
    # Display access information
    display_access_info
    
    # Show sample commands
    create_sample_alerts
    
    echo ""
    echo -e "${GREEN}🎉 Monitoring stack deployed successfully!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Update DNS records for monitoring domains"
    echo "2. Configure alert notification channels"
    echo "3. Import additional Grafana dashboards"
    echo "4. Set up backup for monitoring data"
}

# Run main function
main "$@"
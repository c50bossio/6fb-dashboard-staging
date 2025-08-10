#!/bin/bash

# Kubernetes Deployment Script for 6FB AI Agent System
# Production-ready deployment with security and monitoring

set -e

echo "🚀 Deploying 6FB AI Agent System to Kubernetes..."

# Configuration
NAMESPACE="agent-system"
REGISTRY="your-registry"  # Update with your registry
VERSION="${VERSION:-latest}"
CLUSTER_NAME="${CLUSTER_NAME:-production}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check prerequisites
check_prerequisites() {
    echo "📋 Checking prerequisites..."
    
    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        echo -e "${RED}❌ kubectl is not installed${NC}"
        exit 1
    fi
    
    # Check cluster connection
    if ! kubectl cluster-info &> /dev/null; then
        echo -e "${RED}❌ Cannot connect to Kubernetes cluster${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Prerequisites satisfied${NC}"
}

# Function to build and push Docker images
build_and_push_images() {
    echo "🔨 Building and pushing Docker images..."
    
    # Build frontend
    docker build -f Dockerfile.frontend.optimized -t ${REGISTRY}/6fb-ai-frontend:${VERSION} .
    docker push ${REGISTRY}/6fb-ai-frontend:${VERSION}
    
    # Build backend
    docker build -f Dockerfile.backend.optimized -t ${REGISTRY}/6fb-ai-backend:${VERSION} .
    docker push ${REGISTRY}/6fb-ai-backend:${VERSION}
    
    echo -e "${GREEN}✅ Images built and pushed${NC}"
}

# Function to deploy to Kubernetes
deploy_to_kubernetes() {
    echo "☸️  Deploying to Kubernetes cluster..."
    
    # Create namespace
    kubectl apply -f kubernetes/namespace.yaml
    
    # Apply configurations
    kubectl apply -f kubernetes/configmap.yaml
    
    # Apply secrets (ensure they're configured first!)
    if [ -f kubernetes/secrets-sealed.yaml ]; then
        kubectl apply -f kubernetes/secrets-sealed.yaml
    else
        echo -e "${YELLOW}⚠️  Warning: Using plain secrets.yaml - not recommended for production${NC}"
        kubectl apply -f kubernetes/secrets.yaml
    fi
    
    # Deploy Redis
    kubectl apply -f kubernetes/redis-deployment.yaml
    
    # Deploy Backend
    kubectl apply -f kubernetes/backend-deployment.yaml
    
    # Deploy Frontend
    kubectl apply -f kubernetes/frontend-deployment.yaml
    
    # Apply Ingress
    kubectl apply -f kubernetes/ingress.yaml
    
    # Apply HPA
    kubectl apply -f kubernetes/horizontal-pod-autoscaler.yaml
    
    # Apply Network Policies
    kubectl apply -f kubernetes/network-policy.yaml
    
    echo -e "${GREEN}✅ Deployment successful${NC}"
}

# Function to wait for deployment
wait_for_deployment() {
    echo "⏳ Waiting for pods to be ready..."
    
    kubectl wait --for=condition=ready pod \
        -l app=backend -n ${NAMESPACE} \
        --timeout=300s
    
    kubectl wait --for=condition=ready pod \
        -l app=frontend -n ${NAMESPACE} \
        --timeout=300s
    
    kubectl wait --for=condition=ready pod \
        -l app=redis -n ${NAMESPACE} \
        --timeout=120s
    
    echo -e "${GREEN}✅ All pods are ready${NC}"
}

# Function to display deployment status
display_status() {
    echo ""
    echo "📊 Deployment Status:"
    echo "===================="
    kubectl get all -n ${NAMESPACE}
    echo ""
    echo "🌐 Ingress Information:"
    kubectl get ingress -n ${NAMESPACE}
    echo ""
    echo "💾 Resource Usage:"
    kubectl top pods -n ${NAMESPACE} 2>/dev/null || echo "Metrics not available"
    echo ""
}

# Function to run health checks
run_health_checks() {
    echo "🏥 Running health checks..."
    
    # Get service endpoints
    BACKEND_POD=$(kubectl get pod -n ${NAMESPACE} -l app=backend -o jsonpath='{.items[0].metadata.name}')
    FRONTEND_POD=$(kubectl get pod -n ${NAMESPACE} -l app=frontend -o jsonpath='{.items[0].metadata.name}')
    
    # Check backend health
    kubectl exec -n ${NAMESPACE} ${BACKEND_POD} -- curl -s http://localhost:8000/health || echo "Backend health check failed"
    
    # Check frontend health
    kubectl exec -n ${NAMESPACE} ${FRONTEND_POD} -- curl -s http://localhost:9999/api/health || echo "Frontend health check failed"
    
    echo -e "${GREEN}✅ Health checks completed${NC}"
}

# Main deployment flow
main() {
    echo "================================"
    echo "6FB AI Agent System Deployment"
    echo "================================"
    echo "Cluster: ${CLUSTER_NAME}"
    echo "Version: ${VERSION}"
    echo "Registry: ${REGISTRY}"
    echo ""
    
    check_prerequisites
    
    # Ask for confirmation
    read -p "Do you want to build and push images? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        build_and_push_images
    fi
    
    deploy_to_kubernetes
    wait_for_deployment
    run_health_checks
    display_status
    
    echo ""
    echo -e "${GREEN}🎉 6FB AI Agent System deployed successfully!${NC}"
    echo ""
    echo "📝 Next steps:"
    echo "  1. Update DNS to point to ingress IP"
    echo "  2. Verify SSL certificate provisioning"
    echo "  3. Set up monitoring with Prometheus"
    echo "  4. Configure backup strategy"
    echo ""
    echo "Useful commands:"
    echo "  kubectl logs -f -n ${NAMESPACE} -l app=backend"
    echo "  kubectl logs -f -n ${NAMESPACE} -l app=frontend"
    echo "  kubectl get events -n ${NAMESPACE}"
    echo "  kubectl describe ingress agent-ingress -n ${NAMESPACE}"
}

# Run main function
main "$@"
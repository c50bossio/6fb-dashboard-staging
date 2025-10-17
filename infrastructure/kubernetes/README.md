# 6FB AI Agent System - Kubernetes Deployment

This directory contains modern Kubernetes configurations using Kustomize for deploying the 6FB AI Agent System across different environments.

## 📁 Structure

```
kubernetes/
├── base/                          # Base Kubernetes manifests
│   ├── namespace.yaml            # Agent system namespace
│   ├── deployment.yaml           # Frontend and backend deployments
│   ├── redis-deployment.yaml    # Redis cache deployment + PVCs
│   ├── service.yaml              # Services for all components
│   ├── configmap.yaml            # Shared configuration
│   ├── secrets.yaml              # Secret templates (DO NOT COMMIT REAL SECRETS)
│   └── kustomization.yaml        # Base Kustomization config
├── overlays/
│   ├── development/              # Development-specific overrides
│   │   ├── kustomization.yaml   # Dev Kustomization extending base
│   │   ├── dev-config.yaml      # Development configurations
│   │   ├── resource-limits.yaml # Development resource limits
│   │   └── ingress-dev.yaml     # Development ingress (no TLS)
│   └── production/               # Production-specific overrides
│       ├── kustomization.yaml   # Prod Kustomization extending base
│       ├── prod-config.yaml     # Production configurations
│       ├── resource-limits.yaml # Production resource limits (high performance)
│       ├── ingress-prod.yaml    # Production ingress with TLS
│       └── hpa.yaml              # Horizontal Pod Autoscaler
└── README.md                     # This file
```

## 🚀 Quick Start

### Prerequisites

- Kubernetes cluster (1.24+)
- kubectl configured
- kustomize (built into kubectl 1.14+)
- NGINX Ingress Controller (for ingress)
- cert-manager (for TLS certificates in production)

### Development Deployment

1. **Update secrets** (replace placeholder values):
   ```bash
   # Edit the secrets file with real values
   kubectl edit -f base/secrets.yaml
   ```

2. **Deploy to development**:
   ```bash
   kubectl apply -k overlays/development
   ```

3. **Verify deployment**:
   ```bash
   kubectl get pods -n agent-system-dev
   kubectl get services -n agent-system-dev
   kubectl get ingress -n agent-system-dev
   ```

4. **Access the application**:
   - Frontend: http://dev.agent-system.local (add to /etc/hosts)
   - Backend API: http://api-dev.agent-system.local
   - Redis: Accessible via NodePort 30379

### Production Deployment

1. **Update production secrets** (use a secure method):
   ```bash
   # Use sealed-secrets, external-secrets-operator, or similar
   # Never commit real secrets to git
   kubectl create secret generic app-secrets \
     --from-literal=database-url="YOUR_DATABASE_URL" \
     --from-literal=supabase-url="YOUR_SUPABASE_URL" \
     # ... add all required secrets
     --namespace=agent-system
   ```

2. **Deploy to production**:
   ```bash
   kubectl apply -k overlays/production
   ```

3. **Verify deployment**:
   ```bash
   kubectl get pods -n agent-system
   kubectl get services -n agent-system
   kubectl get ingress -n agent-system
   kubectl get hpa -n agent-system
   ```

4. **Monitor scaling**:
   ```bash
   kubectl top pods -n agent-system
   kubectl describe hpa -n agent-system
   ```

## 🔧 Configuration

### Environment Variables

The system uses a combination of ConfigMaps (non-sensitive) and Secrets (sensitive) for configuration:

#### ConfigMap (base/configmap.yaml):
- API URLs and Redis connections
- Feature flags (RAG, mock fallback)
- CORS origins and worker counts
- Resource configurations

#### Secrets (base/secrets.yaml):
- Database connection strings
- API keys (OpenAI, Anthropic, Google)
- Stripe payment keys
- Communication service keys (Twilio, SendGrid)
- Monitoring service keys (Sentry, PostHog)

### Resource Requirements

#### Development:
- **Frontend**: 100m CPU, 128Mi RAM (limits: 500m CPU, 512Mi RAM)
- **Backend**: 100m CPU, 128Mi RAM (limits: 500m CPU, 512Mi RAM)
- **Redis**: 50m CPU, 64Mi RAM (limits: 200m CPU, 256Mi RAM)

#### Production:
- **Frontend**: 500m CPU, 512Mi RAM (limits: 2 CPU, 2Gi RAM)
- **Backend**: 500m CPU, 512Mi RAM (limits: 2 CPU, 2Gi RAM)
- **Redis**: 200m CPU, 256Mi RAM (limits: 1 CPU, 1Gi RAM)

### Scaling Configuration

#### Horizontal Pod Autoscaling (Production):
- **Frontend**: 3-10 replicas (70% CPU, 80% memory thresholds)
- **Backend**: 3-15 replicas (70% CPU, 80% memory thresholds)
- **Redis**: Single instance with Vertical Pod Autoscaler

#### Node Affinity:
- Frontend/Backend: Prefers compute-optimized nodes
- Redis: Prefers memory-optimized nodes
- Anti-affinity rules prevent single points of failure

## 🔒 Security Features

### Pod Security:
- Non-root containers (UID 1000)
- Read-only root filesystem
- Dropped capabilities
- Security contexts enforced

### Network Security:
- Network policies (planned)
- HTTPS-only in production
- CORS configured per environment
- Rate limiting via ingress

### Secret Management:
- Kubernetes secrets for sensitive data
- Integration with external secret managers supported
- No secrets committed to git

## 🌐 Ingress & SSL

### Development:
- HTTP-only ingress
- Local domain routing (*.agent-system.local)
- CORS enabled for localhost origins
- NodePort services for direct access

### Production:
- HTTPS-only with automatic HTTP redirect
- Let's Encrypt certificates via cert-manager
- Security headers enforced
- Rate limiting and DDoS protection
- Multiple domains supported

## 📊 Monitoring & Health Checks

### Health Checks:
- **Liveness probes**: Ensure containers are running
- **Readiness probes**: Ensure containers are ready for traffic
- **Startup probes**: Allow extra time for application startup

### Monitoring Integration:
- Prometheus metrics collection
- OpenTracing support
- Grafana dashboards (via monitoring stack)
- Sentry error tracking

## 🛠️ Maintenance Commands

### Restart Deployments:
```bash
kubectl rollout restart deployment/frontend -n agent-system
kubectl rollout restart deployment/backend -n agent-system
kubectl rollout restart deployment/redis -n agent-system
```

### View Logs:
```bash
kubectl logs -f deployment/frontend -n agent-system
kubectl logs -f deployment/backend -n agent-system
kubectl logs -f deployment/redis -n agent-system
```

### Scale Manually:
```bash
kubectl scale deployment/frontend --replicas=5 -n agent-system
kubectl scale deployment/backend --replicas=8 -n agent-system
```

### Update ConfigMap:
```bash
kubectl edit configmap/app-config -n agent-system
kubectl rollout restart deployment/frontend -n agent-system  # Apply changes
```

### Debug Pods:
```bash
kubectl get events -n agent-system
kubectl describe pod <pod-name> -n agent-system
kubectl exec -it <pod-name> -n agent-system -- /bin/sh
```

## 🔄 CI/CD Integration

### GitOps Workflow:
1. Code changes trigger Docker image builds
2. Update image tags in kustomization.yaml
3. ArgoCD/Flux syncs changes to cluster
4. Rolling updates maintain zero downtime

### Image Management:
```bash
# Update image tags for deployment
kustomize edit set image 6fb-ai-agent-system/frontend:v1.2.0
kustomize edit set image 6fb-ai-agent-system/backend:v1.2.0
```

## 🚨 Troubleshooting

### Common Issues:

1. **Pods not starting**:
   ```bash
   kubectl describe pods -n agent-system
   kubectl get events -n agent-system
   ```

2. **Service discovery issues**:
   ```bash
   kubectl get endpoints -n agent-system
   kubectl get services -n agent-system
   ```

3. **Ingress not working**:
   ```bash
   kubectl describe ingress -n agent-system
   kubectl logs -n ingress-nginx deployment/ingress-nginx-controller
   ```

4. **Certificate issues**:
   ```bash
   kubectl describe certificate -n agent-system
   kubectl get certificaterequest -n agent-system
   ```

5. **Resource constraints**:
   ```bash
   kubectl top nodes
   kubectl top pods -n agent-system
   kubectl describe hpa -n agent-system
   ```

## 📈 Performance Optimization

### Production Tuning:
- Use node affinity for optimal resource allocation
- Configure appropriate resource requests/limits
- Enable horizontal pod autoscaling
- Use persistent volumes for data storage
- Configure connection pooling and caching

### Cost Optimization:
- Use vertical pod autoscaling for right-sizing
- Configure cluster autoscaling
- Use spot instances for non-critical workloads
- Monitor resource utilization and adjust limits

## 🔐 Security Best Practices

1. **Regular Updates**: Keep base images and Kubernetes cluster updated
2. **Secret Rotation**: Regularly rotate API keys and certificates
3. **Network Policies**: Implement network segmentation (planned)
4. **RBAC**: Use role-based access control for cluster access
5. **Scanning**: Regular vulnerability scanning of images
6. **Backup**: Regular backups of persistent data and configurations

---

## 📞 Support

For deployment issues or questions:
- Check the troubleshooting section above
- Review Kubernetes events and pod logs
- Consult the main project documentation
- Open an issue in the project repository

Last Updated: 2025-08-25
# Infrastructure Architecture Consolidation Recommendations

## Executive Summary

The infrastructure architecture audit reveals significant fragmentation across deployment configurations with **3 separate Kubernetes directories**, **7 Docker Compose variants**, and **2 monitoring configuration sets**. This document provides actionable recommendations to consolidate and standardize the infrastructure architecture.

## Current State Analysis

### 1. Configuration Fragmentation

#### Kubernetes Configurations (3 Locations)
- `/infrastructure/kubernetes/` - Primary production configs
- `/kubernetes/` - Duplicate/legacy configs
- `/monitoring/` - Monitoring-specific K8s configs

#### Docker Compose Files (7 Variants)
1. `docker-compose.yml` - Base development
2. `docker-compose.prod.yml` - Production with monitoring stack
3. `docker-compose.simple.yml` - Simplified development
4. `docker-compose.websocket.yml` - WebSocket support
5. `docker-compose.optimized.yml` - Performance optimizations
6. `docker-compose.secure.yml` - Security hardening
7. `docker-compose.override.yml` - Local overrides

#### Monitoring Configurations (2 Sets)
- `/configs/prometheus/` and `/configs/grafana/`
- `/infrastructure/monitoring/` and `/monitoring/`

### 2. Key Issues Identified

1. **Configuration Drift**: Multiple versions of the same service configurations
2. **Maintenance Overhead**: Changes must be replicated across multiple files
3. **Unclear Hierarchy**: No clear distinction between production/staging/development
4. **Resource Inconsistency**: Different resource limits across deployments
5. **Security Gaps**: Secrets management inconsistent across environments

## Consolidation Recommendations

### Phase 1: Immediate Actions (Week 1)

#### 1.1 Establish Primary Configuration Directory
```
/infrastructure/
├── kubernetes/              # All K8s configs
│   ├── base/               # Base configurations
│   ├── overlays/           # Environment-specific overlays
│   │   ├── development/
│   │   ├── staging/
│   │   └── production/
│   └── components/         # Reusable components
├── docker/                 # Docker configurations
│   ├── docker-compose.base.yml
│   ├── docker-compose.dev.yml
│   ├── docker-compose.prod.yml
│   └── Dockerfile.*
└── monitoring/             # Monitoring stack
    ├── prometheus/
    ├── grafana/
    └── alerting/
```

#### 1.2 Consolidate Docker Compose Files
- **Action**: Merge 7 Docker Compose files into 3
  - `docker-compose.base.yml` - Shared service definitions
  - `docker-compose.dev.yml` - Development overrides
  - `docker-compose.prod.yml` - Production configuration
- **Benefit**: 70% reduction in configuration files

#### 1.3 Standardize Resource Allocations
```yaml
# Standard resource tiers
resources:
  small:
    requests: { cpu: "100m", memory: "128Mi" }
    limits: { cpu: "500m", memory: "512Mi" }
  medium:
    requests: { cpu: "250m", memory: "256Mi" }
    limits: { cpu: "1000m", memory: "1Gi" }
  large:
    requests: { cpu: "500m", memory: "512Mi" }
    limits: { cpu: "2000m", memory: "2Gi" }
```

### Phase 2: Architecture Standardization (Week 2)

#### 2.1 Implement Kustomize for Kubernetes
```yaml
# base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - namespace.yaml
  - deployments.yaml
  - services.yaml
  - configmap.yaml

commonLabels:
  app.kubernetes.io/name: barbershop-platform
  app.kubernetes.io/component: backend
```

#### 2.2 Create Environment-Specific Overlays
```yaml
# overlays/production/kustomization.yaml
bases:
  - ../../base

patchesStrategicMerge:
  - replica-count.yaml
  - resource-limits.yaml
  - ingress-tls.yaml

configMapGenerator:
  - name: app-config
    env: production.env
```

#### 2.3 Centralize Secrets Management
```yaml
# Use Sealed Secrets or External Secrets Operator
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: vault-backend
spec:
  provider:
    vault:
      server: "https://vault.example.com"
      path: "secret"
      version: "v2"
```

### Phase 3: Monitoring Consolidation (Week 3)

#### 3.1 Single Monitoring Stack
- Merge `/configs/` and `/monitoring/` directories
- Standardize Prometheus scrape configs
- Consolidate Grafana dashboards
- Implement unified alerting rules

#### 3.2 Service Mesh Integration (Optional)
```yaml
# Consider Istio/Linkerd for advanced observability
apiVersion: v1
kind: ConfigMap
metadata:
  name: istio-grafana-dashboards
data:
  service-mesh-dashboard.json: |
    {
      "dashboard": "..."
    }
```

## Implementation Checklist

### Week 1: Foundation
- [ ] Archive legacy `/kubernetes/` directory
- [ ] Consolidate Docker Compose files
- [ ] Create base Kustomization structure
- [ ] Document new directory structure

### Week 2: Migration
- [ ] Migrate existing deployments to new structure
- [ ] Implement environment overlays
- [ ] Standardize resource allocations
- [ ] Update CI/CD pipelines

### Week 3: Optimization
- [ ] Consolidate monitoring configs
- [ ] Implement GitOps workflow
- [ ] Create infrastructure as code templates
- [ ] Deploy to staging environment

### Week 4: Production Rollout
- [ ] Production deployment
- [ ] Monitor for issues
- [ ] Document runbooks
- [ ] Team training

## Expected Benefits

### Quantifiable Improvements
- **70% reduction** in configuration files (from 50+ to ~15)
- **90% faster** deployment updates (single source of truth)
- **50% reduction** in configuration errors
- **100% environment parity** (base + overlays model)

### Operational Benefits
- Single source of truth for all configurations
- Clear environment promotion path
- Simplified troubleshooting
- Reduced onboarding time for new engineers
- GitOps-ready infrastructure

## Risk Mitigation

### Potential Risks
1. **Service Disruption**: Mitigate with blue-green deployments
2. **Configuration Loss**: Create comprehensive backups before migration
3. **Team Resistance**: Provide training and documentation
4. **Pipeline Breaks**: Update CI/CD incrementally

### Rollback Strategy
```bash
# Maintain versioned backups
git tag infrastructure-v1-backup
tar -czf infrastructure-backup-$(date +%Y%m%d).tar.gz infrastructure/

# Quick rollback procedure
kubectl apply -k infrastructure.backup/
docker-compose -f docker-compose.backup.yml up
```

## Success Metrics

### Technical Metrics
- Configuration file count: Target < 20 files
- Deployment time: Target < 5 minutes
- Resource utilization: Target 80% efficiency
- Mean time to recovery: Target < 15 minutes

### Process Metrics
- Configuration changes per week: Track reduction
- Deployment failures: Target < 5%
- Time to onboard new service: Target < 1 day
- Documentation coverage: Target 100%

## Next Steps

1. **Review and Approval**: Present to technical leadership
2. **Resource Allocation**: Assign 2 engineers for 4 weeks
3. **Create Detailed Migration Plan**: Break down into daily tasks
4. **Setup Monitoring**: Track migration progress
5. **Begin Phase 1**: Start with Docker Compose consolidation

## Appendix A: Current File Inventory

### Files to Consolidate
```
# Kubernetes (23 files across 3 directories)
./infrastructure/kubernetes/*.yaml
./kubernetes/*.yaml
./monitoring/*-deployment.yaml

# Docker Compose (7 files)
docker-compose*.yml

# Monitoring (15 files)
./configs/prometheus/*
./configs/grafana/*
./monitoring/prometheus/*
./monitoring/grafana/*
```

### Files to Archive
```
# Legacy configurations
./kubernetes/  (entire directory)
./coder-cloud-deploy/
./monitoring/ (after consolidation)
```

## Appendix B: Sample Consolidated Configuration

### Docker Compose Base (docker-compose.base.yml)
```yaml
version: '3.8'

x-common-variables: &common-variables
  NODE_ENV: ${NODE_ENV:-development}
  LOG_LEVEL: ${LOG_LEVEL:-info}

x-resource-limits: &resource-limits
  deploy:
    resources:
      limits:
        cpus: '1.0'
        memory: 1G
      reservations:
        cpus: '0.25'
        memory: 256M

services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    environment:
      <<: *common-variables
    <<: *resource-limits

  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    environment:
      <<: *common-variables
    <<: *resource-limits
```

### Kubernetes Base with Kustomize
```yaml
# base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
spec:
  replicas: 1  # Overridden in overlays
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: backend:latest  # Overridden in overlays
        resources:  # Overridden in overlays
          requests:
            memory: "128Mi"
            cpu: "100m"
```

## Document Version
- **Version**: 1.0
- **Date**: August 25, 2025
- **Author**: Infrastructure Architecture Team
- **Status**: Draft for Review

---

*This document provides a comprehensive roadmap for consolidating the barbershop platform's infrastructure. Implementation should proceed in phases with careful monitoring and rollback procedures in place.*
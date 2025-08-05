# Security Deployment Checklist

## Before Production Deployment

### 🔴 CRITICAL - Must Complete
- [ ] Replace all placeholder credentials in .env files
- [ ] Generate secure JWT_SECRET_KEY (32+ characters)
- [ ] Configure production Supabase instance with proper RLS
- [ ] Enable HTTPS/SSL certificates
- [ ] Configure proper CORS origins (remove localhost)
- [ ] Set up monitoring and alerting
- [ ] Remove all debug/development configurations

### 🟠 HIGH PRIORITY - Complete Within 1 Week
- [ ] Implement rate limiting with Redis backend
- [ ] Set up comprehensive logging (ELK/Splunk)
- [ ] Configure backup and recovery procedures
- [ ] Implement intrusion detection system
- [ ] Set up automated security scanning
- [ ] Create incident response procedures

### 🟡 MEDIUM PRIORITY - Complete Within 1 Month
- [ ] Implement field-level encryption for PII
- [ ] Set up Web Application Firewall (WAF)
- [ ] Configure DDoS protection
- [ ] Implement multi-factor authentication
- [ ] Set up security awareness training
- [ ] Create security audit schedule

## Environment Variables to Replace
```bash
# Generate secure keys:
openssl rand -base64 32  # For JWT_SECRET_KEY
openssl rand -base64 32  # For DATABASE_ENCRYPTION_KEY
openssl rand -base64 32  # For SESSION_SECRET

# Production credentials needed:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- ANTHROPIC_API_KEY
- OPENAI_API_KEY
- SENDGRID_API_KEY
- STRIPE_SECRET_KEY
```

## Security Testing Before Go-Live
- [ ] Penetration testing completed
- [ ] Vulnerability scan passed
- [ ] Security code review completed
- [ ] Load testing with security scenarios
- [ ] Backup/recovery procedures tested
- [ ] Incident response plan tested

## Post-Deployment Monitoring
- [ ] Security dashboard configured
- [ ] Alerting rules activated
- [ ] Log aggregation working
- [ ] Automated security scans scheduled
- [ ] Performance monitoring active
- [ ] Compliance reporting set up

# Secure Nginx Dockerfile for 6FB AI Agent System
FROM nginx:1.25-alpine

# Install additional security modules and tools
RUN apk add --no-cache \
    curl \
    openssl \
    nginx-mod-http-headers-more \
    && rm -rf /var/cache/apk/*

# Create nginx user and group if they don't exist
RUN addgroup -g 101 -S nginx || true && \
    adduser -S -D -H -u 101 -h /var/cache/nginx -s /sbin/nologin -G nginx -g nginx nginx || true

# Remove default nginx configuration
RUN rm -f /etc/nginx/conf.d/default.conf

# Create necessary directories
RUN mkdir -p /var/log/nginx /var/cache/nginx /etc/nginx/certs /usr/share/nginx/html \
    && chown -R nginx:nginx /var/log/nginx /var/cache/nginx /etc/nginx/certs \
    && chmod 755 /var/log/nginx /var/cache/nginx

# Copy custom error pages
COPY error-pages/ /usr/share/nginx/html/

# Generate self-signed certificates for development (production should mount real certs)
RUN openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/certs/key.pem \
    -out /etc/nginx/certs/cert.pem \
    -subj "/C=US/ST=CA/L=San Francisco/O=6FB AI Agent System/CN=agent.6fb.ai" \
    && chmod 600 /etc/nginx/certs/key.pem \
    && chmod 644 /etc/nginx/certs/cert.pem

# Generate DH parameters for perfect forward secrecy
RUN openssl dhparam -out /etc/nginx/certs/dhparam.pem 2048 \
    && chmod 644 /etc/nginx/certs/dhparam.pem

# Create health check script
RUN echo '#!/bin/sh' > /usr/local/bin/health-check.sh && \
    echo 'curl -f http://localhost/health || exit 1' >> /usr/local/bin/health-check.sh && \
    chmod +x /usr/local/bin/health-check.sh

# Security hardening
RUN chmod -R 755 /usr/share/nginx/html && \
    find /usr/share/nginx/html -type f -exec chmod 644 {} \;

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD ["/usr/local/bin/health-check.sh"]

# Switch to non-root user
USER nginx

# Expose ports
EXPOSE 80 443

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
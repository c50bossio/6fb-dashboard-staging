#!/bin/bash

# Security Hardening Script for 6FB AI Agent System
# Comprehensive security configuration and hardening procedures

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="/var/log/security-hardening.log"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

# Colored output functions
info() {
    echo -e "${BLUE}[INFO]${NC} $1"
    log "INFO" "$1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    log "WARN" "$1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    log "ERROR" "$1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
    log "SUCCESS" "$1"
}

# Error handling
error_exit() {
    error "$1"
    exit 1
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error_exit "This script must be run as root for system-level security hardening"
    fi
}

# System updates
system_updates() {
    info "Updating system packages..."
    
    # Update package lists
    apt-get update -y || error_exit "Failed to update package lists"
    
    # Upgrade system packages
    apt-get upgrade -y || error_exit "Failed to upgrade system packages"
    
    # Install security updates
    apt-get dist-upgrade -y || error_exit "Failed to install security updates"
    
    # Remove unused packages
    apt-get autoremove -y || warn "Failed to remove some unused packages"
    
    success "System updates completed"
}

# Install security tools
install_security_tools() {
    info "Installing security tools..."
    
    local tools=(
        "fail2ban"          # Intrusion prevention
        "ufw"               # Uncomplicated Firewall
        "rkhunter"          # Rootkit hunter
        "chkrootkit"        # Rootkit checker
        "aide"              # File integrity checker
        "auditd"            # System auditing
        "clamav"            # Antivirus
        "logwatch"          # Log analyzer
        "psad"              # Port scan attack detector
        "tripwire"          # File integrity monitoring
        "openssl"           # SSL/TLS tools
        "ca-certificates"   # Certificate authorities
    )
    
    for tool in "${tools[@]}"; do
        if ! dpkg -l | grep -q "^ii.*$tool"; then
            apt-get install -y "$tool" || warn "Failed to install $tool"
            info "Installed $tool"
        else
            info "$tool already installed"
        fi
    done
    
    success "Security tools installation completed"
}

# Configure firewall
configure_firewall() {
    info "Configuring UFW firewall..."
    
    # Reset UFW to defaults
    ufw --force reset
    
    # Set default policies
    ufw default deny incoming
    ufw default allow outgoing
    
    # Allow SSH (adjust port if different)
    ufw allow 22/tcp comment 'SSH'
    
    # Allow HTTP and HTTPS
    ufw allow 80/tcp comment 'HTTP'
    ufw allow 443/tcp comment 'HTTPS'
    
    # Allow specific application ports
    ufw allow 9999/tcp comment 'Frontend Application'
    ufw allow 8001/tcp comment 'Backend API'
    
    # Allow monitoring ports (restrict to local network)
    ufw allow from 10.0.0.0/8 to any port 9090 comment 'Prometheus'
    ufw allow from 10.0.0.0/8 to any port 3000 comment 'Grafana'
    
    # Enable UFW
    ufw --force enable
    
    # Display status
    ufw status verbose
    
    success "Firewall configuration completed"
}

# Configure Fail2Ban
configure_fail2ban() {
    info "Configuring Fail2Ban..."
    
    # Create custom configuration
    cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
# Ban time (seconds)
bantime = 3600

# Find time (seconds)
findtime = 600

# Max retry attempts
maxretry = 5

# Ignore local IPs
ignoreip = 127.0.0.1/8 ::1 10.0.0.0/8 172.16.0.0/12 192.168.0.0/16

# Email notifications
destemail = security@yourdomain.com
sendername = Fail2Ban
mta = sendmail

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 1800

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10

[nginx-botsearch]
enabled = true
filter = nginx-botsearch
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 2

[recidive]
enabled = true
filter = recidive
logpath = /var/log/fail2ban.log
action = iptables-allports[name=recidive]
bantime = 86400
findtime = 86400
maxretry = 5
EOF

    # Create custom filters
    cat > /etc/fail2ban/filter.d/nginx-botsearch.conf << 'EOF'
[Definition]
failregex = ^<HOST> -.*GET.*(\.php|\.asp|\.exe|\.pl|\.cgi|\.scgi)
ignoreregex =
EOF

    # Restart Fail2Ban
    systemctl restart fail2ban
    systemctl enable fail2ban
    
    success "Fail2Ban configuration completed"
}

# Configure system auditing
configure_auditing() {
    info "Configuring system auditing..."
    
    # Configure auditd
    cat > /etc/audit/rules.d/audit.rules << 'EOF'
# Delete all previous rules
-D

# Set buffer size
-b 8192

# Set failure mode (0=silent, 1=printk, 2=panic)
-f 1

# Monitor authentication events
-w /etc/passwd -p wa -k identity
-w /etc/group -p wa -k identity
-w /etc/gshadow -p wa -k identity
-w /etc/shadow -p wa -k identity
-w /etc/security/opasswd -p wa -k identity

# Monitor system configuration changes
-w /etc/sysctl.conf -p wa -k sysctl
-w /etc/ssh/sshd_config -p wa -k sshd

# Monitor network configuration
-w /etc/hosts -p wa -k network
-w /etc/hostname -p wa -k network
-w /etc/network/ -p wa -k network

# Monitor file system mounts
-w /etc/fstab -p wa -k mount

# Monitor sudoers changes
-w /etc/sudoers -p wa -k privilege_escalation
-w /etc/sudoers.d/ -p wa -k privilege_escalation

# Monitor login/logout events
-w /var/log/faillog -p wa -k logins
-w /var/log/lastlog -p wa -k logins
-w /var/log/tallylog -p wa -k logins

# Monitor kernel module loading
-w /sbin/insmod -p x -k modules
-w /sbin/rmmod -p x -k modules
-w /sbin/modprobe -p x -k modules
-a always,exit -F arch=b64 -S init_module -S delete_module -k modules

# Monitor file access in sensitive directories
-w /etc/ -p wa -k config_changes
-w /var/log/ -p wa -k log_changes

# Monitor Docker events
-w /usr/bin/docker -p x -k docker
-w /var/lib/docker/ -p wa -k docker

# Enable auditing
-e 1
EOF

    # Restart auditd
    systemctl restart auditd
    systemctl enable auditd
    
    success "System auditing configuration completed"
}

# Secure kernel parameters
secure_kernel_parameters() {
    info "Configuring secure kernel parameters..."
    
    cat > /etc/sysctl.d/99-security.conf << 'EOF'
# Network security settings
net.ipv4.ip_forward = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0
net.ipv4.conf.all.log_martians = 1
net.ipv4.conf.default.log_martians = 1
net.ipv4.icmp_echo_ignore_broadcasts = 1
net.ipv4.icmp_ignore_bogus_error_responses = 1
net.ipv4.tcp_syncookies = 1
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1

# IPv6 security settings
net.ipv6.conf.all.accept_redirects = 0
net.ipv6.conf.default.accept_redirects = 0
net.ipv6.conf.all.accept_source_route = 0
net.ipv6.conf.default.accept_source_route = 0

# Kernel security settings
kernel.dmesg_restrict = 1
kernel.kptr_restrict = 2
kernel.yama.ptrace_scope = 1
kernel.core_uses_pid = 1
kernel.core_pattern = /tmp/core_%e.%p.%h.%t

# File system security
fs.suid_dumpable = 0
fs.protected_hardlinks = 1
fs.protected_symlinks = 1

# Memory protection
vm.mmap_min_addr = 65536

# Process security
kernel.randomize_va_space = 2
EOF

    # Apply the settings
    sysctl -p /etc/sysctl.d/99-security.conf
    
    success "Kernel parameters secured"
}

# Configure SSH hardening
configure_ssh_hardening() {
    info "Hardening SSH configuration..."
    
    # Backup original config
    cp /etc/ssh/sshd_config "/etc/ssh/sshd_config.backup.${TIMESTAMP}"
    
    # Apply SSH hardening
    cat > /etc/ssh/sshd_config << 'EOF'
# SSH Configuration - Security Hardened
Port 22
Protocol 2

# Authentication
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys
PermitEmptyPasswords no
ChallengeResponseAuthentication no
UsePAM yes

# Crypto settings
KexAlgorithms curve25519-sha256@libssh.org,diffie-hellman-group16-sha512,diffie-hellman-group18-sha512
Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com,aes128-gcm@openssh.com,aes256-ctr,aes192-ctr,aes128-ctr
MACs hmac-sha2-256-etm@openssh.com,hmac-sha2-512-etm@openssh.com,hmac-sha2-256,hmac-sha2-512

# Logging
SyslogFacility AUTHPRIV
LogLevel VERBOSE

# Connection settings
ClientAliveInterval 300
ClientAliveCountMax 2
MaxAuthTries 3
MaxSessions 2
MaxStartups 2

# Disable unused features
X11Forwarding no
AllowTcpForwarding no
AllowAgentForwarding no
PermitTunnel no
GatewayPorts no
PermitUserEnvironment no

# Banner
Banner /etc/ssh/ssh_banner

# Allowed users (adjust as needed)
AllowUsers deployer admin

# Host keys
HostKey /etc/ssh/ssh_host_rsa_key
HostKey /etc/ssh/ssh_host_ecdsa_key
HostKey /etc/ssh/ssh_host_ed25519_key
EOF

    # Create SSH banner
    cat > /etc/ssh/ssh_banner << 'EOF'
**************************************************************************
*                                                                        *
* This system is for the use of authorized users only. Individuals      *
* using this computer system without authority, or in excess of their    *
* authority, are subject to having all of their activities on this      *
* system monitored and recorded by system personnel.                     *
*                                                                        *
* In the course of monitoring individuals improperly using this system, *
* or in the course of system maintenance, the activities of authorized  *
* users may also be monitored.                                          *
*                                                                        *
* Anyone using this system expressly consents to such monitoring and    *
* is advised that if such monitoring reveals possible evidence of        *
* criminal activity, system personnel may provide the evidence from      *
* such monitoring to law enforcement officials.                          *
*                                                                        *
**************************************************************************
EOF

    # Test SSH configuration
    sshd -t || error_exit "SSH configuration test failed"
    
    # Restart SSH service
    systemctl restart sshd
    
    success "SSH hardening completed"
}

# Configure log monitoring
configure_log_monitoring() {
    info "Configuring log monitoring..."
    
    # Configure logrotate for application logs
    cat > /etc/logrotate.d/agent-system << 'EOF'
/var/log/agent-system/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    copytruncate
    postrotate
        systemctl reload nginx > /dev/null 2>&1 || true
    endscript
}

/var/log/nginx/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    sharedscripts
    postrotate
        systemctl reload nginx > /dev/null 2>&1 || true
    endscript
}
EOF

    # Configure rsyslog for centralized logging
    cat > /etc/rsyslog.d/50-agent-system.conf << 'EOF'
# 6FB AI Agent System logging configuration

# Local logging
local0.* /var/log/agent-system/application.log
local1.* /var/log/agent-system/security.log
local2.* /var/log/agent-system/audit.log

# Security events
auth,authpriv.* /var/log/agent-system/auth.log

# Stop processing after logging
& stop
EOF

    # Create log directories
    mkdir -p /var/log/agent-system
    chown syslog:adm /var/log/agent-system
    chmod 755 /var/log/agent-system
    
    # Restart rsyslog
    systemctl restart rsyslog
    
    success "Log monitoring configuration completed"
}

# Set file permissions
secure_file_permissions() {
    info "Securing file permissions..."
    
    # Secure sensitive configuration files
    chmod 600 /etc/ssh/sshd_config
    chmod 600 /etc/shadow
    chmod 600 /etc/gshadow
    chmod 644 /etc/passwd
    chmod 644 /etc/group
    
    # Secure application files
    if [[ -d "$PROJECT_ROOT" ]]; then
        find "$PROJECT_ROOT" -type f -name "*.env*" -exec chmod 600 {} \;
        find "$PROJECT_ROOT" -type f -name "*.key" -exec chmod 600 {} \;
        find "$PROJECT_ROOT" -type f -name "*.pem" -exec chmod 600 {} \;
        
        # Make scripts executable
        find "$PROJECT_ROOT/scripts" -type f -name "*.sh" -exec chmod 755 {} \; 2>/dev/null || true
        
        # Secure Docker files
        find "$PROJECT_ROOT" -name "Dockerfile*" -exec chmod 644 {} \; 2>/dev/null || true
        find "$PROJECT_ROOT" -name "docker-compose*.yml" -exec chmod 644 {} \; 2>/dev/null || true
    fi
    
    success "File permissions secured"
}

# Configure automatic security updates
configure_auto_updates() {
    info "Configuring automatic security updates..."
    
    # Install unattended-upgrades
    apt-get install -y unattended-upgrades apt-listchanges
    
    # Configure automatic updates
    cat > /etc/apt/apt.conf.d/50unattended-upgrades << 'EOF'
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}";
    "${distro_id}:${distro_codename}-security";
    "${distro_id}ESMApps:${distro_codename}-apps-security";
    "${distro_id}ESM:${distro_codename}-infra-security";
};

Unattended-Upgrade::Package-Blacklist {
    // "vim";
    // "libc6-dev";
    // "kernel*";
};

Unattended-Upgrade::DevRelease "false";
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-New-Unused-Dependencies "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
Unattended-Upgrade::Automatic-Reboot-WithUsers "false";
Unattended-Upgrade::Automatic-Reboot-Time "02:00";

Unattended-Upgrade::Mail "security@yourdomain.com";
Unattended-Upgrade::MailReport "on-change";

Unattended-Upgrade::SyslogEnable "true";
Unattended-Upgrade::SyslogFacility "daemon";
EOF

    # Enable automatic updates
    cat > /etc/apt/apt.conf.d/20auto-upgrades << 'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Download-Upgradeable-Packages "1";
APT::Periodic::AutocleanInterval "7";
APT::Periodic::Unattended-Upgrade "1";
EOF

    # Enable and start the service
    systemctl enable unattended-upgrades
    systemctl start unattended-upgrades
    
    success "Automatic security updates configured"
}

# Create security monitoring script
create_security_monitoring() {
    info "Creating security monitoring script..."
    
    cat > /usr/local/bin/security-monitor.sh << 'EOF'
#!/bin/bash

# Security Monitoring Script
# Run periodically to check system security

LOG_FILE="/var/log/security-monitor.log"
ALERT_EMAIL="security@yourdomain.com"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Check for failed login attempts
failed_logins=$(grep "Failed password" /var/log/auth.log | tail -10)
if [[ -n "$failed_logins" ]]; then
    log "ALERT: Failed login attempts detected"
    echo "$failed_logins" >> "$LOG_FILE"
fi

# Check for rootkit
rkhunter --check --sk --summary | grep -E "(Warning|Infected)" && log "ALERT: Rootkit check found issues"

# Check file integrity
aide --check 2>/dev/null | grep -E "(changed|added|removed)" && log "ALERT: File integrity check found changes"

# Check for suspicious processes
ps aux | grep -E "(nc|netcat|nmap|tcpdump)" | grep -v grep && log "ALERT: Suspicious processes detected"

# Check disk usage
df -h | awk '$5 > 85 {print "ALERT: High disk usage on " $1 ": " $5}' >> "$LOG_FILE"

# Check memory usage
free | awk '/Mem:/ {if ($3/$2 > 0.9) print "ALERT: High memory usage: " int($3/$2*100) "%"}' >> "$LOG_FILE"

# Check for new users
if [[ -f /tmp/passwd.old ]]; then
    diff /tmp/passwd.old /etc/passwd && log "ALERT: New users detected"
fi
cp /etc/passwd /tmp/passwd.old
EOF

    chmod 755 /usr/local/bin/security-monitor.sh
    
    # Add to crontab for hourly monitoring
    (crontab -l 2>/dev/null; echo "0 * * * * /usr/local/bin/security-monitor.sh") | crontab -
    
    success "Security monitoring script created"
}

# Generate security report
generate_security_report() {
    info "Generating security hardening report..."
    
    local report_file="/var/log/security-hardening-report-${TIMESTAMP}.txt"
    
    cat > "$report_file" << EOF
6FB AI Agent System Security Hardening Report
=============================================

Date: $(date)
System: $(uname -a)
User: $(whoami)

Security Measures Implemented:
------------------------------

1. System Updates
   - Updated all system packages
   - Installed security updates
   - Configured automatic security updates

2. Firewall Configuration
   - Configured UFW firewall with restrictive rules
   - Blocked unnecessary ports
   - Allowed only required services

3. Intrusion Prevention
   - Installed and configured Fail2Ban
   - Set up SSH brute force protection
   - Configured web application protection

4. System Auditing
   - Configured auditd for system monitoring
   - Set up file integrity monitoring
   - Enabled security event logging

5. Network Security
   - Hardened kernel network parameters
   - Disabled IP forwarding
   - Enabled SYN flood protection

6. SSH Hardening
   - Disabled root login
   - Enforced key-based authentication
   - Configured strong crypto algorithms

7. File Permissions
   - Secured sensitive configuration files
   - Set appropriate permissions on application files
   - Protected SSH keys and certificates

8. Log Management
   - Configured centralized logging
   - Set up log rotation
   - Enabled security event monitoring

9. Automatic Updates
   - Configured unattended security updates
   - Set up email notifications
   - Enabled automatic cleanup

10. Monitoring
    - Created security monitoring script
    - Set up automated checks
    - Configured alert mechanisms

Security Tools Installed:
------------------------
- Fail2Ban (intrusion prevention)
- UFW (firewall)
- RKHunter (rootkit detection)
- AIDE (file integrity)
- Auditd (system auditing)
- ClamAV (antivirus)
- Logwatch (log analysis)

Next Steps:
-----------
1. Review and test all configurations
2. Set up monitoring dashboards
3. Configure backup encryption
4. Implement security scanning
5. Regular security assessments

Security Contacts:
-----------------
Security Team: security@yourdomain.com
System Admin: admin@yourdomain.com

Report Location: $report_file
EOF

    success "Security hardening report generated: $report_file"
}

# Main execution
main() {
    info "Starting 6FB AI Agent System security hardening..."
    
    check_root
    system_updates
    install_security_tools
    configure_firewall
    configure_fail2ban
    configure_auditing
    secure_kernel_parameters
    configure_ssh_hardening
    configure_log_monitoring
    secure_file_permissions
    configure_auto_updates
    create_security_monitoring
    generate_security_report
    
    success "Security hardening completed successfully!"
    
    info "Please review the security report and test all configurations."
    info "Remember to:"
    info "1. Update firewall rules for your specific IP ranges"
    info "2. Configure email notifications"
    info "3. Test SSH access with key-based authentication"
    info "4. Monitor security logs regularly"
    info "5. Keep security tools updated"
}

# Execute main function
main "$@"
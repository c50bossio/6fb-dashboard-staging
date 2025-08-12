#!/usr/bin/env python3
"""
Secure Configuration Management for 6FB AI Agent System
Implements secure environment variable handling, secrets management, and configuration validation.
"""

import os
import json
import logging
from typing import Dict, Any, Optional, List, Tuple
from pathlib import Path
from cryptography.fernet import Fernet
import secrets
import base64
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class SecureConfig:
    """Secure configuration management with encryption and validation"""
    
    # Required environment variables
    REQUIRED_VARS = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY'
    ]
    
    # Sensitive variables that should be encrypted
    SENSITIVE_VARS = [
        'SUPABASE_SERVICE_ROLE_KEY',
        'OPENAI_API_KEY',
        'ANTHROPIC_API_KEY',
        'STRIPE_SECRET_KEY',
        'PUSHER_SECRET',
        'JWT_SECRET',
        'CSRF_SECRET',
        'DATABASE_URL',
        'REDIS_URL',
        'GOOGLE_AI_API_KEY'
    ]
    
    # Configuration validation rules
    VALIDATION_RULES = {
        'NEXT_PUBLIC_SUPABASE_URL': {
            'pattern': r'^https://[a-zA-Z0-9-]+\.supabase\.co$',
            'required': True
        },
        'OPENAI_API_KEY': {
            'pattern': r'^sk-[a-zA-Z0-9]+$',
            'required': False
        },
        'STRIPE_SECRET_KEY': {
            'pattern': r'^sk_(test_|live_)[a-zA-Z0-9]+$',
            'required': False
        }
    }
    
    def __init__(self, env_file: str = '.env.local'):
        self.env_file = env_file
        self.secrets_file = '.secrets.encrypted'
        self.config_cache = {}
        self.encryption_key = self._get_or_create_master_key()
        self.fernet = Fernet(self.encryption_key)
        self._load_config()
    
    def _get_or_create_master_key(self) -> bytes:
        """Get or create master encryption key"""
        key_file = Path('.master.key')
        
        if key_file.exists():
            with open(key_file, 'rb') as f:
                return f.read()
        else:
            # Generate new master key
            key = Fernet.generate_key()
            with open(key_file, 'wb') as f:
                f.write(key)
            
            # Secure file permissions
            os.chmod(key_file, 0o600)
            
            # Add to .gitignore
            gitignore_path = Path('.gitignore')
            if gitignore_path.exists():
                with open(gitignore_path, 'r') as f:
                    content = f.read()
                if '.master.key' not in content:
                    with open(gitignore_path, 'a') as f:
                        f.write('\n# Security keys\n.master.key\n.secrets.encrypted\n')
            
            logger.info("Created new master encryption key")
            return key
    
    def _load_config(self):
        """Load configuration from environment and encrypted secrets"""
        # Load from environment variables
        for key in os.environ:
            self.config_cache[key] = os.environ[key]
        
        # Load from .env.local file if exists
        if os.path.exists(self.env_file):
            self._load_env_file(self.env_file)
        
        # Load encrypted secrets
        if os.path.exists(self.secrets_file):
            self._load_encrypted_secrets()
    
    def _load_env_file(self, filepath: str):
        """Load environment variables from file"""
        try:
            with open(filepath, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        key = key.strip()
                        value = value.strip().strip('"').strip("'")
                        
                        # Don't override existing environment variables
                        if key not in os.environ:
                            self.config_cache[key] = value
        except Exception as e:
            logger.error(f"Failed to load env file {filepath}: {e}")
    
    def _load_encrypted_secrets(self):
        """Load secrets from encrypted file"""
        try:
            with open(self.secrets_file, 'rb') as f:
                encrypted_data = f.read()
            
            decrypted_data = self.fernet.decrypt(encrypted_data)
            secrets_dict = json.loads(decrypted_data.decode())
            
            # Merge with config cache
            self.config_cache.update(secrets_dict)
            
        except Exception as e:
            logger.error(f"Failed to load encrypted secrets: {e}")
    
    def save_encrypted_secrets(self):
        """Save sensitive variables to encrypted file"""
        secrets_dict = {}
        
        # Extract sensitive variables
        for key in self.SENSITIVE_VARS:
            if key in self.config_cache:
                secrets_dict[key] = self.config_cache[key]
        
        if secrets_dict:
            # Encrypt and save
            encrypted_data = self.fernet.encrypt(json.dumps(secrets_dict).encode())
            
            with open(self.secrets_file, 'wb') as f:
                f.write(encrypted_data)
            
            # Secure file permissions
            os.chmod(self.secrets_file, 0o600)
            
            logger.info(f"Saved {len(secrets_dict)} encrypted secrets")
    
    def get(self, key: str, default: Any = None) -> Any:
        """Get configuration value with fallback"""
        # Check cache first
        if key in self.config_cache:
            return self.config_cache[key]
        
        # Check environment
        if key in os.environ:
            value = os.environ[key]
            self.config_cache[key] = value
            return value
        
        # Return default
        return default
    
    def get_required(self, key: str) -> str:
        """Get required configuration value or raise error"""
        value = self.get(key)
        if value is None:
            raise ValueError(f"Required configuration '{key}' is missing")
        return value
    
    def set(self, key: str, value: Any):
        """Set configuration value"""
        self.config_cache[key] = value
        
        # If it's a sensitive variable, save to encrypted file
        if key in self.SENSITIVE_VARS:
            self.save_encrypted_secrets()
    
    def validate_config(self) -> Tuple[bool, List[str]]:
        """Validate configuration against rules"""
        errors = []
        
        # Check required variables
        for var in self.REQUIRED_VARS:
            if not self.get(var):
                errors.append(f"Required variable '{var}' is missing")
        
        # Validate patterns
        for var, rules in self.VALIDATION_RULES.items():
            value = self.get(var)
            
            if rules.get('required') and not value:
                errors.append(f"Required variable '{var}' is missing")
                continue
            
            if value and 'pattern' in rules:
                import re
                if not re.match(rules['pattern'], value):
                    errors.append(f"Variable '{var}' has invalid format")
        
        return len(errors) == 0, errors
    
    def get_database_url(self) -> str:
        """Get database URL with proper formatting"""
        # Check for explicit DATABASE_URL
        db_url = self.get('DATABASE_URL')
        if db_url:
            return db_url
        
        # Build from components (for SQLite)
        return self.get('DATABASE_PATH', 'data/agent_system.db')
    
    def get_redis_url(self) -> Optional[str]:
        """Get Redis URL if available"""
        return self.get('REDIS_URL')
    
    def get_api_keys(self) -> Dict[str, Optional[str]]:
        """Get all API keys"""
        return {
            'openai': self.get('OPENAI_API_KEY'),
            'anthropic': self.get('ANTHROPIC_API_KEY'),
            'google': self.get('GOOGLE_AI_API_KEY'),
            'stripe': self.get('STRIPE_SECRET_KEY'),
            'stripe_publishable': self.get('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY')
        }
    
    def get_feature_flags(self) -> Dict[str, bool]:
        """Get feature flags"""
        return {
            'ai_enabled': self.get('ENABLE_AI_FEATURES', 'true').lower() == 'true',
            'stripe_enabled': bool(self.get('STRIPE_SECRET_KEY')),
            'pusher_enabled': bool(self.get('PUSHER_APP_ID')),
            'sentry_enabled': bool(self.get('NEXT_PUBLIC_SENTRY_DSN')),
            'posthog_enabled': bool(self.get('NEXT_PUBLIC_POSTHOG_KEY'))
        }
    
    def generate_secrets(self):
        """Generate missing secrets"""
        generated = {}
        
        # Generate JWT secret if missing
        if not self.get('JWT_SECRET'):
            jwt_secret = secrets.token_urlsafe(32)
            self.set('JWT_SECRET', jwt_secret)
            generated['JWT_SECRET'] = jwt_secret
        
        # Generate CSRF secret if missing
        if not self.get('CSRF_SECRET'):
            csrf_secret = secrets.token_urlsafe(32)
            self.set('CSRF_SECRET', csrf_secret)
            generated['CSRF_SECRET'] = csrf_secret
        
        # Generate session secret if missing
        if not self.get('SESSION_SECRET'):
            session_secret = secrets.token_urlsafe(32)
            self.set('SESSION_SECRET', session_secret)
            generated['SESSION_SECRET'] = session_secret
        
        if generated:
            logger.info(f"Generated {len(generated)} missing secrets")
            self.save_encrypted_secrets()
        
        return generated
    
    def export_safe_config(self) -> Dict[str, Any]:
        """Export configuration without sensitive values"""
        safe_config = {}
        
        for key, value in self.config_cache.items():
            if key in self.SENSITIVE_VARS:
                # Mask sensitive values
                if value:
                    safe_config[key] = f"{value[:4]}...{value[-4:]}" if len(value) > 8 else "***"
                else:
                    safe_config[key] = None
            else:
                safe_config[key] = value
        
        return safe_config
    
    def check_security_compliance(self) -> Dict[str, Any]:
        """Check configuration for security best practices"""
        issues = []
        warnings = []
        
        # Check for development keys in production
        if self.get('NODE_ENV') == 'production':
            if 'test' in str(self.get('STRIPE_SECRET_KEY', '')):
                warnings.append("Using test Stripe key in production")
            
            if self.get('NEXT_PUBLIC_SUPABASE_URL', '').endswith('.supabase.co'):
                warnings.append("Using Supabase hosted URL in production (consider self-hosting)")
        
        # Check for weak secrets
        for secret_key in ['JWT_SECRET', 'CSRF_SECRET', 'SESSION_SECRET']:
            secret = self.get(secret_key)
            if secret and len(secret) < 32:
                issues.append(f"{secret_key} is too short (minimum 32 characters)")
        
        # Check for missing security features
        if not self.get('ENABLE_RATE_LIMITING', 'true').lower() == 'true':
            warnings.append("Rate limiting is disabled")
        
        if not self.get('ENABLE_CSRF_PROTECTION', 'true').lower() == 'true':
            issues.append("CSRF protection is disabled")
        
        # Check SSL/TLS configuration
        if self.get('NODE_ENV') == 'production' and not self.get('FORCE_SSL', 'true').lower() == 'true':
            issues.append("SSL is not enforced in production")
        
        return {
            'compliant': len(issues) == 0,
            'issues': issues,
            'warnings': warnings,
            'checked_at': datetime.utcnow().isoformat()
        }

# Singleton instance
secure_config = SecureConfig()

# Helper functions
def get_config(key: str, default: Any = None) -> Any:
    """Get configuration value"""
    return secure_config.get(key, default)

def get_required_config(key: str) -> str:
    """Get required configuration value"""
    return secure_config.get_required(key)

def validate_configuration() -> Tuple[bool, List[str]]:
    """Validate entire configuration"""
    return secure_config.validate_config()

def check_security_compliance() -> Dict[str, Any]:
    """Check security compliance"""
    return secure_config.check_security_compliance()

# Export main components
__all__ = [
    'SecureConfig',
    'secure_config',
    'get_config',
    'get_required_config',
    'validate_configuration',
    'check_security_compliance'
]
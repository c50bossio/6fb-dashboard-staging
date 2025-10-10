#!/usr/bin/env python3
"""
Comprehensive Data Encryption System for 6FB AI Agent Booking System
Security Specialist Implementation

Provides enterprise-level encryption for sensitive data including PII, payment information,
and booking details with key management, field-level encryption, and compliance features.
"""

import os
import json
import base64
import hashlib
import secrets
import logging
from typing import Dict, List, Optional, Any, Union, Tuple
from datetime import datetime, timezone
from dataclasses import dataclass
from enum import Enum
import sqlite3
from pathlib import Path

# Cryptography imports
from cryptography.fernet import Fernet, MultiFernet
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.kdf.scrypt import Scrypt
from cryptography.hazmat.backends import default_backend
from cryptography.exceptions import InvalidSignature

logger = logging.getLogger(__name__)

class EncryptionLevel(Enum):
    """Encryption levels for different data types"""
    NONE = "none"
    BASIC = "basic"          # Symmetric encryption with single key
    ENHANCED = "enhanced"    # Symmetric encryption with key rotation
    MAXIMUM = "maximum"      # Asymmetric + symmetric hybrid encryption

class DataClassification(Enum):
    """Data classification levels"""
    PUBLIC = "public"
    INTERNAL = "internal"
    CONFIDENTIAL = "confidential" 
    RESTRICTED = "restricted"     # PII, payment data, etc.

@dataclass
class EncryptionConfig:
    """Configuration for encryption operations"""
    field_name: str
    encryption_level: EncryptionLevel
    data_classification: DataClassification
    key_rotation_days: int = 90
    require_authentication: bool = False
    audit_access: bool = True

class KeyManager:
    """
    Enterprise key management system with key rotation, 
    versioning, and secure storage
    """
    
    def __init__(self, key_storage_path: str = "keys/"):
        self.key_storage_path = Path(key_storage_path)
        self.key_storage_path.mkdir(parents=True, exist_ok=True)
        
        # Master key for key encryption
        self.master_key = self._load_or_create_master_key()
        
        # Key registry
        self.key_registry = {}
        self._load_key_registry()
        
        # Active keys cache
        self.active_keys = {}
        
        logger.info("Key Manager initialized")
    
    def _load_or_create_master_key(self) -> bytes:
        """Load or create master encryption key"""
        master_key_path = self.key_storage_path / "master.key"
        
        if master_key_path.exists():
            try:
                with open(master_key_path, 'rb') as f:
                    encrypted_master = f.read()
                
                # In production, this would be derived from HSM, environment, or secure input
                password = os.getenv('MASTER_KEY_PASSWORD', 'default_dev_password').encode()
                
                # Derive key from password
                salt = encrypted_master[:16]  # First 16 bytes are salt
                kdf = PBKDF2HMAC(
                    algorithm=hashes.SHA256(),
                    length=32,
                    salt=salt,
                    iterations=100000,
                    backend=default_backend()
                )
                key = kdf.derive(password)
                
                # Decrypt master key
                f = Fernet(base64.urlsafe_b64encode(key))
                master_key = f.decrypt(encrypted_master[16:])
                
                logger.info("Master key loaded from storage")
                return master_key
                
            except Exception as e:
                logger.error(f"Failed to load master key: {e}")
                # Create new master key if loading fails
        
        # Create new master key
        master_key = secrets.token_bytes(32)
        
        # Encrypt with password-derived key
        password = os.getenv('MASTER_KEY_PASSWORD', 'default_dev_password').encode()
        salt = secrets.token_bytes(16)
        
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
            backend=default_backend()
        )
        key = kdf.derive(password)
        
        f = Fernet(base64.urlsafe_b64encode(key))
        encrypted_master = salt + f.encrypt(master_key)
        
        with open(master_key_path, 'wb') as file:
            file.write(encrypted_master)
        
        # Set restrictive permissions
        os.chmod(master_key_path, 0o600)
        
        logger.info("New master key created and stored")
        return master_key
    
    def _load_key_registry(self):
        """Load key registry from storage"""
        registry_path = self.key_storage_path / "key_registry.json"
        
        if registry_path.exists():
            try:
                with open(registry_path, 'r') as f:
                    self.key_registry = json.load(f)
                logger.info(f"Loaded {len(self.key_registry)} key entries from registry")
            except Exception as e:
                logger.error(f"Failed to load key registry: {e}")
                self.key_registry = {}
        else:
            self.key_registry = {}
    
    def _save_key_registry(self):
        """Save key registry to storage"""
        registry_path = self.key_storage_path / "key_registry.json"
        
        try:
            with open(registry_path, 'w') as f:
                json.dump(self.key_registry, f, indent=2, default=str)
            logger.debug("Key registry saved")
        except Exception as e:
            logger.error(f"Failed to save key registry: {e}")
    
    def generate_key(self, key_id: str, purpose: str = "data_encryption") -> str:
        """Generate new encryption key"""
        try:
            # Generate key based on purpose
            if purpose == "asymmetric":
                private_key = rsa.generate_private_key(
                    public_exponent=65537,
                    key_size=2048,
                    backend=default_backend()
                )
                key_data = private_key.private_bytes(
                    encoding=serialization.Encoding.PEM,
                    format=serialization.PrivateFormat.PKCS8,
                    encryption_algorithm=serialization.NoEncryption()
                )
            else:
                # Symmetric key
                key_data = Fernet.generate_key()
            
            # Encrypt key with master key
            master_fernet = Fernet(base64.urlsafe_b64encode(self.master_key))
            encrypted_key = master_fernet.encrypt(key_data)
            
            # Store key
            key_info = {
                'key_id': key_id,
                'purpose': purpose,
                'created_at': datetime.now(timezone.utc).isoformat(),
                'version': 1,
                'status': 'active'
            }
            
            key_file_path = self.key_storage_path / f"{key_id}_v1.key"
            with open(key_file_path, 'wb') as f:
                f.write(encrypted_key)
            
            # Set restrictive permissions
            os.chmod(key_file_path, 0o600)
            
            # Update registry
            self.key_registry[key_id] = key_info
            self._save_key_registry()
            
            # Cache active key
            self.active_keys[key_id] = key_data
            
            logger.info(f"Generated new key: {key_id}")
            return key_id
            
        except Exception as e:
            logger.error(f"Failed to generate key {key_id}: {e}")
            raise
    
    def get_key(self, key_id: str, version: int = None) -> bytes:
        """Retrieve encryption key"""
        try:
            # Check cache first
            if not version and key_id in self.active_keys:
                return self.active_keys[key_id]
            
            # Get key info from registry
            if key_id not in self.key_registry:
                raise ValueError(f"Key {key_id} not found in registry")
            
            key_info = self.key_registry[key_id]
            key_version = version or key_info['version']
            
            # Load encrypted key
            key_file_path = self.key_storage_path / f"{key_id}_v{key_version}.key"
            
            if not key_file_path.exists():
                raise FileNotFoundError(f"Key file not found: {key_file_path}")
            
            with open(key_file_path, 'rb') as f:
                encrypted_key = f.read()
            
            # Decrypt key with master key
            master_fernet = Fernet(base64.urlsafe_b64encode(self.master_key))
            key_data = master_fernet.decrypt(encrypted_key)
            
            # Cache if it's the active version
            if not version:
                self.active_keys[key_id] = key_data
            
            return key_data
            
        except Exception as e:
            logger.error(f"Failed to retrieve key {key_id}: {e}")
            raise
    
    def rotate_key(self, key_id: str) -> str:
        """Rotate encryption key to new version"""
        try:
            if key_id not in self.key_registry:
                raise ValueError(f"Key {key_id} not found in registry")
            
            key_info = self.key_registry[key_id]
            new_version = key_info['version'] + 1
            
            # Generate new key
            purpose = key_info['purpose']
            new_key_id = f"{key_id}_v{new_version}"
            
            if purpose == "asymmetric":
                private_key = rsa.generate_private_key(
                    public_exponent=65537,
                    key_size=2048,
                    backend=default_backend()
                )
                key_data = private_key.private_bytes(
                    encoding=serialization.Encoding.PEM,
                    format=serialization.PrivateFormat.PKCS8,
                    encryption_algorithm=serialization.NoEncryption()
                )
            else:
                key_data = Fernet.generate_key()
            
            # Encrypt and store new key
            master_fernet = Fernet(base64.urlsafe_b64encode(self.master_key))
            encrypted_key = master_fernet.encrypt(key_data)
            
            key_file_path = self.key_storage_path / f"{key_id}_v{new_version}.key"
            with open(key_file_path, 'wb') as f:
                f.write(encrypted_key)
            
            os.chmod(key_file_path, 0o600)
            
            # Update registry
            key_info['version'] = new_version
            key_info['rotated_at'] = datetime.now(timezone.utc).isoformat()
            self._save_key_registry()
            
            # Update cache
            self.active_keys[key_id] = key_data
            
            logger.info(f"Rotated key {key_id} to version {new_version}")
            return new_key_id
            
        except Exception as e:
            logger.error(f"Failed to rotate key {key_id}: {e}")
            raise

class DataEncryption:
    """
    Comprehensive data encryption system with field-level encryption,
    multiple encryption levels, and compliance features
    """
    
    def __init__(self, key_manager: KeyManager = None):
        self.key_manager = key_manager or KeyManager()
        
        # Field encryption configurations
        self.field_configs = self._load_field_configurations()
        
        # Ensure required keys exist
        self._initialize_encryption_keys()
        
        logger.info("Data Encryption system initialized")
    
    def _load_field_configurations(self) -> Dict[str, EncryptionConfig]:
        """Load field-level encryption configurations"""
        return {
            # Customer PII
            'customer_name': EncryptionConfig(
                field_name='customer_name',
                encryption_level=EncryptionLevel.ENHANCED,
                data_classification=DataClassification.RESTRICTED,
                audit_access=True
            ),
            'email': EncryptionConfig(
                field_name='email',
                encryption_level=EncryptionLevel.ENHANCED,
                data_classification=DataClassification.RESTRICTED,
                audit_access=True
            ),
            'phone': EncryptionConfig(
                field_name='phone',
                encryption_level=EncryptionLevel.ENHANCED,
                data_classification=DataClassification.RESTRICTED,
                audit_access=True
            ),
            'address': EncryptionConfig(
                field_name='address',
                encryption_level=EncryptionLevel.ENHANCED,
                data_classification=DataClassification.RESTRICTED,
                audit_access=True
            ),
            
            # Payment data (highest security)
            'payment_token': EncryptionConfig(
                field_name='payment_token',
                encryption_level=EncryptionLevel.MAXIMUM,
                data_classification=DataClassification.RESTRICTED,
                require_authentication=True,
                audit_access=True
            ),
            'billing_address': EncryptionConfig(
                field_name='billing_address',
                encryption_level=EncryptionLevel.ENHANCED,
                data_classification=DataClassification.RESTRICTED,
                audit_access=True
            ),
            
            # Booking details
            'appointment_notes': EncryptionConfig(
                field_name='appointment_notes',
                encryption_level=EncryptionLevel.BASIC,
                data_classification=DataClassification.CONFIDENTIAL
            ),
            'special_requests': EncryptionConfig(
                field_name='special_requests',
                encryption_level=EncryptionLevel.BASIC,
                data_classification=DataClassification.CONFIDENTIAL
            ),
            
            # System data
            'session_data': EncryptionConfig(
                field_name='session_data',
                encryption_level=EncryptionLevel.BASIC,
                data_classification=DataClassification.INTERNAL
            )
        }
    
    def _initialize_encryption_keys(self):
        """Initialize required encryption keys"""
        required_keys = [
            ('customer_data', 'data_encryption'),
            ('payment_data', 'data_encryption'),
            ('booking_data', 'data_encryption'),
            ('session_data', 'data_encryption'),
            ('payment_asymmetric', 'asymmetric')
        ]
        
        for key_id, purpose in required_keys:
            if key_id not in self.key_manager.key_registry:
                self.key_manager.generate_key(key_id, purpose)
    
    def encrypt_field(self, field_name: str, value: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Encrypt a single field based on its configuration
        
        Returns:
            dict: Contains 'encrypted_value', 'encryption_metadata'
        """
        if not value:
            return {'encrypted_value': None, 'encryption_metadata': None}
        
        try:
            # Get field configuration
            config = self.field_configs.get(field_name)
            if not config:
                # Default configuration for unknown fields
                config = EncryptionConfig(
                    field_name=field_name,
                    encryption_level=EncryptionLevel.BASIC,
                    data_classification=DataClassification.INTERNAL
                )
            
            # Select encryption method based on level
            if config.encryption_level == EncryptionLevel.NONE:
                return {'encrypted_value': value, 'encryption_metadata': None}
            
            elif config.encryption_level == EncryptionLevel.BASIC:
                return self._encrypt_basic(field_name, value, config)
            
            elif config.encryption_level == EncryptionLevel.ENHANCED:
                return self._encrypt_enhanced(field_name, value, config)
            
            elif config.encryption_level == EncryptionLevel.MAXIMUM:
                return self._encrypt_maximum(field_name, value, config, context)
            
            else:
                raise ValueError(f"Unknown encryption level: {config.encryption_level}")
        
        except Exception as e:
            logger.error(f"Failed to encrypt field {field_name}: {e}")
            raise
    
    def decrypt_field(self, field_name: str, encrypted_data: Dict[str, Any], context: Dict[str, Any] = None) -> str:
        """
        Decrypt a field using its encryption metadata
        
        Args:
            field_name: Name of the field
            encrypted_data: Dictionary containing 'encrypted_value' and 'encryption_metadata'
            context: Additional context for decryption (user auth, etc.)
        """
        if not encrypted_data or not encrypted_data.get('encrypted_value'):
            return None
        
        try:
            metadata = encrypted_data.get('encryption_metadata', {})
            encryption_level = metadata.get('encryption_level')
            
            if not encryption_level:
                # Assume plaintext if no metadata
                return encrypted_data['encrypted_value']
            
            # Get field configuration
            config = self.field_configs.get(field_name)
            
            # Check authentication requirements
            if config and config.require_authentication:
                if not context or not context.get('authenticated'):
                    raise PermissionError(f"Authentication required to decrypt {field_name}")
            
            # Decrypt based on level
            if encryption_level == EncryptionLevel.BASIC.value:
                return self._decrypt_basic(encrypted_data, metadata)
            
            elif encryption_level == EncryptionLevel.ENHANCED.value:
                return self._decrypt_enhanced(encrypted_data, metadata)
            
            elif encryption_level == EncryptionLevel.MAXIMUM.value:
                return self._decrypt_maximum(encrypted_data, metadata, context)
            
            else:
                raise ValueError(f"Unknown encryption level: {encryption_level}")
        
        except Exception as e:
            logger.error(f"Failed to decrypt field {field_name}: {e}")
            raise
    
    def encrypt_document(self, document: Dict[str, Any], context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Encrypt an entire document with field-level encryption"""
        encrypted_document = {}
        
        for field_name, value in document.items():
            if isinstance(value, str) and field_name in self.field_configs:
                # Encrypt sensitive fields
                encrypted_field = self.encrypt_field(field_name, value, context)
                encrypted_document[field_name] = encrypted_field['encrypted_value']
                encrypted_document[f"{field_name}_meta"] = encrypted_field['encryption_metadata']
            else:
                # Keep non-sensitive fields as-is
                encrypted_document[field_name] = value
        
        return encrypted_document
    
    def decrypt_document(self, encrypted_document: Dict[str, Any], context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Decrypt an entire document"""
        decrypted_document = {}
        
        for field_name, value in encrypted_document.items():
            if field_name.endswith('_meta'):
                # Skip metadata fields
                continue
            
            meta_field = f"{field_name}_meta"
            if meta_field in encrypted_document:
                # Decrypt encrypted field
                encrypted_data = {
                    'encrypted_value': value,
                    'encryption_metadata': encrypted_document[meta_field]
                }
                decrypted_document[field_name] = self.decrypt_field(field_name, encrypted_data, context)
            else:
                # Keep non-encrypted fields as-is
                decrypted_document[field_name] = value
        
        return decrypted_document
    
    def _encrypt_basic(self, field_name: str, value: str, config: EncryptionConfig) -> Dict[str, Any]:
        """Basic symmetric encryption"""
        # Determine key based on data classification
        if config.data_classification == DataClassification.RESTRICTED:
            key_id = 'customer_data'
        else:
            key_id = 'booking_data'
        
        key_data = self.key_manager.get_key(key_id)
        fernet = Fernet(key_data)
        
        encrypted_value = fernet.encrypt(value.encode()).decode()
        
        metadata = {
            'encryption_level': config.encryption_level.value,
            'key_id': key_id,
            'encrypted_at': datetime.now(timezone.utc).isoformat(),
            'data_classification': config.data_classification.value
        }
        
        return {
            'encrypted_value': encrypted_value,
            'encryption_metadata': metadata
        }
    
    def _encrypt_enhanced(self, field_name: str, value: str, config: EncryptionConfig) -> Dict[str, Any]:
        """Enhanced symmetric encryption with additional features"""
        # Determine key based on data classification
        if config.data_classification == DataClassification.RESTRICTED:
            key_id = 'customer_data'
        else:
            key_id = 'booking_data'
        
        key_data = self.key_manager.get_key(key_id)
        
        # Add additional entropy
        salt = secrets.token_bytes(16)
        
        # Derive field-specific key
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=10000,
            backend=default_backend()
        )
        derived_key = kdf.derive(key_data)
        
        fernet = Fernet(base64.urlsafe_b64encode(derived_key))
        encrypted_value = fernet.encrypt(value.encode())
        
        # Combine salt and encrypted value
        combined = salt + encrypted_value
        encoded_value = base64.b64encode(combined).decode()
        
        metadata = {
            'encryption_level': config.encryption_level.value,
            'key_id': key_id,
            'encrypted_at': datetime.now(timezone.utc).isoformat(),
            'data_classification': config.data_classification.value,
            'algorithm': 'fernet_enhanced',
            'salt_length': 16
        }
        
        return {
            'encrypted_value': encoded_value,
            'encryption_metadata': metadata
        }
    
    def _encrypt_maximum(self, field_name: str, value: str, config: EncryptionConfig, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Maximum security hybrid encryption (asymmetric + symmetric)"""
        # Use asymmetric key for maximum security fields
        private_key_data = self.key_manager.get_key('payment_asymmetric')
        private_key = serialization.load_pem_private_key(
            private_key_data,
            password=None,
            backend=default_backend()
        )
        public_key = private_key.public_key()
        
        # Generate random symmetric key for this operation
        symmetric_key = secrets.token_bytes(32)
        
        # Encrypt data with symmetric key
        fernet = Fernet(base64.urlsafe_b64encode(symmetric_key))
        encrypted_data = fernet.encrypt(value.encode())
        
        # Encrypt symmetric key with public key
        encrypted_key = public_key.encrypt(
            symmetric_key,
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None
            )
        )
        
        # Combine encrypted key and data
        combined = encrypted_key + encrypted_data
        encoded_value = base64.b64encode(combined).decode()
        
        metadata = {
            'encryption_level': config.encryption_level.value,
            'key_id': 'payment_asymmetric',
            'encrypted_at': datetime.now(timezone.utc).isoformat(),
            'data_classification': config.data_classification.value,
            'algorithm': 'rsa_aes_hybrid',
            'key_size': 2048,
            'symmetric_key_length': 32
        }
        
        return {
            'encrypted_value': encoded_value,
            'encryption_metadata': metadata
        }
    
    def _decrypt_basic(self, encrypted_data: Dict[str, Any], metadata: Dict[str, Any]) -> str:
        """Decrypt basic symmetric encryption"""
        key_id = metadata['key_id']
        key_data = self.key_manager.get_key(key_id)
        
        fernet = Fernet(key_data)
        decrypted_value = fernet.decrypt(encrypted_data['encrypted_value'].encode()).decode()
        
        return decrypted_value
    
    def _decrypt_enhanced(self, encrypted_data: Dict[str, Any], metadata: Dict[str, Any]) -> str:
        """Decrypt enhanced symmetric encryption"""
        key_id = metadata['key_id']
        key_data = self.key_manager.get_key(key_id)
        
        # Decode combined data
        combined = base64.b64decode(encrypted_data['encrypted_value'].encode())
        
        # Extract salt and encrypted value
        salt_length = metadata['salt_length']
        salt = combined[:salt_length]
        encrypted_value = combined[salt_length:]
        
        # Derive field-specific key
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=10000,
            backend=default_backend()
        )
        derived_key = kdf.derive(key_data)
        
        fernet = Fernet(base64.urlsafe_b64encode(derived_key))
        decrypted_value = fernet.decrypt(encrypted_value).decode()
        
        return decrypted_value
    
    def _decrypt_maximum(self, encrypted_data: Dict[str, Any], metadata: Dict[str, Any], context: Dict[str, Any] = None) -> str:
        """Decrypt maximum security hybrid encryption"""
        # Load private key
        private_key_data = self.key_manager.get_key(metadata['key_id'])
        private_key = serialization.load_pem_private_key(
            private_key_data,
            password=None,
            backend=default_backend()
        )
        
        # Decode combined data
        combined = base64.b64decode(encrypted_data['encrypted_value'].encode())
        
        # Extract encrypted symmetric key and data
        key_size = metadata['key_size'] // 8  # Convert bits to bytes
        encrypted_key = combined[:key_size]
        encrypted_data_part = combined[key_size:]
        
        # Decrypt symmetric key
        symmetric_key = private_key.decrypt(
            encrypted_key,
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None
            )
        )
        
        # Decrypt data with symmetric key
        fernet = Fernet(base64.urlsafe_b64encode(symmetric_key))
        decrypted_value = fernet.decrypt(encrypted_data_part).decode()
        
        return decrypted_value

# Utility functions and helpers
def create_encryption_system() -> DataEncryption:
    """Create configured encryption system"""
    key_manager = KeyManager()
    return DataEncryption(key_manager)

def hash_for_indexing(value: str, field_name: str) -> str:
    """Create searchable hash for encrypted fields"""
    # Use HMAC for additional security
    import hmac
    secret = f"index_key_{field_name}".encode()
    return hmac.new(secret, value.encode(), hashlib.sha256).hexdigest()

def secure_compare(a: str, b: str) -> bool:
    """Timing-safe string comparison"""
    import hmac
    return hmac.compare_digest(a, b)

# Example usage functions
async def encrypt_customer_data(encryption_system: DataEncryption, customer_data: Dict[str, Any]) -> Dict[str, Any]:
    """Encrypt customer booking data"""
    sensitive_fields = ['customer_name', 'email', 'phone', 'address']
    
    encrypted_data = customer_data.copy()
    
    for field in sensitive_fields:
        if field in encrypted_data:
            encrypted_field = encryption_system.encrypt_field(field, encrypted_data[field])
            encrypted_data[field] = encrypted_field['encrypted_value']
            encrypted_data[f"{field}_meta"] = encrypted_field['encryption_metadata']
    
    return encrypted_data

async def decrypt_customer_data(encryption_system: DataEncryption, 
                              encrypted_data: Dict[str, Any],
                              user_context: Dict[str, Any]) -> Dict[str, Any]:
    """Decrypt customer booking data"""
    return encryption_system.decrypt_document(encrypted_data, user_context)

# Database encryption helpers
class EncryptedDatabaseField:
    """Helper for database field encryption/decryption"""
    
    def __init__(self, field_name: str, encryption_system: DataEncryption):
        self.field_name = field_name
        self.encryption_system = encryption_system
    
    def encrypt_for_storage(self, value: str) -> str:
        """Encrypt value for database storage"""
        if not value:
            return None
        
        result = self.encryption_system.encrypt_field(self.field_name, value)
        
        # Store as JSON for database
        storage_data = {
            'encrypted_value': result['encrypted_value'],
            'metadata': result['encryption_metadata']
        }
        
        return json.dumps(storage_data)
    
    def decrypt_from_storage(self, encrypted_json: str, context: Dict[str, Any] = None) -> str:
        """Decrypt value from database storage"""
        if not encrypted_json:
            return None
        
        try:
            storage_data = json.loads(encrypted_json)
            encrypted_data = {
                'encrypted_value': storage_data['encrypted_value'],
                'encryption_metadata': storage_data['metadata']
            }
            
            return self.encryption_system.decrypt_field(self.field_name, encrypted_data, context)
            
        except Exception as e:
            logger.error(f"Failed to decrypt field from storage: {e}")
            return None
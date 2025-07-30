#!/usr/bin/env python3
"""
Hardcoded Secret Replacement Script
==================================
This script helps identify and replace hardcoded secrets with environment variable references.
"""

import os
import re
import sys
import json
import shutil
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple, Optional

class SecretReplacer:
    def __init__(self):
        self.backup_dir = f"secret-replacement-backup-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
        self.replacement_log = []
        
        # Common secret patterns and their environment variable names
        self.secret_patterns = {
            # API Keys
            r'api[_-]?key["\s]*[=:]["\s]*["\']([^"\']+)["\']': 'API_KEY',
            r'anthropic[_-]?api[_-]?key["\s]*[=:]["\s]*["\']([^"\']+)["\']': 'ANTHROPIC_API_KEY',
            r'openai[_-]?api[_-]?key["\s]*[=:]["\s]*["\']([^"\']+)["\']': 'OPENAI_API_KEY',
            r'stripe[_-]?secret[_-]?key["\s]*[=:]["\s]*["\']([^"\']+)["\']': 'STRIPE_SECRET_KEY',
            r'sendgrid[_-]?api[_-]?key["\s]*[=:]["\s]*["\']([^"\']+)["\']': 'SENDGRID_API_KEY',
            
            # JWT and Session Secrets
            r'jwt[_-]?secret[_-]?key["\s]*[=:]["\s]*["\']([^"\']+)["\']': 'JWT_SECRET_KEY',
            r'session[_-]?secret["\s]*[=:]["\s]*["\']([^"\']+)["\']': 'SESSION_SECRET',
            r'secret[_-]?key["\s]*[=:]["\s]*["\']([^"\']+)["\']': 'SECRET_KEY',
            
            # Database URLs
            r'database[_-]?url["\s]*[=:]["\s]*["\']([^"\']+)["\']': 'DATABASE_URL',
            r'redis[_-]?url["\s]*[=:]["\s]*["\']([^"\']+)["\']': 'REDIS_URL',
            
            # Passwords
            r'password["\s]*[=:]["\s]*["\']([^"\']+)["\']': 'PASSWORD',
            r'db[_-]?password["\s]*[=:]["\s]*["\']([^"\']+)["\']': 'DB_PASSWORD',
            
            # AWS Credentials
            r'aws[_-]?access[_-]?key[_-]?id["\s]*[=:]["\s]*["\']([^"\']+)["\']': 'AWS_ACCESS_KEY_ID',
            r'aws[_-]?secret[_-]?access[_-]?key["\s]*[=:]["\s]*["\']([^"\']+)["\']': 'AWS_SECRET_ACCESS_KEY',
            
            # Known API key formats
            r'sk-[a-zA-Z0-9]{32,}': 'STRIPE_SECRET_KEY',  # Stripe secret keys
            r'pk_test_[a-zA-Z0-9]{32,}': 'STRIPE_PUBLIC_KEY',  # Stripe test keys
            r'SG\.[a-zA-Z0-9_.-]{22,}': 'SENDGRID_API_KEY',  # SendGrid keys
            r'sk-ant-api03-[a-zA-Z0-9_-]{95}': 'ANTHROPIC_API_KEY',  # Anthropic keys
        }
        
        # File extensions to scan
        self.file_extensions = {'.py', '.js', '.ts', '.jsx', '.tsx', '.json', '.yaml', '.yml', '.toml', '.env'}
        
        # Directories to exclude
        self.exclude_dirs = {'node_modules', '.git', 'venv', '__pycache__', '.pytest_cache', 'dist', 'build'}

    def create_backup(self, file_path: str) -> str:
        """Create a backup of the file before modification."""
        if not os.path.exists(self.backup_dir):
            os.makedirs(self.backup_dir)
        
        backup_path = os.path.join(self.backup_dir, os.path.basename(file_path))
        shutil.copy2(file_path, backup_path)
        return backup_path

    def get_env_var_name(self, pattern: str, match: str) -> str:
        """Generate appropriate environment variable name."""
        if pattern in self.secret_patterns:
            return self.secret_patterns[pattern]
        
        # Default naming convention
        return match.upper().replace('-', '_').replace(' ', '_')

    def find_secrets_in_file(self, file_path: str) -> List[Tuple[str, str, str, int]]:
        """Find all hardcoded secrets in a file."""
        secrets = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                content = file.read()
                lines = content.split('\n')
                
                for pattern, env_var in self.secret_patterns.items():
                    matches = re.finditer(pattern, content, re.IGNORECASE | re.MULTILINE)
                    
                    for match in matches:
                        # Find line number
                        line_num = content[:match.start()].count('\n') + 1
                        
                        # Extract the secret value
                        if match.groups():
                            secret_value = match.group(1)
                        else:
                            secret_value = match.group(0)
                        
                        secrets.append((pattern, secret_value, env_var, line_num))
                        
        except Exception as e:
            print(f"Error reading {file_path}: {e}")
            
        return secrets

    def replace_secrets_in_file(self, file_path: str, dry_run: bool = True) -> List[Dict]:
        """Replace hardcoded secrets with environment variable references."""
        secrets = self.find_secrets_in_file(file_path)
        replacements = []
        
        if not secrets:
            return replacements
            
        # Create backup
        if not dry_run:
            backup_path = self.create_backup(file_path)
            print(f"Created backup: {backup_path}")
        
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                content = file.read()
                original_content = content
            
            for pattern, secret_value, env_var, line_num in secrets:
                # Skip if secret is too short (likely false positive)
                if len(secret_value) < 8:
                    continue
                
                # Different replacement strategies based on file type
                file_ext = Path(file_path).suffix
                
                if file_ext == '.py':
                    # Python: os.getenv('VAR_NAME', 'default')
                    replacement = f'os.getenv("{env_var}", "")'
                    # Add import if needed
                    if 'import os' not in content and 'from os import' not in content:
                        content = 'import os\n' + content
                        
                elif file_ext in {'.js', '.ts', '.jsx', '.tsx'}:
                    # JavaScript/TypeScript: process.env.VAR_NAME
                    replacement = f'process.env.{env_var}'
                    
                elif file_ext in {'.json'}:
                    # JSON: Skip replacement (cannot use env vars directly)
                    print(f"Skipping JSON file {file_path} - manual review needed")
                    continue
                    
                elif file_ext in {'.yaml', '.yml'}:
                    # YAML: ${VAR_NAME}
                    replacement = f'${{{env_var}}}'
                    
                else:
                    # Default: ${VAR_NAME}
                    replacement = f'${{{env_var}}}'
                
                # Replace the hardcoded value
                content = re.sub(
                    re.escape(secret_value), 
                    replacement, 
                    content
                )
                
                replacements.append({
                    'file': file_path,
                    'line': line_num,
                    'pattern': pattern,
                    'secret_value': secret_value[:10] + '...' if len(secret_value) > 10 else secret_value,
                    'env_var': env_var,
                    'replacement': replacement
                })
            
            # Write changes if not dry run
            if not dry_run and content != original_content:
                with open(file_path, 'w', encoding='utf-8') as file:
                    file.write(content)
                print(f"Updated: {file_path}")
                
        except Exception as e:
            print(f"Error processing {file_path}: {e}")
            
        return replacements

    def scan_directory(self, directory: str = '.') -> Dict[str, List]:
        """Scan entire directory for hardcoded secrets."""
        all_secrets = {}
        
        for root, dirs, files in os.walk(directory):
            # Exclude certain directories
            dirs[:] = [d for d in dirs if d not in self.exclude_dirs]
            
            for file in files:
                file_path = os.path.join(root, file)
                file_ext = Path(file).suffix
                
                if file_ext in self.file_extensions:
                    secrets = self.find_secrets_in_file(file_path)
                    if secrets:
                        all_secrets[file_path] = secrets
                        
        return all_secrets

    def generate_env_template(self, secrets: Dict[str, List]) -> Dict[str, str]:
        """Generate .env template from found secrets."""
        env_vars = {}
        
        for file_path, file_secrets in secrets.items():
            for pattern, secret_value, env_var, line_num in file_secrets:
                if env_var not in env_vars:
                    env_vars[env_var] = f"your_{env_var.lower()}_here"
                    
        return env_vars

    def create_replacement_report(self, replacements: List[Dict]) -> str:
        """Create a detailed replacement report."""
        report_path = f"secret-replacement-report-{datetime.now().strftime('%Y%m%d-%H%M%S')}.json"
        
        report = {
            'timestamp': datetime.now().isoformat(),
            'total_replacements': len(replacements),
            'replacements': replacements,
            'summary': {}
        }
        
        # Generate summary
        for replacement in replacements:
            env_var = replacement['env_var']
            if env_var not in report['summary']:
                report['summary'][env_var] = 0
            report['summary'][env_var] += 1
            
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2)
            
        return report_path

def main():
    """Main function to run the secret replacement process."""
    replacer = SecretReplacer()
    
    print("🔍 Hardcoded Secret Replacement Tool")
    print("=====================================")
    
    # Parse command line arguments
    dry_run = '--dry-run' in sys.argv or '-n' in sys.argv
    directory = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith('-') else '.'
    
    if dry_run:
        print("🧪 Running in DRY RUN mode - no files will be modified")
    
    print(f"📁 Scanning directory: {os.path.abspath(directory)}")
    
    # Scan for secrets
    print("\n1. Scanning for hardcoded secrets...")
    all_secrets = replacer.scan_directory(directory)
    
    if not all_secrets:
        print("✅ No hardcoded secrets found!")
        return
    
    print(f"🚨 Found secrets in {len(all_secrets)} files:")
    
    total_secrets = 0
    for file_path, secrets in all_secrets.items():
        print(f"   📄 {file_path}: {len(secrets)} secrets")
        total_secrets += len(secrets)
    
    print(f"\n📊 Total secrets found: {total_secrets}")
    
    # Generate environment template
    print("\n2. Generating environment variable template...")
    env_vars = replacer.generate_env_template(all_secrets)
    
    env_template_path = '.env.secrets-template'
    with open(env_template_path, 'w') as f:
        f.write("# Generated Environment Variables Template\n")
        f.write(f"# Generated on: {datetime.now().isoformat()}\n\n")
        
        for env_var, default_value in sorted(env_vars.items()):
            f.write(f"{env_var}={default_value}\n")
    
    print(f"📝 Environment template created: {env_template_path}")
    
    # Replace secrets
    print("\n3. Replacing hardcoded secrets...")
    all_replacements = []
    
    for file_path in all_secrets.keys():
        replacements = replacer.replace_secrets_in_file(file_path, dry_run=dry_run)
        all_replacements.extend(replacements)
    
    if all_replacements:
        # Create replacement report
        report_path = replacer.create_replacement_report(all_replacements)
        print(f"📋 Replacement report created: {report_path}")
        
        print(f"\n✅ Completed {len(all_replacements)} replacements")
        
        if dry_run:
            print("\n⚠️  This was a DRY RUN. To apply changes, run without --dry-run flag")
        else:
            print(f"\n💾 Backups created in: {replacer.backup_dir}")
    
    # Final recommendations
    print("\n🔧 Next Steps:")
    print("1. Review the generated .env template")
    print("2. Copy actual secret values to a new .env file")
    print("3. Test your application with the new environment variables")
    print("4. Ensure .env is in your .gitignore file")
    print("5. Rotate any secrets that were previously hardcoded")

if __name__ == "__main__":
    main()
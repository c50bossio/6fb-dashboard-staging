import re

# Read the file
with open('fastapi_backend.py', 'r') as f:
    content = f.read()

# Fix empty else blocks
content = re.sub(r'(\s+else:\s*\n)(# Removed: .*\n)', r'\1    pass  # \2', content)

# Fix empty if blocks with removed statements
content = re.sub(r'(\s+if .+:\s*\n)(# Removed: .*\n)', r'\1    pass  # \2', content)

# Write back
with open('fastapi_backend.py', 'w') as f:
    f.write(content)

print("Fixed indentation issues")

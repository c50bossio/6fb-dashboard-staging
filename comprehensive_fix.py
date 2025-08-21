import re

# Read the file
with open('fastapi_backend.py', 'r') as f:
    lines = f.readlines()

result = []
i = 0
while i < len(lines):
    line = lines[i]
    result.append(line)
    
    # Check if this is an incomplete else/if statement
    if (line.strip().endswith(':') and 
        i + 1 < len(lines) and 
        lines[i + 1].strip().startswith('# Removed:')):
        # Add pass statement with proper indentation
        indent = len(line) - len(line.lstrip())
        result.append(' ' * (indent + 4) + 'pass  ' + lines[i + 1])
        i += 2  # Skip the removed line
    else:
        i += 1

# Write back
with open('fastapi_backend.py', 'w') as f:
    f.writelines(result)

print("Fixed all indentation issues")

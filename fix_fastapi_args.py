#!/usr/bin/env python3
"""Fix FastAPI argument order issues in routers"""

import re
import os

def fix_function_args(file_path):
    """Fix functions where background_tasks comes before default arguments"""
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Pattern to find functions with background_tasks before Query(...) parameters
    pattern = r'(async def \w+\([^)]*?)(background_tasks: BackgroundTasks,)([^)]*?Query\([^)]+\)[^)]*?)(user_context = Depends\([^)]+\))'
    
    def reorder_args(match):
        func_start = match.group(1)
        bg_tasks = match.group(2)
        query_params = match.group(3)
        user_context = match.group(4)
        
        # Reorder: func_start + query_params + bg_tasks + user_context
        return func_start + query_params + bg_tasks + '\n    ' + user_context
    
    # Apply the fix
    fixed_content = re.sub(pattern, reorder_args, content, flags=re.MULTILINE | re.DOTALL)
    
    # Write back if changes were made
    if fixed_content != content:
        with open(file_path, 'w') as f:
            f.write(fixed_content)
        return True
    return False

# Fix the customer_loyalty.py file
loyalty_file = '/Users/bossio/6FB AI Agent System/routers/customer_loyalty.py'
if fix_function_args(loyalty_file):
    print(f"Fixed argument order in {loyalty_file}")
else:
    print(f"No changes needed in {loyalty_file}")

# Check other router files that might have the same issue
routers_dir = '/Users/bossio/6FB AI Agent System/routers'
for filename in os.listdir(routers_dir):
    if filename.endswith('.py'):
        file_path = os.path.join(routers_dir, filename)
        if fix_function_args(file_path):
            print(f"Fixed argument order in {filename}")
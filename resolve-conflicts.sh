#!/bin/bash
# Resolve all merge conflicts by accepting feature branch versions

cd "/Users/bossio/6FB AI Agent System"

# Get list of all unmerged files
git diff --name-only --diff-filter=U | while IFS= read -r file; do
    echo "Resolving: $file"
    git checkout --theirs "$file" 2>/dev/null
    git add "$file" 2>/dev/null
done

echo "All conflicts resolved!"

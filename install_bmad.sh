#!/bin/bash

# BMAD Installation Script for 6FB AI Agent System
echo "🚀 Installing BMAD Method..."
echo "Project Directory: /Users/bossio/6FB AI Agent System"
echo "Installing BMAD Agile Core System..."

# Create expect script to automate the interactive installation
cat > bmad_install_expect.exp << 'EOF'
#!/usr/bin/expect -f

set timeout 300
spawn npx bmad-method install

# Wait for directory prompt
expect "Enter the full path to your project directory"
send "/Users/bossio/6FB AI Agent System\r"

# Wait for selection menu
expect "Select what to install/update"
# BMad Agile Core System should be selected by default
send "\r"

# Wait for IDE selection
expect "Which IDE/Tool are you using?"
send "claude-code\r"

# Handle any additional prompts
expect {
    "Would you like to" {
        send "y\r"
        exp_continue
    }
    "Installation complete" {
        puts "✅ BMAD installation completed successfully!"
    }
    timeout {
        puts "⚠️  Installation timeout - checking results..."
    }
    eof
}
EOF

# Make expect script executable
chmod +x bmad_install_expect.exp

# Run the expect script
if command -v expect >/dev/null 2>&1; then
    echo "📦 Running automated BMAD installation..."
    ./bmad_install_expect.exp
else
    echo "⚠️  expect not found, running manual installation..."
    echo "Please follow these steps:"
    echo "1. Run: npx bmad-method install"
    echo "2. Enter directory: /Users/bossio/6FB AI Agent System"
    echo "3. Select: BMad Agile Core System (should be selected by default)"
    echo "4. Choose IDE: claude-code"
fi

# Cleanup
rm -f bmad_install_expect.exp

echo "🔍 Checking installation results..."
if [ -d ".bmad-core" ]; then
    echo "✅ .bmad-core directory created"
    ls -la .bmad-core/
else
    echo "❌ .bmad-core directory not found"
fi

if [ -d "/Users/bossio/.claude/commands" ]; then
    echo "✅ Claude commands directory exists"
    ls -la /Users/bossio/.claude/commands/ | grep bmad || echo "No BMAD commands found yet"
else
    echo "❌ Claude commands directory not found"
fi

echo "🎉 BMAD installation script completed!"
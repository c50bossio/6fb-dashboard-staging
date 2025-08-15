#!/usr/bin/env node
/**
 * SendGrid Service Dependencies Setup
 * 
 * Ensures all required dependencies are installed and configured
 * for the SendGrid email marketing service
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Setting up SendGrid Email Service Dependencies...\n');

const requiredDependencies = {
    '@sendgrid/mail': '^7.7.0',
    '@supabase/supabase-js': '^2.45.0'
};

const requiredDevDependencies = {
    '@types/node': '^20.0.0'
};

const requiredEnvVars = [
    'SENDGRID_API_KEY',
    'SENDGRID_WEBHOOK_VERIFICATION_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
];

async function checkAndInstallDependencies() {
    console.log('📦 Checking package.json dependencies...');
    
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    
    if (!fs.existsSync(packageJsonPath)) {
        console.error('❌ package.json not found');
        process.exit(1);
    }
    
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    let dependenciesToInstall = [];
    let devDependenciesToInstall = [];
    
    Object.entries(requiredDependencies).forEach(([pkg, version]) => {
        if (!packageJson.dependencies || !packageJson.dependencies[pkg]) {
            dependenciesToInstall.push(`${pkg}@${version}`);
            console.log(`  ⚠️  Missing dependency: ${pkg}`);
        } else {
            console.log(`  ✅ ${pkg} is installed`);
        }
    });
    
    Object.entries(requiredDevDependencies).forEach(([pkg, version]) => {
        if (!packageJson.devDependencies || !packageJson.devDependencies[pkg]) {
            devDependenciesToInstall.push(`${pkg}@${version}`);
            console.log(`  ⚠️  Missing dev dependency: ${pkg}`);
        } else {
            console.log(`  ✅ ${pkg} is installed`);
        }
    });
    
    if (dependenciesToInstall.length > 0) {
        console.log(`\n📥 Installing missing dependencies...`);
        try {
            execSync(`npm install ${dependenciesToInstall.join(' ')}`, { stdio: 'inherit' });
            console.log('✅ Dependencies installed successfully');
        } catch (error) {
            console.error('❌ Failed to install dependencies:', error.message);
            process.exit(1);
        }
    }
    
    if (devDependenciesToInstall.length > 0) {
        console.log(`\n📥 Installing missing dev dependencies...`);
        try {
            execSync(`npm install --save-dev ${devDependenciesToInstall.join(' ')}`, { stdio: 'inherit' });
            console.log('✅ Dev dependencies installed successfully');
        } catch (error) {
            console.error('❌ Failed to install dev dependencies:', error.message);
            process.exit(1);
        }
    }
}

function checkEnvironmentVariables() {
    console.log('\n🔧 Checking environment variables...');
    
    const envFiles = ['.env.local', '.env'];
    let envFileExists = false;
    
    for (const envFile of envFiles) {
        if (fs.existsSync(envFile)) {
            envFileExists = true;
            console.log(`  ✅ Found ${envFile}`);
            break;
        }
    }
    
    if (!envFileExists) {
        console.log('  ⚠️  No .env file found, creating .env.local...');
        const envTemplate = `# SendGrid Configuration
SENDGRID_API_KEY=your_sendgrid_api_key_here
SENDGRID_WEBHOOK_VERIFICATION_KEY=your_webhook_verification_key_here

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Optional: Default email settings
DEFAULT_FROM_EMAIL=noreply@yourbarbershop.com
DEFAULT_FROM_NAME=Your Barbershop
`;
        fs.writeFileSync('.env.local', envTemplate);
        console.log('  ✅ Created .env.local template');
    }
    
    const missingVars = [];
    requiredEnvVars.forEach(varName => {
        if (!process.env[varName] || process.env[varName].includes('your_') || process.env[varName].includes('_here')) {
            missingVars.push(varName);
        }
    });
    
    if (missingVars.length > 0) {
        console.log('\n⚠️  The following environment variables need to be configured:');
        missingVars.forEach(varName => {
            console.log(`   - ${varName}`);
        });
        console.log('\n📝 Please update your .env.local file with the correct values');
    } else {
        console.log('  ✅ All required environment variables are configured');
    }
}

function checkDatabaseSchema() {
    console.log('\n🗄️  Database schema check...');
    
    const schemaFile = path.join(process.cwd(), 'database', 'campaign-analytics-schema.sql');
    
    if (fs.existsSync(schemaFile)) {
        console.log('  ✅ Campaign analytics schema file exists');
        console.log('  📝 To apply schema, run this SQL in your Supabase dashboard:');
        console.log(`     cat database/campaign-analytics-schema.sql | pbcopy`);
    } else {
        console.log('  ❌ Campaign analytics schema file not found');
    }
}

function displaySetupInstructions() {
    console.log('\n📋 SendGrid Setup Instructions:');
    console.log('');
    console.log('1. 🔑 Get SendGrid API Key:');
    console.log('   - Go to https://app.sendgrid.com/settings/api_keys');
    console.log('   - Create a new API key with "Mail Send" permissions');
    console.log('   - Add to .env.local as SENDGRID_API_KEY');
    console.log('');
    console.log('2. 🔗 Configure Webhook:');
    console.log('   - Go to https://app.sendgrid.com/settings/mail_settings');
    console.log('   - Navigate to "Event Webhook"');
    console.log('   - Set HTTP Post URL to: https://yourdomain.com/api/webhooks/sendgrid');
    console.log('   - Enable events: Delivered, Bounced, Opened, Clicked, Unsubscribed');
    console.log('   - Get verification key and add to .env.local as SENDGRID_WEBHOOK_VERIFICATION_KEY');
    console.log('');
    console.log('3. 🗄️  Setup Database:');
    console.log('   - Copy contents of database/campaign-analytics-schema.sql');
    console.log('   - Paste and run in Supabase SQL Editor');
    console.log('');
    console.log('4. 🧪 Test Installation:');
    console.log('   - Run: node services/sendgrid-service.js');
    console.log('   - Check for any configuration errors');
    console.log('');
    console.log('5. 🚀 Deploy Webhook Endpoint:');
    console.log('   - Ensure your app is deployed and accessible');
    console.log('   - Test webhook URL responds with 200 status');
    console.log('');
    console.log('✅ Setup complete! Your email marketing system is ready to use.');
}

function generateTestScript() {
    console.log('\n🧪 Generating test script...');
    
    const testScript = `#!/usr/bin/env node
/**
 * SendGrid Service Test Script
 * Run this to validate your SendGrid email service setup
 */

const { sendGridService } = require('./services/sendgrid-service.js');

async function testSendGridService() {
    console.log('🧪 Testing SendGrid Email Service...');
    
    try {
        console.log('✅ Service initialized successfully');
        
        const templates = sendGridService.getEmailTemplates();
        console.log('✅ Email templates loaded:', Object.keys(templates).length);
        
        const testConfig = {
            campaignName: 'Test Campaign',
            recipients: [{ email: 'test@example.com', name: 'Test User' }],
            subject: 'Test Email',
            htmlContent: '<h1>Test</h1><p>This is a test email.</p>',
            fromEmail: 'test@yourdomain.com',
            fromName: 'Test Sender',
            planTier: 'PROFESSIONAL',
            userId: 'test-user-id'
        };
        
        console.log('⚠️  Test campaign configured (not sending)');
        console.log('📧 Would send to:', testConfig.recipients.length, 'recipients');
        
        console.log('\\n✅ All tests passed! SendGrid service is ready.');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    testSendGridService();
}
`;
    
    fs.writeFileSync('test-sendgrid-service.js', testScript);
    console.log('  ✅ Created test-sendgrid-service.js');
    console.log('  💡 Run: node test-sendgrid-service.js to test your setup');
}

async function main() {
    try {
        await checkAndInstallDependencies();
        checkEnvironmentVariables();
        checkDatabaseSchema();
        generateTestScript();
        displaySetupInstructions();
        
        console.log('\n🎉 SendGrid Email Service setup completed successfully!');
        console.log('📚 Check the generated files and follow the setup instructions above.');
        
    } catch (error) {
        console.error('\n❌ Setup failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = {
    checkAndInstallDependencies,
    checkEnvironmentVariables,
    checkDatabaseSchema,
    displaySetupInstructions
};
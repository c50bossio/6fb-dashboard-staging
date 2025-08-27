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
            
        } else {
            
        }
    });
    
    Object.entries(requiredDevDependencies).forEach(([pkg, version]) => {
        if (!packageJson.devDependencies || !packageJson.devDependencies[pkg]) {
            devDependenciesToInstall.push(`${pkg}@${version}`);
            
        } else {
            
        }
    });
    
    if (dependenciesToInstall.length > 0) {
        
        try {
            execSync(`npm install ${dependenciesToInstall.join(' ')}`, { stdio: 'inherit' });
            
        } catch (error) {
            console.error('❌ Failed to install dependencies:', error.message);
            process.exit(1);
        }
    }
    
    if (devDependenciesToInstall.length > 0) {
        
        try {
            execSync(`npm install --save-dev ${devDependenciesToInstall.join(' ')}`, { stdio: 'inherit' });
            
        } catch (error) {
            console.error('❌ Failed to install dev dependencies:', error.message);
            process.exit(1);
        }
    }
}

function checkEnvironmentVariables() {

    const envFiles = ['.env.local', '.env'];
    let envFileExists = false;
    
    for (const envFile of envFiles) {
        if (fs.existsSync(envFile)) {
            envFileExists = true;
            
            break;
        }
    }
    
    if (!envFileExists) {
        
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
        
    }
    
    const missingVars = [];
    requiredEnvVars.forEach(varName => {
        if (!process.env[varName] || process.env[varName].includes('your_') || process.env[varName].includes('_here')) {
            missingVars.push(varName);
        }
    });
    
    if (missingVars.length > 0) {
        
        missingVars.forEach(varName => {
            
        });
        
    } else {
        
    }
}

function checkDatabaseSchema() {

    const schemaFile = path.join(process.cwd(), 'database', 'campaign-analytics-schema.sql');
    
    if (fs.existsSync(schemaFile)) {

    } else {
        
    }
}

function displaySetupInstructions() {

}

function generateTestScript() {

    const testScript = `#!/usr/bin/env node
/**
 * SendGrid Service Test Script
 * Run this to validate your SendGrid email service setup
 */

const { sendGridService } = require('./services/sendgrid-service.js');

async function testSendGridService() {

    try {

        const templates = sendGridService.getEmailTemplates();
        .length);
        
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
        
        ');

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

}

async function main() {
    try {
        await checkAndInstallDependencies();
        checkEnvironmentVariables();
        checkDatabaseSchema();
        generateTestScript();
        displaySetupInstructions();

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
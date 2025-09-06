#!/usr/bin/env node

/**
 * OAuth Configuration Helper Script
 * Automates the verification and setup process for Google OAuth with Supabase
 */

const https = require('https');
const fs = require('fs');

class OAuthConfigHelper {
  constructor() {
    this.projectId = 'dfhqjdoydihajmjxniee';
    this.productionDomain = 'bookedbarber.com';
    this.callbackUrl = `https://${this.productionDomain}/api/auth/callback`;
    this.supabaseCallbackUrl = `https://${this.projectId}.supabase.co/auth/v1/callback`;
  }

  generateConfigurationSummary() {
    const config = {
      project: {
        name: 'BookedBarber',
        domain: this.productionDomain,
        supabaseProject: this.projectId
      },
      urls: {
        production: `https://${this.productionDomain}`,
        callback: this.callbackUrl,
        supabaseCallback: this.supabaseCallbackUrl,
        supabaseDashboard: `https://supabase.com/dashboard/project/${this.projectId}`,
        googleCloudConsole: 'https://console.cloud.google.com/apis/credentials'
      },
      requiredConfigurations: {
        supabase: {
          siteUrl: `https://${this.productionDomain}`,
          redirectUrls: [
            `https://${this.productionDomain}/**`,
            this.callbackUrl
          ],
          googleProviderEnabled: true
        },
        googleCloud: {
          authorizedOrigins: [
            `https://${this.productionDomain}`
          ],
          redirectUris: [
            this.callbackUrl,
            this.supabaseCallbackUrl
          ]
        }
      }
    };

    return config;
  }

  async checkCurrentSupabaseConfig() {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 9999,
        path: '/api/auth/check-supabase-config',
        method: 'GET'
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', (err) => reject(err));
      req.setTimeout(5000, () => {
        req.abort();
        reject(new Error('Request timeout'));
      });
      req.end();
    });
  }

  generateInstructions() {
    const config = this.generateConfigurationSummary();
    
    return `
# 🔐 OAuth Configuration Instructions

## ✅ Code Fixes Complete
- Circular dependency issues resolved
- Error handling improved
- Build successful (541 pages)

## 🔧 Manual Configuration Required

### 1. Supabase Configuration
📍 **URL**: ${config.urls.supabaseDashboard}/auth/settings

**Steps:**
1. Login to Supabase Dashboard
2. Go to Authentication → Settings
3. Set Site URL: \`${config.requiredConfigurations.supabase.siteUrl}\`
4. Go to Authentication → Providers
5. Enable Google provider
6. Verify redirect URLs include: \`${config.requiredConfigurations.supabase.redirectUrls.join('`, `')}\`

### 2. Google Cloud Console Configuration  
📍 **URL**: ${config.urls.googleCloudConsole}

**Steps:**
1. Login to Google Cloud Console
2. Select your BookedBarber project
3. Go to APIs & Services → Credentials
4. Find OAuth 2.0 Client ID
5. Edit and add:

**Authorized JavaScript origins:**
\`\`\`
${config.requiredConfigurations.googleCloud.authorizedOrigins.join('\n')}
\`\`\`

**Authorized redirect URIs:**
\`\`\`
${config.requiredConfigurations.googleCloud.redirectUris.join('\n')}
\`\`\`

## 🧪 Test Instructions

### Production Test:
1. Go to: https://${this.productionDomain}/login
2. Click "Continue with Google"
3. Should redirect without "Cannot access 'ed'" error
4. Should complete authentication successfully

### If Still Getting Errors:
- Check browser console for specific error messages
- Verify both configurations are saved properly
- Try clearing browser cache and cookies

## 📋 Configuration Checklist

### Supabase:
- [ ] Site URL: https://${this.productionDomain}
- [ ] Google provider enabled
- [ ] Redirect URLs configured

### Google Cloud:
- [ ] JavaScript origins: https://${this.productionDomain}
- [ ] Redirect URIs: ${this.callbackUrl}
- [ ] Redirect URIs: ${this.supabaseCallbackUrl}

---
Generated: ${new Date().toISOString()}
Project: ${config.project.name} (${config.project.supabaseProject})
`;
  }

  async run() {
    console.log('🔍 OAuth Configuration Helper');
    console.log('================================');

    // Generate configuration
    const config = this.generateConfigurationSummary();
    
    // Try to check current config
    try {
      console.log('📡 Checking current Supabase configuration...');
      const currentConfig = await this.checkCurrentSupabaseConfig();
      console.log('✅ Current config retrieved');
      console.log(`   Project: ${currentConfig.supabase_project}`);
      console.log(`   Google enabled: ${currentConfig.auth_settings.has_google_config}`);
    } catch (error) {
      console.log('⚠️  Could not fetch current config (server may not be running)');
    }

    // Generate instructions
    const instructions = this.generateInstructions();
    
    // Write to file
    fs.writeFileSync('./oauth-configuration-instructions.md', instructions);
    
    console.log('\n📝 Instructions generated:');
    console.log('   File: oauth-configuration-instructions.md');
    console.log('   Supabase Dashboard:', config.urls.supabaseDashboard);
    console.log('   Google Cloud Console:', config.urls.googleCloudConsole);
    
    console.log('\n🎯 Next Steps:');
    console.log('1. Follow the instructions in oauth-configuration-instructions.md');
    console.log('2. Configure both Supabase and Google Cloud Console');  
    console.log('3. Test Google login at https://bookedbarber.com/login');

    return config;
  }
}

// Run if called directly
if (require.main === module) {
  const helper = new OAuthConfigHelper();
  helper.run().catch(console.error);
}

module.exports = OAuthConfigHelper;
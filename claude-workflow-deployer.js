/**
 * Claude-Powered Workflow Deployer
 * Allows Claude to automatically deploy Novu workflows via browser automation
 */

const puppeteer = require('puppeteer');

class ClaudeWorkflowDeployer {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async initialize() {
    console.log('🚀 Initializing Claude Workflow Deployer...');
    
    this.browser = await puppeteer.launch({ 
      headless: false, // Show browser so you can see what's happening
      defaultViewport: { width: 1200, height: 800 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    this.page = await this.browser.newPage();
    await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    console.log('✅ Browser initialized');
  }

  async navigateToNovu() {
    console.log('🌐 Navigating to Novu dashboard...');
    await this.page.goto('https://web.novu.co', { waitUntil: 'networkidle2' });
    
    // Wait for login form or dashboard
    await this.page.waitForSelector('input[type="email"], .dashboard', { timeout: 10000 });
    
    const isLoggedIn = await this.page.$('.dashboard') !== null;
    
    if (!isLoggedIn) {
      console.log('⏸️  Please log in to Novu in the browser window that opened');
      console.log('   Once logged in, press Enter to continue...');
      
      // Wait for user input
      await new Promise(resolve => {
        process.stdin.once('data', () => resolve());
      });
      
      // Wait for dashboard to load
      await this.page.waitForSelector('.dashboard, [data-testid="dashboard"]', { timeout: 30000 });
    }
    
    console.log('✅ Successfully logged into Novu');
  }

  async createWorkflow(workflowData) {
    console.log(`\n🛠️  Creating workflow: ${workflowData.name}`);
    
    try {
      // Navigate to workflows page
      await this.page.goto('https://web.novu.co/workflows', { waitUntil: 'networkidle2' });
      
      // Click "Create Workflow" button
      await this.page.waitForSelector('button:has-text("Create"), [data-testid="create-workflow"], .create-workflow', { timeout: 10000 });
      await this.page.click('button:has-text("Create"), [data-testid="create-workflow"], .create-workflow');
      
      // Fill in basic workflow info
      await this.page.waitForSelector('input[name="name"], input[placeholder*="name"]', { timeout: 10000 });
      
      // Clear and fill name
      await this.page.click('input[name="name"], input[placeholder*="name"]');
      await this.page.keyboard.selectAll();
      await this.page.type('input[name="name"], input[placeholder*="name"]', workflowData.name);
      
      // Fill identifier if field exists
      const identifierField = await this.page.$('input[name="workflowId"], input[placeholder*="identifier"]');
      if (identifierField) {
        await this.page.click('input[name="workflowId"], input[placeholder*="identifier"]');
        await this.page.keyboard.selectAll();
        await this.page.type('input[name="workflowId"], input[placeholder*="identifier"]', workflowData.workflowId);
      }
      
      // Fill description if field exists
      const descriptionField = await this.page.$('textarea[name="description"], textarea[placeholder*="description"]');
      if (descriptionField) {
        await this.page.click('textarea[name="description"], textarea[placeholder*="description"]');
        await this.page.keyboard.selectAll();
        await this.page.type('textarea[name="description"], textarea[placeholder*="description"]', workflowData.description);
      }
      
      // Save workflow
      await this.page.click('button:has-text("Create"), button:has-text("Save")');
      
      // Wait for workflow editor to load
      await this.page.waitForSelector('.workflow-editor, [data-testid="workflow-editor"]', { timeout: 10000 });
      
      console.log(`✅ Created workflow: ${workflowData.name}`);
      
      // Add steps
      for (let i = 0; i < workflowData.steps.length; i++) {
        const step = workflowData.steps[i];
        await this.addWorkflowStep(step, i);
        await this.page.waitForTimeout(2000); // Wait between steps
      }
      
      console.log(`🎉 Completed workflow: ${workflowData.name}`);
      
    } catch (error) {
      console.log(`❌ Error creating workflow ${workflowData.name}:`, error.message);
      throw error;
    }
  }

  async addWorkflowStep(step, index) {
    console.log(`  📧 Adding ${step.type} step: ${step.name}`);
    
    try {
      // Click "Add Step" or similar button
      await this.page.waitForSelector('button:has-text("Add"), .add-step', { timeout: 5000 });
      await this.page.click('button:has-text("Add"), .add-step');
      
      // Select step type (email, sms, in_app)
      await this.page.waitForSelector(`[data-testid="${step.type}"], button:has-text("${step.type}")`, { timeout: 5000 });
      await this.page.click(`[data-testid="${step.type}"], button:has-text("${step.type}")`);
      
      // Wait for step editor to load
      await this.page.waitForTimeout(2000);
      
      if (step.type === 'email') {
        // Fill email subject
        const subjectField = await this.page.$('input[name="subject"], input[placeholder*="subject"]');
        if (subjectField) {
          await this.page.click('input[name="subject"], input[placeholder*="subject"]');
          await this.page.keyboard.selectAll();
          await this.page.type('input[name="subject"], input[placeholder*="subject"]', step.subject);
        }
        
        // Fill email content
        const contentField = await this.page.$('textarea[name="content"], .editor, [contenteditable]');
        if (contentField) {
          await this.page.click('textarea[name="content"], .editor, [contenteditable]');
          await this.page.keyboard.selectAll();
          await this.page.type('textarea[name="content"], .editor, [contenteditable]', step.content);
        }
      } else if (step.type === 'sms') {
        // Fill SMS content
        const smsField = await this.page.$('textarea[name="content"], textarea[placeholder*="message"]');
        if (smsField) {
          await this.page.click('textarea[name="content"], textarea[placeholder*="message"]');
          await this.page.keyboard.selectAll();
          await this.page.type('textarea[name="content"], textarea[placeholder*="message"]', step.content);
        }
      } else if (step.type === 'in_app') {
        // Fill in-app subject
        const subjectField = await this.page.$('input[name="subject"], input[placeholder*="subject"]');
        if (subjectField) {
          await this.page.click('input[name="subject"], input[placeholder*="subject"]');
          await this.page.keyboard.selectAll();
          await this.page.type('input[name="subject"], input[placeholder*="subject"]', step.subject);
        }
        
        // Fill in-app content
        const contentField = await this.page.$('textarea[name="content"], textarea[placeholder*="body"]');
        if (contentField) {
          await this.page.click('textarea[name="content"], textarea[placeholder*="body"]');
          await this.page.keyboard.selectAll();
          await this.page.type('textarea[name="content"], textarea[placeholder*="body"]', step.content);
        }
      }
      
      // Save step
      await this.page.click('button:has-text("Save"), button:has-text("Done")');
      await this.page.waitForTimeout(1000);
      
      console.log(`    ✅ Added ${step.type} step`);
      
    } catch (error) {
      console.log(`    ❌ Error adding ${step.type} step:`, error.message);
    }
  }

  async deployAllWorkflows() {
    const workflows = require('./auto-deploy-novu-workflows').workflows;
    
    console.log('🎯 Claude Auto-Deploying Workflows via Browser');
    console.log('===============================================');
    
    await this.initialize();
    await this.navigateToNovu();
    
    let successCount = 0;
    
    for (const workflow of workflows) {
      try {
        await this.createWorkflow(workflow);
        successCount++;
      } catch (error) {
        console.log(`❌ Failed to create ${workflow.name}:`, error.message);
      }
      
      // Wait between workflows
      await this.page.waitForTimeout(3000);
    }
    
    console.log('\n📊 Deployment Summary');
    console.log('======================');
    console.log(`✅ Successful: ${successCount}/${workflows.length}`);
    console.log(`❌ Failed: ${workflows.length - successCount}/${workflows.length}`);
    
    if (successCount === workflows.length) {
      console.log('\n🎉 All workflows deployed successfully!');
    }
    
    console.log('\n🧪 You can now test with: node test-novu-workflows.js');
    console.log('🌐 Check your workflows at: https://web.novu.co/workflows');
    
    // Keep browser open for verification
    console.log('\n⏸️  Browser will stay open for verification. Press Enter to close...');
    await new Promise(resolve => {
      process.stdin.once('data', () => resolve());
    });
    
    await this.browser.close();
  }
}

// Run if called directly
if (require.main === module) {
  const deployer = new ClaudeWorkflowDeployer();
  deployer.deployAllWorkflows().catch(console.error);
}

module.exports = ClaudeWorkflowDeployer;
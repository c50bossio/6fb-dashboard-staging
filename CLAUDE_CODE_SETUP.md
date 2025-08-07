# Claude Code Review Setup Guide

This guide will help you complete the setup of Claude Code Review for your GitHub repository.

## 🚀 Quick Setup (Recommended)

The easiest way to set up Claude Code Review is using the Claude terminal:

1. **Open Claude Code in your terminal**
2. **Run the installation command**:
   ```bash
   /install-github-app
   ```
3. **Follow the guided setup** - this will:
   - Create the GitHub App automatically
   - Configure all required secrets
   - Set up proper permissions
   - Guide you through the authentication process

## 🔧 Manual Setup (Alternative)

If you prefer to set up manually or the quick setup doesn't work, follow these steps:

### Step 1: Create GitHub App

1. Go to your GitHub repository settings
2. Navigate to **Settings** → **Developer settings** → **GitHub Apps**
3. Click **New GitHub App**
4. Configure the app with these settings:

   **Basic Information:**
   - **GitHub App name**: `Claude Code Review - [Your Repo Name]`
   - **Homepage URL**: Your repository URL
   - **Webhook URL**: `https://api.github.com/repos/[owner]/[repo]/hooks`

   **Permissions:**
   - **Contents**: Read
   - **Issues**: Write  
   - **Pull requests**: Write
   - **Discussions**: Write
   - **Metadata**: Read

   **Events:**
   - [x] Issues
   - [x] Issue comments
   - [x] Pull request
   - [x] Pull request review comments

5. **Generate a private key** and download it
6. **Install the app** on your repository

### Step 2: Configure Repository Secrets

Go to your repository **Settings** → **Secrets and variables** → **Actions** and add:

#### Required Secrets:

1. **`ANTHROPIC_API_KEY`**
   - Your Anthropic API key for Claude
   - Get it from: https://console.anthropic.com/

2. **`CLAUDE_GITHUB_APP_ID`**
   - The App ID from your GitHub App (found in app settings)

3. **`CLAUDE_GITHUB_APP_PRIVATE_KEY`**
   - The private key you downloaded from the GitHub App
   - Paste the entire contents of the `.pem` file

#### Optional Secrets (for cloud providers):

4. **`AWS_ACCESS_KEY_ID`** & **`AWS_SECRET_ACCESS_KEY`** (for AWS Bedrock)
5. **`GOOGLE_APPLICATION_CREDENTIALS`** (for Google Vertex AI)

### Step 3: Verify Installation

1. **Check the workflow file**: Ensure `.github/workflows/claude-code-review.yml` exists
2. **Verify secrets**: All required secrets should be configured
3. **Test permissions**: The GitHub App should have access to your repository

## 🎯 How to Use Claude Code Review

### Automatic Reviews
- **New Pull Requests**: Claude will automatically review new PRs
- **PR Updates**: When you push new commits to a PR

### Interactive Reviews  
- **Comment with @claude**: Mention @claude in any:
  - Pull request comment
  - Pull request review comment
  - Issue comment
- **Ask specific questions**: "[@claude] Can you review the security of this authentication code?"
- **Request implementations**: "[@claude] Can you help implement error handling for this API endpoint?"

### Example Usage:
```
@claude Please review this payment processing code for security vulnerabilities and suggest improvements.
```

```
@claude Can you help refactor this component to improve performance?
```

```  
@claude What's the best way to handle errors in this API endpoint?
```

## 🔒 Security Best Practices

1. **Never commit secrets** to your repository
2. **Use GitHub Secrets** for all API keys and tokens
3. **Review AI suggestions** before implementing them
4. **Limit repository access** to necessary team members
5. **Monitor API usage** to prevent unexpected costs

## 🛠️ Troubleshooting

### Common Issues:

**1. "No ANTHROPIC_API_KEY found"**
- Ensure you've added the API key to repository secrets
- Check the secret name matches exactly: `ANTHROPIC_API_KEY`

**2. "GitHub App authentication failed"**
- Verify the App ID and private key are correct
- Ensure the GitHub App is installed on your repository
- Check that the private key format is correct (entire .pem file contents)

**3. "Claude not responding to @mentions"**
- Check if the workflow is enabled in Actions tab
- Verify the GitHub App has correct permissions
- Ensure you're using @claude (not @Claude or other variations)

**4. "Workflow not triggering"**
- Check repository Actions tab for failed runs
- Verify the workflow file syntax is correct
- Ensure the GitHub App events are configured properly

### Getting Help:

1. **Check GitHub Actions logs** in your repository's Actions tab
2. **Review Claude Code documentation**: https://docs.anthropic.com/en/docs/claude-code/github-actions
3. **Verify your API key** at https://console.anthropic.com/
4. **Test with simple @claude mentions** in issues first

## 🚀 Advanced Configuration

### Custom Instructions
You can modify the `instructions` field in the workflow file to customize how Claude reviews your code:

```yaml
instructions: |
  Focus on these specific areas:
  - Security vulnerabilities
  - Performance optimizations  
  - Code maintainability
  - Your specific coding standards
```

### Model Selection
Change the Claude model used for reviews:

```yaml
model: "claude-3-5-sonnet-20241022"  # Latest Sonnet
# or
model: "claude-3-haiku-20240307"     # Faster, more cost-effective
```

### Response Control
Adjust response length and creativity:

```yaml
max-tokens: 4000    # Maximum response length
temperature: 0.1    # Lower = more focused, Higher = more creative
```

## ✅ Verification Checklist

- [ ] Workflow file exists: `.github/workflows/claude-code-review.yml`
- [ ] GitHub App created and installed on repository
- [ ] Repository secrets configured:
  - [ ] `ANTHROPIC_API_KEY`
  - [ ] `CLAUDE_GITHUB_APP_ID`  
  - [ ] `CLAUDE_GITHUB_APP_PRIVATE_KEY`
- [ ] GitHub App permissions set correctly
- [ ] Test @claude mention in an issue
- [ ] Verify workflow runs in Actions tab

## 🎉 You're Ready!

Once setup is complete, Claude will start reviewing your pull requests automatically and respond to @claude mentions in issues and PR comments.

**Quick Test**: Create a test issue and comment `@claude Hello! Can you help review code in this repository?`

---

**Need help?** Check the troubleshooting section above or refer to the [official Claude Code documentation](https://docs.anthropic.com/en/docs/claude-code/github-actions).
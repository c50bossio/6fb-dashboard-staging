const express = require('express');
const { spawn } = require('child_process');
const app = express();
const port = process.env.PORT || 7080;

const downloadCoder = () => {
  return new Promise((resolve, reject) => {
    console.log('Downloading Coder...');
    const curl = spawn('curl', ['-fsSL', 'https://coder.com/install.sh']);
    const sh = spawn('sh', [], { stdio: ['pipe', 'inherit', 'inherit'] });
    
    curl.stdout.pipe(sh.stdin);
    
    sh.on('close', (code) => {
      if (code === 0) {
        console.log('Coder installed successfully');
        resolve();
      } else {
        reject(new Error(`Installation failed with code ${code}`));
      }
    });
  });
};

const startCoder = () => {
  console.log('Starting Coder server...');
  const coder = spawn('coder', [
    'server',
    '--http-address=0.0.0.0:7080',
    '--access-url=' + (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : 'http://localhost:7080'),
    '--telemetry=false'
  ], {
    stdio: 'inherit',
    env: {
      ...process.env,
      CODER_HTTP_ADDRESS: '0.0.0.0:7080',
      CODER_TELEMETRY: 'false'
    }
  });

  coder.on('error', (err) => {
    console.error('Failed to start Coder:', err);
  });

  coder.on('close', (code) => {
    console.log(`Coder server exited with code ${code}`);
  });
};

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'coder-proxy' });
});

const setup = async () => {
  try {
    await downloadCoder();
    startCoder();
    
    app.listen(port, '0.0.0.0', () => {
      console.log(`Coder proxy server listening on port ${port}`);
      console.log(`Access URL: ${process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : `http://localhost:${port}`}`);
    });
  } catch (error) {
    console.error('Setup failed:', error);
    process.exit(1);
  }
};

setup();
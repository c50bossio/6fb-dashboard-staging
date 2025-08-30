const { spawn } = require('child_process');
const express = require('express');
const app = express();
const port = process.env.PORT || 7080;

const downloadCoder = () => {
  return new Promise((resolve, reject) => {
    
    const curl = spawn('curl', ['-fsSL', 'https://coder.com/install.sh']);
    const sh = spawn('sh', [], { stdio: ['pipe', 'inherit', 'inherit'] });
    
    curl.stdout.pipe(sh.stdin);
    
    sh.on('close', (code) => {
      if (code === 0) {
        
        resolve();
      } else {
        reject(new Error(`Installation failed with code ${code}`));
      }
    });
  });
};

const startCoder = () => {
  
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

    });
  } catch (error) {
    console.error('Setup failed:', error);
    process.exit(1);
  }
};

setup();
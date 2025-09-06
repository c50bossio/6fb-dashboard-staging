// ES Module wrapper for CommonJS config
// This allows Next.js to find next.config.js while keeping the CJS configuration
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Import the CommonJS configuration
const config = require('./next.config.cjs');

export default config;
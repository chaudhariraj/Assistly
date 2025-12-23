// Simple TypeScript build with memory optimization
const { execSync } = require('child_process');

try {
  console.log('Building with TypeScript (incremental)...');
  // Use incremental builds and skip lib check to reduce memory
  execSync('npx tsc --incremental --skipLibCheck', {
    cwd: __dirname,
    stdio: 'inherit',
    env: { 
      ...process.env, 
      NODE_OPTIONS: '--max-old-space-size=1536' // Lower memory limit
    }
  });
  console.log('✓ Build completed!');
} catch (error) {
  console.error('✗ Build failed');
  process.exit(1);
}


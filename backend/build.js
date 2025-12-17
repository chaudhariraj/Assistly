const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Clean dist directory
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
}
fs.mkdirSync('dist', { recursive: true });

// Compile with SWC
try {
  execSync('swc src -d dist', { stdio: 'inherit', cwd: __dirname });
  
  // If SWC created dist/src structure, move files up
  const distSrcPath = path.join(__dirname, 'dist', 'src');
  if (fs.existsSync(distSrcPath)) {
    const files = fs.readdirSync(distSrcPath);
    files.forEach(file => {
      const srcPath = path.join(distSrcPath, file);
      const destPath = path.join(__dirname, 'dist', file);
      fs.renameSync(srcPath, destPath);
    });
    fs.rmSync(distSrcPath, { recursive: true, force: true });
  }
  
  console.log('✓ Build successful');
} catch (error) {
  console.error('✗ Build failed:', error.message);
  process.exit(1);
}


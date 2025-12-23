const esbuild = require('esbuild');
const { readdirSync, statSync, mkdirSync, existsSync, rmSync } = require('fs');
const { join, relative, dirname } = require('path');

// Clean dist
const distDir = join(__dirname, 'dist');
if (existsSync(distDir)) {
  rmSync(distDir, { recursive: true, force: true });
}
mkdirSync(distDir, { recursive: true });

// Find all .ts files
function findTsFiles(dir, baseDir, fileList = []) {
  const files = readdirSync(dir);
  files.forEach(file => {
    const filePath = join(dir, file);
    if (statSync(filePath).isDirectory()) {
      findTsFiles(filePath, baseDir, fileList);
    } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

const srcDir = join(__dirname, 'src');
const tsFiles = findTsFiles(srcDir, srcDir);

console.log(`Compiling ${tsFiles.length} files with esbuild...`);

// Build all files
Promise.all(
  tsFiles.map(file => {
    const relPath = relative(srcDir, file);
    const outPath = join(distDir, relPath.replace(/\.ts$/, '.js'));
    const outDir = dirname(outPath);
    
    if (!existsSync(outDir)) {
      mkdirSync(outDir, { recursive: true });
    }

    return esbuild.build({
      entryPoints: [file],
      bundle: false,
      platform: 'node',
      target: 'node18',
      format: 'cjs',
      outfile: outPath,
      minify: false,
      sourcemap: false,
      logLevel: 'silent',
    }).catch(err => {
      console.error(`Failed to build ${file}:`, err.message);
      throw err;
    });
  })
)
.then(() => {
  console.log('✓ Build completed successfully!');
})
.catch(error => {
  console.error('✗ Build failed:', error.message);
  process.exit(1);
});

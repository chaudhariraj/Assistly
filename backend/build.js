// Try esbuild first, fallback to TypeScript if esbuild not available
const { execSync } = require('child_process');

function tryEsbuild() {
  try {
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
    function findTsFiles(dir, fileList = []) {
      const files = readdirSync(dir);
      files.forEach(file => {
        const filePath = join(dir, file);
        if (statSync(filePath).isDirectory()) {
          findTsFiles(filePath, fileList);
        } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
          fileList.push(filePath);
        }
      });
      return fileList;
    }

    const srcDir = join(__dirname, 'src');
    const tsFiles = findTsFiles(srcDir);

    console.log(`Compiling ${tsFiles.length} files with esbuild...`);

    // Build all files
    return Promise.all(
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
        });
      })
    ).then(() => {
      // Copy schema.sql to dist
      const { copyFileSync } = require('fs');
      const schemaSrc = join(__dirname, 'src', 'db', 'schema.sql');
      const schemaDest = join(distDir, 'db', 'schema.sql');
      if (existsSync(schemaSrc)) {
        if (!existsSync(dirname(schemaDest))) {
          mkdirSync(dirname(schemaDest), { recursive: true });
        }
        copyFileSync(schemaSrc, schemaDest);
        console.log('✓ Copied schema.sql to dist');
      }
      console.log('✓ Build completed with esbuild!');
      return true;
    });
  } catch (err) {
    return false;
  }
}

// Try esbuild, fallback to tsc
tryEsbuild().then(success => {
  if (!success) {
    console.log('esbuild not available, using TypeScript compiler...');
    try {
      execSync('npx tsc --incremental --skipLibCheck', {
        cwd: __dirname,
        stdio: 'inherit',
        env: { 
          ...process.env, 
          NODE_OPTIONS: '--max-old-space-size=1536'
        }
      });
      console.log('✓ Build completed with TypeScript!');
    } catch (error) {
      console.error('✗ Build failed');
      process.exit(1);
    }
  }
}).catch(err => {
  console.error('✗ Build failed:', err.message);
  process.exit(1);
});

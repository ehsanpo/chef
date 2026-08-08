const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 [1/3] Building React Frontend with Vite...');
execSync('npm run build', { stdio: 'inherit' });

console.log('📂 [2/3] Copying web build assets to desktop/frontend...');
const srcDir = path.join(__dirname, '..', 'dist');
const dstDir = path.join(__dirname, '..', 'desktop', 'frontend');

if (fs.existsSync(dstDir)) {
  fs.rmSync(dstDir, { recursive: true, force: true });
}
fs.cpSync(srcDir, dstDir, { recursive: true });

console.log('🔨 [3/3] Compiling standalone Desktop EXE with Go/Wails...');
const desktopDir = path.join(__dirname, '..', 'desktop');
execSync('go build -buildvcs=false -ldflags "-s -w" -o ChefGame.exe .', {
  cwd: desktopDir,
  stdio: 'inherit'
});

const exePath = path.join(desktopDir, 'ChefGame.exe');
if (fs.existsSync(exePath)) {
  const stats = fs.statSync(exePath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`\n✅ SUCCESS! Standalone Desktop App Built:`);
  console.log(`   Location : ${exePath}`);
  console.log(`   Size     : ${sizeMB} MB\n`);
} else {
  console.error('❌ Build failed: ChefGame.exe not found.');
  process.exit(1);
}

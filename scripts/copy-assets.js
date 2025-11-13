import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');
const sourceDir = path.join(projectRoot, 'public', 'assets');
const destDir = path.join(projectRoot, 'dist', 'public', 'assets');

// Ensure destination directory exists
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

// Copy all .mp4 files
if (fs.existsSync(sourceDir)) {
  const files = fs.readdirSync(sourceDir);
  files.forEach(file => {
    if (file.endsWith('.mp4') || file.endsWith('.webm')) {
      const src = path.join(sourceDir, file);
      const dest = path.join(destDir, file);
      fs.copyFileSync(src, dest);
      console.log(`✓ Copied ${file} to dist/public/assets/`);
    }
  });
} else {
  console.log('⚠️ public/assets directory not found, skipping video copy');
}

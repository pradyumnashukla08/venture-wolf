const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src');

function walkDir(currentPath) {
  const files = fs.readdirSync(currentPath);
  for (const file of files) {
    const fullPath = path.join(currentPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // We don't want to replace inside ProfileContext itself just yet
      if (fullPath.includes('ProfileContext.tsx')) continue;
      
      let modified = false;
      
      if (content.includes("from '../context/ProfileContext'")) {
        content = content.replace(/import \{ useProfile \} from '\.\.\/context\/ProfileContext';/g, "import { useProfileStore } from '../store/useProfileStore';");
        modified = true;
      }
      
      if (content.includes("useProfile()")) {
        content = content.replace(/useProfile\(\)/g, "useProfileStore()");
        modified = true;
      }

      if (modified) {
        fs.writeFileSync(fullPath, content);
        console.log('Updated', fullPath);
      }
    }
  }
}

walkDir(dir);

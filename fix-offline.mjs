import fs from 'fs';
import path from 'path';

const dir = 'd:/farm-management-system/src/lib/offline/repositories';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts'));

for (const file of files) {
  const p = path.join(dir, file);
  let content = fs.readFileSync(p, 'utf8');
  let originalContent = content;

  // Fix getAll
  content = content.replace(
    /let onlineData:\s*any\[\]\s*=\s*\[\];\s*if\s*\(navigator\.onLine\)\s*\{\s*try\s*\{([\s\S]*?)\}\s*catch\s*\(err\)\s*\{\s*console\.warn\('Online fetch failed[^']*',\s*err\);\s*\}\s*\}/g,
    (match, p1) => {
      let inner = p1;
      inner = inner.replace(/\?t=\$\{Date\.now\(\)\}/g, '');
      inner = inner.replace(/&t=\$\{Date\.now\(\)\}/g, '');
      inner = inner.replace(/fetch\(([^,)]+)\)/g, 'fetch($1, { headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" } })');
      
      return `let onlineData: any[] = [];\n    try {${inner}} catch (err) {\n      console.warn('Online fetch failed, falling back to local DB', err);\n    }`;
    }
  );

  // Fix getById or others that don't declare onlineData right before
  content = content.replace(
    /if\s*\(navigator\.onLine\)\s*\{\s*try\s*\{([\s\S]*?)\}\s*catch\s*\(err\)\s*\{\s*console\.warn\('Online fetch failed[^']*'(?:,\s*err)?\);\s*\}\s*\}/g,
    (match, p1) => {
      let inner = p1;
      inner = inner.replace(/\?t=\$\{Date\.now\(\)\}/g, '');
      inner = inner.replace(/&t=\$\{Date\.now\(\)\}/g, '');
      inner = inner.replace(/fetch\(([^,)]+)\)/g, 'fetch($1, { headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" } })');
      
      return `try {${inner}} catch (err) {\n      console.warn('Online fetch failed', err);\n    }`;
    }
  );

  if (content !== originalContent) {
    fs.writeFileSync(p, content);
    console.log(`Updated ${file}`);
  }
}

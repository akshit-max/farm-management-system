import fs from 'fs';
import path from 'path';

const dir = 'd:/farm-management-system/src/lib/offline/repositories';
const files = fs.readdirSync(dir).filter(f => f.endsWith('Repository.ts'));

for (const file of files) {
  const p = path.join(dir, file);
  let content = fs.readFileSync(p, 'utf8');
  
  // Replace fetch("/api/something") with fetch(`/api/something?t=${Date.now()}`)
  // Skip if already contains ?t= or &t=
  let newContent = content.replace(/fetch\("(\/api\/[^"?]+)"\)/g, "fetch(`$1?t=${Date.now()}`)");
  
  // Replace fetch('/api/something') with fetch(`/api/something?t=${Date.now()}`)
  newContent = newContent.replace(/fetch\('(\/api\/[^'?]+)'\)/g, "fetch(`$1?t=${Date.now()}`)");
  
  // Replace fetch(`/api/something`) with fetch(`/api/something?t=${Date.now()}`)
  // Be careful if it has variables: fetch(`/api/customers/${id}/ledger`)
  newContent = newContent.replace(/fetch\(`(\/api\/[^`?]+)`\)/g, "fetch(`$1?t=${Date.now()}`)");
  
  if (content !== newContent) {
    fs.writeFileSync(p, newContent);
    console.log(`Updated ${file}`);
  }
}

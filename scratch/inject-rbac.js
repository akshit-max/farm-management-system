const fs = require('fs');
const path = require('path');

const apiDirs = [
  'animal-categories',
  'stages',
  'rooms',
  'animal-batches',
  'vaccinations',
  'mortalities'
];

const basePath = path.join(__dirname, 'src', 'app', 'api');

function processFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // 1. Add import if missing
  if (!content.includes('import { isManager } from "@/lib/rbac"')) {
    content = content.replace('import { auth } from "@/auth";', 'import { auth } from "@/auth";\nimport { isManager } from "@/lib/rbac";');
  }

  // 2. Add isManager check to POST, PUT, DELETE
  // We'll use Regex to replace all occurrences.
  const regex1 = /if \(!session\?\.user\?\.id \|\| !farmId\) \{\n\s*return NextResponse\.json\(\{ error: "Unauthorized or no farm assigned" \}, \{ status: 401 \}\);\n\s*\}/g;
  const replace1 = `if (!session?.user?.id || !farmId) {
    return NextResponse.json({ error: "Unauthorized or no farm assigned" }, { status: 401 });
  }
  if (!isManager(session)) return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });`;

  const regex2 = /if \(!session\?\.user\?\.id \|\| !farmId\) return NextResponse\.json\(\{ error: "Unauthorized" \}, \{ status: 401 \}\);/g;
  const replace2 = `if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isManager(session)) return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });`;

  let newContent = content.replace(regex1, replace1).replace(regex2, replace2);
  
  // Wait, replacing it everywhere means it ALSO replaces it inside GET.
  // We want GET to be accessible by WORKER too! 
  // Let's use a custom parser approach.
  
  const lines = newContent.split('\n');
  let inRestrictedMethod = false;
  let finalLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.includes('export async function GET')) {
      inRestrictedMethod = false;
    } else if (line.includes('export async function POST') || line.includes('export async function PUT') || line.includes('export async function DELETE')) {
      inRestrictedMethod = true;
    }
    
    // Check if we hit the authorization line AND we are in a restricted method AND we haven't already added isManager
    if (inRestrictedMethod && (line.includes('error: "Unauthorized or no farm assigned"') || line.includes('error: "Unauthorized"'))) {
      finalLines.push(line);
      // Determine if next line is already isManager check
      if (i + 1 < lines.length && !lines[i+1].includes('isManager(session)')) {
          // Check if it's the multi-line block end
          if (line.includes('}')) {
             finalLines.push('  if (!isManager(session)) return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });');
          } else if (lines[i+1].includes('}')) {
             finalLines.push(lines[i+1]); // The '}'
             finalLines.push('  if (!isManager(session)) return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });');
             i++; // skip the '}'
          } else {
             finalLines.push('  if (!isManager(session)) return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });');
          }
      }
    } else {
      finalLines.push(line);
    }
  }

  // Reload and restart fresh parsing to avoid double imports
  content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes('import { isManager } from "@/lib/rbac"')) {
    content = content.replace('import { auth } from "@/auth";', 'import { auth } from "@/auth";\nimport { isManager } from "@/lib/rbac";');
  }
  
  const rawLines = content.split('\n');
  finalLines = [];
  inRestrictedMethod = false;
  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    
    if (line.includes('export async function GET')) {
      inRestrictedMethod = false;
    } else if (line.includes('export async function POST') || line.includes('export async function PUT') || line.includes('export async function DELETE')) {
      inRestrictedMethod = true;
    }
    
    finalLines.push(line);
    
    // Inject logic
    if (inRestrictedMethod && line.includes('error: "Unauthorized"')) {
       if (i + 1 < rawLines.length && !rawLines[i+1].includes('isManager(session)')) {
           finalLines.push('  if (!isManager(session)) return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });');
       }
    } else if (inRestrictedMethod && line.includes('error: "Unauthorized or no farm assigned"')) {
       // Look for the closing brace if it's a multiline block
       if (rawLines[i+1].includes('}')) {
           finalLines.push(rawLines[i+1]);
           i++;
           if (i + 1 < rawLines.length && !rawLines[i+1].includes('isManager(session)')) {
              finalLines.push('  if (!isManager(session)) return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });');
           }
       }
    }
  }

  fs.writeFileSync(filePath, finalLines.join('\n'), 'utf8');
}

apiDirs.forEach(dir => {
  const routePath = path.join(basePath, dir, 'route.ts');
  const idRoutePath = path.join(basePath, dir, '[id]', 'route.ts');
  
  processFile(routePath);
  processFile(idRoutePath);
});

console.log('RBAC checks injected strictly into mutating methods!');

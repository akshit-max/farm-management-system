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

function injectRbac(filePath) {
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes('import { isManager } from "@/lib/rbac"')) {
     content = content.replace('import { auth } from "@/auth";', 'import { auth } from "@/auth";\nimport { isManager } from "@/lib/rbac";');
  }

  // The unauthorized lines vary. Usually they are:
  // if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // OR
  // if (!session?.user?.id || !farmId) {
  //   return NextResponse.json({ error: "Unauthorized or no farm assigned" }, { status: 401 });
  // }
  
  const lines = content.split('\n');
  let result = [];
  let inMutationMethod = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.includes('export async function GET')) {
      inMutationMethod = false;
    } else if (line.includes('export async function POST') || line.includes('export async function PUT') || line.includes('export async function DELETE')) {
      inMutationMethod = true;
    }

    result.push(line);

    if (inMutationMethod) {
      if (line.includes('return NextResponse.json({ error: "Unauthorized') && line.includes('status: 401')) {
         // Check if next line is already injected
         if (i + 1 < lines.length && !lines[i+1].includes('isManager(session)')) {
            // Check if this line ends with }
            if (line.includes('}')) {
                result.push('  if (!isManager(session)) return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });');
            } else if (i + 1 < lines.length && lines[i+1].trim() === '}') {
                // The brace is on the next line
                result.push(lines[i+1]);
                result.push('  if (!isManager(session)) return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });');
                i++; // skip next line
            } else {
                result.push('  if (!isManager(session)) return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });');
            }
         }
      }
    }
  }

  fs.writeFileSync(filePath, result.join('\n'), 'utf8');
}

apiDirs.forEach(dir => {
  const routePath = path.join(basePath, dir, 'route.ts');
  const idRoutePath = path.join(basePath, dir, '[id]', 'route.ts');
  injectRbac(routePath);
  injectRbac(idRoutePath);
});
console.log("RBAC fully injected!");

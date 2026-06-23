import fs from 'fs';
import path from 'path';

function scan(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      scan(p);
    } else if (f === 'route.ts') {
      const text = fs.readFileSync(p, 'utf8');
      if (text.includes('export async function GET')) {
        console.log('----');
        console.log(p);
        const lines = text.split('\n');
        let inGet = false;
        for (let l of lines) {
          if (l.includes('export async function GET')) inGet = true;
          if (l.includes('export async function POST') || l.includes('export async function PUT') || l.includes('export async function DELETE')) inGet = false;
          if (inGet && l.includes('NextResponse.json') && !l.includes('error:')) {
            console.log(l.trim());
          }
        }
      }
    }
  }
}
scan('src/app/api');

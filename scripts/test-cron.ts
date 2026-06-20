import { POST } from '../src/app/api/alerts/generate/route';

async function test() {
  const req = new Request('http://localhost:3000/api/alerts/generate', {
    method: 'POST',
    headers: {
      'authorization': 'Bearer TEST_SECRET'
    }
  });

  process.env.CRON_SECRET = 'TEST_SECRET';
  const res = await POST(req as any);
  console.log(await res.json());
}

test();

async function test() {
  try {
    const res = await fetch("http://127.0.0.1:3000/api/suppliers", {
      headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" }
    });
    console.log("--- NETWORK RESPONSE HEADERS FOR GET /api/suppliers ---");
    for (const [key, val] of res.headers.entries()) {
      console.log(`${key}: ${val}`);
    }
  } catch (err: any) {
    console.log("Fetch failed:", err.message);
  }
}
test();

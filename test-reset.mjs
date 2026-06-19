

const baseUrl = "http://localhost:3000";

async function testFlow() {
  console.log("Starting Password Reset Flow Test...");

  const testEmail = "test_reset_" + Date.now() + "@test.com";

  // 0. Create user
  console.log("Creating test user:", testEmail);
  const signupRes = await fetch(baseUrl + "/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ownerName: "Reset Tester", email: testEmail, password: "password123", farmName: "Reset Farm" })
  });
  console.log("Signup:", await signupRes.json());

  // 1. Request password reset
  const req1 = await fetch(baseUrl + "/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: testEmail })
  });
  const res1 = await req1.json();
  console.log("Forgot Password Response:", res1);
  
  if (!res1._devToken) {
    console.log("No token generated!");
    return;
  }

  const token = res1._devToken;

  // 2. Use token to reset password
  const req2 = await fetch(baseUrl + "/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, newPassword: "newsecurepassword" })
  });
  const res2 = await req2.json();
  console.log("Reset Password Response:", res2);
}

testFlow().catch(console.error);

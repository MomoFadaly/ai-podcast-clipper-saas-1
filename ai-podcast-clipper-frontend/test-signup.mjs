import dotenv from "dotenv";

// Load environment variables
dotenv.config();

console.log("Testing environment variables:");
console.log("DATABASE_URL exists:", !!process.env.DATABASE_URL);
console.log("STRIPE_SECRET_KEY exists:", !!process.env.STRIPE_SECRET_KEY);
console.log(
  "STRIPE_SECRET_KEY starts with:",
  process.env.STRIPE_SECRET_KEY?.substring(0, 10),
);

// Test signup
const testEmail = "test@example.com";
const testPassword = "testpassword123";

console.log("\n🧪 Testing signup with:", testEmail);

// We'll make a direct HTTP request to the signup functionality
const response = await fetch("http://localhost:3000/signup", {
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
  },
  body: new URLSearchParams({
    email: testEmail,
    password: testPassword,
  }),
});

console.log("Response status:", response.status);
console.log(
  "Response headers:",
  Object.fromEntries(response.headers.entries()),
);

if (response.ok) {
  console.log("✅ Signup request successful!");
} else {
  console.log("❌ Signup request failed");
  const text = await response.text();
  console.log("Response text preview:", text.substring(0, 500));
}

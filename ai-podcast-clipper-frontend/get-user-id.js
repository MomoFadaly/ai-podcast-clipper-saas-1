import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function getUserId() {
  console.log("🔍 Getting a real user ID from database...");

  const user = await prisma.user.findFirst({
    select: {
      id: true,
      email: true,
      name: true,
    },
  });

  if (!user) {
    console.log("❌ No users found in database");
    return;
  }

  console.log("✅ Found user:");
  console.log("ID:", user.id);
  console.log("Email:", user.email);
  console.log("Name:", user.name);

  return user.id;
}

getUserId()
  .then((userId) => {
    console.log("\n📋 Use this user ID for testing:", userId);
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Failed to get user ID:", error);
    process.exit(1);
  });

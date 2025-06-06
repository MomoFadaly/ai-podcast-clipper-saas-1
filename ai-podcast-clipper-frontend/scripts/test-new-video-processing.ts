#!/usr/bin/env node
import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const db = new PrismaClient();

// This is a placeholder user ID. Replace with a real user ID from your database.
const TEST_USER_ID = "user_2gL4JqDGF1HTKzB2w3Bq4jwQ1eA";

async function main() {
  console.log("🧪 Starting test: Create a new UploadedFile record...");

  if (!TEST_USER_ID || TEST_USER_ID.startsWith("user_")) {
    console.error(
      "❌ CRITICAL: Please replace TEST_USER_ID with a real user ID from your database.",
    );
    return;
  }

  const testVideoId = "test-video-" + Date.now();
  const testS3Key = `test/${testVideoId}.mp4`;

  try {
    const newFile = await db.uploadedFile.create({
      data: {
        id: testVideoId,
        s3Key: testS3Key,
        displayName: "Test Video " + new Date().toLocaleTimeString(),
        userId: TEST_USER_ID,
        status: "queued",
        uploaded: true,
      },
    });
    console.log("✅ Test project created with ID:", newFile.id);
  } catch (error: any) {
    console.error("❌ Failed to create test project:", error.message);
    if (error.message.includes("Foreign key constraint")) {
      console.log("ℹ️ You need to use a real user ID from your database");
      console.log("ℹ️ Check your User table for existing user IDs");
    }
  } finally {
    await db.$disconnect();
  }
}

main().catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});

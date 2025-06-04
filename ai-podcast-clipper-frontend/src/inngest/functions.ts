import { env } from "~/env";
import { inngest } from "./client";
import { db } from "~/server/db";

export const processVideo = inngest.createFunction(
  {
    id: "process-video",
    retries: 1,
    concurrency: {
      limit: 1,
      key: "event.data.userId",
    },
  },
  { event: "process-video-events" },
  async ({ event, step }) => {
    const { uploadedFileId, chunks } = event.data as {
      uploadedFileId: string;
      userId: string;
      chunks: Array<{ start: number; end: number }>;
    };

    try {
      const { userId, credits, s3Key } = await step.run(
        "check-credits",
        async () => {
          const uploadedFile = await db.uploadedFile.findUniqueOrThrow({
            where: {
              id: uploadedFileId,
            },
            select: {
              User: {
                select: {
                  id: true,
                  credits: true,
                },
              },
              s3Key: true,
            },
          });

          return {
            userId: uploadedFile.User.id,
            credits: uploadedFile.User.credits,
            s3Key: uploadedFile.s3Key,
          };
        },
      );
      console.log("[Inngest] DB lookup result:", { userId, credits, s3Key });

      // Robust error handling and logging for pre-create Clip logic
      try {
        if (chunks && chunks.length > 0) {
          const s3KeyDir = s3Key.substring(0, s3Key.lastIndexOf("/"));
          const clipData = [];
          for (let i = 0; i < chunks.length; i++) {
            const clipS3Key = `${s3KeyDir}/clip_${i}.mp4`;
            clipData.push({
              id: crypto.randomUUID(),
              s3Key: clipS3Key,
              uploadedFileId,
              userId,
              updatedAt: new Date(),
            });
          }
          // await db.clip.createMany({ data: clipData }); // TEMPORARILY DISABLED
          console.log(
            `(TEMP DISABLED) Would pre-create ${chunks.length} Clip records in database`,
            clipData,
          );
        }
      } catch (err) {
        console.error("[Inngest] Error in pre-create Clip logic:", err);
        throw err;
      }

      if (credits > 0) {
        console.log("[Inngest] User has credits, proceeding to Modal call");
        await step.run("set-status-processing", async () => {
          await db.uploadedFile.update({
            where: {
              id: uploadedFileId,
            },
            data: {
              status: "processing",
            },
          });
        });

        const modalResult = await step.run("process-with-modal", async () => {
          const payload = {
            s3_key: s3Key,
            chunks,
          };
          console.log(
            "[Inngest] Calling Modal endpoint:",
            env.PROCESS_VIDEO_ENDPOINT,
          );
          console.log(
            "[Inngest] Auth token present:",
            Boolean(env.PROCESS_VIDEO_ENDPOINT_AUTH),
          );
          console.log("[Inngest] Payload:", JSON.stringify(payload));
          try {
            const response = await fetch(env.PROCESS_VIDEO_ENDPOINT, {
              method: "POST",
              body: JSON.stringify(payload),
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${env.PROCESS_VIDEO_ENDPOINT_AUTH}`,
              },
            });
            console.log("[Inngest] Modal response status:", response.status);
            let responseBody;
            try {
              responseBody = await response.text();
              console.log("[Inngest] Modal response body:", responseBody);
            } catch (e) {
              console.log("[Inngest] Could not read Modal response body:", e);
            }
            if (!response.ok) {
              throw new Error(
                `Modal API failed with status: ${response.status} - ${responseBody}`,
              );
            }
            return responseBody ? JSON.parse(responseBody) : {};
          } catch (err) {
            console.error("[Inngest] Error calling Modal:", err);
            throw err;
          }
        });

        console.log("[Inngest] Modal processing result:", modalResult);

        const { clipsFound } = await step.run(
          "create-clips-in-db",
          async () => {
            const clipsProcessed = modalResult.clips_processed ?? 0;
            const transcription = modalResult.transcription;

            if (clipsProcessed > 0) {
              console.log(
                `Creating ${clipsProcessed} clip records in database`,
              );

              const s3KeyDir = s3Key.substring(0, s3Key.lastIndexOf("/"));
              const clipData = [];

              for (let i = 0; i < clipsProcessed; i++) {
                const clipS3Key = `${s3KeyDir}/clip_${i}.mp4`;
                clipData.push({
                  id: crypto.randomUUID(),
                  s3Key: clipS3Key,
                  uploadedFileId,
                  userId,
                  transcription: transcription,
                  updatedAt: new Date(),
                });
              }

              await db.clip.createMany({
                data: clipData,
              });

              console.log(
                "✅ Clip records created successfully with transcription data",
              );
            }

            return { clipsFound: clipsProcessed };
          },
        );

        await step.run("deduct-credits", async () => {
          await db.user.update({
            where: {
              id: userId,
            },
            data: {
              credits: {
                decrement: Math.min(credits, clipsFound),
              },
            },
          });
        });

        await step.run("set-status-processed", async () => {
          await db.uploadedFile.update({
            where: {
              id: uploadedFileId,
            },
            data: {
              status: "processed",
            },
          });
        });
      } else {
        console.log("[Inngest] User has no credits, skipping Modal call");
        await step.run("set-status-no-credits", async () => {
          await db.uploadedFile.update({
            where: {
              id: uploadedFileId,
            },
            data: {
              status: "no credits",
            },
          });
        });
      }
    } catch (error: unknown) {
      console.error(
        "[Inngest] Processing error:",
        error,
        error instanceof Error ? error.stack : "",
      );
      await db.uploadedFile.update({
        where: {
          id: uploadedFileId,
        },
        data: {
          status: "failed",
        },
      });
      throw error;
    }
  },
);

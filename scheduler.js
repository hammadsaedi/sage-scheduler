// scheduler.js
import mongoose from "mongoose";
import cron from "node-cron";
import ScheduledPost from "./model/ScheduledPost.js";
import { postToInstagram, carouselPostToInstagram, postReelToInstagram, postStoryToInstagram } from "./instagram-actions.js";
import "dotenv/config";

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || "your-mongo-uri", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Poll every minute
cron.schedule("* * * * *", async () => {
  console.log("Checking scheduled posts...");
  const now = new Date();

  try {
    const duePosts = await ScheduledPost.find({
      scheduledFor: { $lte: now },
      status: "scheduled",
    });

    if (duePosts.length === 0) {
      console.log("No posts due.");
      return;
    }

    for (const post of duePosts) {
      console.log(`Processing post ${post._id} (type: ${post.type})`);
      try {
        let result;
        const user_id = post.accountId;

        switch (post.type) {
          case "single":
            try {
              result = await postToInstagram(post.mediaUrls[0], post.caption, user_id);
            } catch (error) {
              result = { success: false, error: error.message || "Posting failed" };
            }
            break;
          case "carousel":
            try {
              result = await carouselPostToInstagram(post.mediaUrls, post.caption, user_id);
            } catch (error) {
              result = { success: false, error: error.message || "Posting failed" };
            }
            break;
          case "reel":
            result = await postReelToInstagram(post.mediaUrls[0], post.caption, user_id);
            break;
          case "story":
            result = await postStoryToInstagram(
              post.mediaUrls[0],
              post.mediaUrls[0].includes("video") ? "video" : "image",
              user_id
            );
            break;
          default:
            throw new Error(`Unsupported post type: ${post.type}`);
        }

        if (!result.success) {
          throw new Error(result.error || "Posting failed");
        }

        await ScheduledPost.updateOne(
          { _id: post._id },
          {
            $set: {
              status: "published",
              postId: result.post_id,
              updatedAt: new Date(),
            },
          }
        );
        console.log(`Post ${post._id} published successfully with Instagram ID: ${result.post_id}`);
      } catch (error) {
        console.error(`Error posting ${post._id}:`, error);
        await ScheduledPost.updateOne(
          { _id: post._id },
          {
            $set: {
              status: "failed",
              error: error.message || "Unknown error",
              updatedAt: new Date(),
            },
          }
        );
        console.log(`Post ${post._id} marked as failed`);
      }
    }
  } catch (error) {
    console.error("Error in scheduler:", error);
  }
});

console.log("Scheduler started...");
process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log("MongoDB connection closed.");
  process.exit(0);
});
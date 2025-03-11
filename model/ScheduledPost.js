// model/ScheduledPost.js
import mongoose from "mongoose";

const scheduledPostSchema = new mongoose.Schema(
  {
    accountId: { type: String, required: true, index: true },
    type: { type: String, enum: ["single", "carousel", "reel", "story"], required: true },
    caption: { type: String, required: true },
    scheduledFor: { type: Date, required: true, index: true },
    mediaUrls: { type: [String], required: true },
    mediaCount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["scheduled", "processing", "published", "failed"],
      default: "scheduled",
    },
    postId: { type: String },
    error: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.models.ScheduledPost || mongoose.model("ScheduledPost", scheduledPostSchema);
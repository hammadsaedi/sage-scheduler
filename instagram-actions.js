// instagram-actions.js
import mongoose from "mongoose";
import axios from "axios";
import InstagramCredentials from "./model/InstagramCredentials.js";

async function connectToMongo() {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI || "your-mongo-uri", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  }
}

export async function postToInstagram(imageUrl, caption, user_id) {
  try {
    await connectToMongo();
    const credentials = await InstagramCredentials.findOne({ user_id });
    if (!credentials) throw new Error("Instagram account not found");
    const mediaResponse = await axios.post(
      `https://graph.instagram.com/v22.0/${user_id}/media`,
      { image_url: imageUrl, caption, access_token: credentials.access_token }
    );
    const mediaId = mediaResponse.data.id;
    if (!mediaId) throw new Error("Failed to create media object");
    const publishResponse = await axios.post(
      `https://graph.instagram.com/v22.0/${user_id}/media_publish`,
      { creation_id: mediaId, access_token: credentials.access_token }
    );
    return { success: true, post_id: publishResponse.data.id };
  } catch (error) {
    console.error("Error posting to Instagram:", error);
    throw error;
  }
}

export async function carouselPostToInstagram(imageUrls, caption, user_id) {
  try {
    await connectToMongo();
    const credentials = await InstagramCredentials.findOne({ user_id });
    if (!credentials) throw new Error("Instagram account not found");
    const accessToken = credentials.access_token;
    const containerIds = [];
    for (const imageUrl of imageUrls) {
      const mediaResponse = await axios.post(
        `https://graph.instagram.com/v22.0/${user_id}/media`,
        { image_url: imageUrl, is_carousel_item: true, access_token: accessToken },
        { headers: { "Content-Type": "application/json" } }
      );
      if (!mediaResponse.data.id) throw new Error(`Failed to create media container for ${imageUrl}`);
      containerIds.push(mediaResponse.data.id);
    }
    const carouselResponse = await axios.post(
      `https://graph.instagram.com/v22.0/${user_id}/media`,
      { caption, media_type: "CAROUSEL", children: containerIds.join(","), access_token: accessToken },
      { headers: { "Content-Type": "application/json" } }
    );
    const carouselContainerId = carouselResponse.data.id;
    if (!carouselContainerId) throw new Error("Failed to create carousel container");
    const publishResponse = await axios.post(
      `https://graph.instagram.com/v22.0/${user_id}/media_publish`,
      { creation_id: carouselContainerId, access_token: accessToken },
      { headers: { "Content-Type": "application/json" } }
    );
    return { success: true, post_id: publishResponse.data.id };
  } catch (error) {
    console.error("Error publishing carousel:", error);
    throw error;
  }
}

export async function postReelToInstagram(videoUrl, caption, user_id) {
  try {
    await connectToMongo();
    const credentials = await InstagramCredentials.findOne({ user_id });
    if (!credentials) throw new Error("Instagram account not found");
    const accessToken = credentials.access_token;
    const mediaResponse = await axios.post(
      `https://graph.instagram.com/v22.0/${user_id}/media`,
      { media_type: "REELS", video_url: videoUrl, caption, access_token: accessToken },
      { headers: { "Content-Type": "application/json" } }
    );
    const mediaId = mediaResponse.data.id;
    if (!mediaId) throw new Error("Failed to create media object");
    let statusCode = "IN_PROGRESS";
    const maxAttempts = 30;
    let attempts = 0;
    while (statusCode !== "FINISHED" && attempts < maxAttempts) {
      const statusResponse = await axios.get(`https://graph.instagram.com/v22.0/${mediaId}`, {
        params: { fields: "status_code", access_token: accessToken },
      });
      statusCode = statusResponse.data.status_code;
      if (statusCode === "ERROR") throw new Error("Media processing failed");
      if (statusCode !== "FINISHED") {
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 10000));
      }
    }
    if (statusCode !== "FINISHED") throw new Error("Media processing timed out");
    const publishResponse = await axios.post(
      `https://graph.instagram.com/v22.0/${user_id}/media_publish`,
      { creation_id: mediaId, access_token: accessToken },
      { headers: { "Content-Type": "application/json" } }
    );
    return { success: true, post_id: publishResponse.data.id };
  } catch (error) {
    console.error("Error posting reel:", error);
    return { success: false, error: error.message || "Unknown error" };
  }
}

export async function postStoryToInstagram(mediaUrl, mediaType, user_id) {
  try {
    await connectToMongo();
    const credentials = await InstagramCredentials.findOne({ user_id });
    if (!credentials) throw new Error("Instagram account not found");
    const accessToken = credentials.access_token;
    const mediaPayload = { media_type: "STORIES", access_token: accessToken };
    if (mediaType === "image") mediaPayload.image_url = mediaUrl;
    else mediaPayload.video_url = mediaUrl;
    const mediaResponse = await axios.post(
      `https://graph.instagram.com/v22.0/${user_id}/media`,
      mediaPayload,
      { headers: { "Content-Type": "application/json" } }
    );
    const mediaId = mediaResponse.data.id;
    if (!mediaId) throw new Error("Failed to create media object");
    if (mediaType === "video") {
      let statusCode = "IN_PROGRESS";
      const maxAttempts = 12;
      let attempts = 0;
      while (statusCode !== "FINISHED" && attempts < maxAttempts) {
        const statusResponse = await axios.get(`https://graph.instagram.com/v22.0/${mediaId}`, {
          params: { fields: "status_code", access_token: accessToken },
        });
        statusCode = statusResponse.data.status_code;
        if (statusCode === "ERROR") throw new Error("Video processing failed");
        if (statusCode !== "FINISHED") {
          attempts++;
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      }
      if (statusCode !== "FINISHED") throw new Error("Video processing timed out");
    } else {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    const publishResponse = await axios.post(
      `https://graph.instagram.com/v22.0/${user_id}/media_publish`,
      { creation_id: mediaId, access_token: accessToken },
      { headers: { "Content-Type": "application/json" } }
    );
    return { success: true, post_id: publishResponse.data.id };
  } catch (error) {
    console.error("Error posting story:", error);
    return { success: false, error: error.message || "Unknown error" };
  }
}
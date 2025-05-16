import { GoogleGenAI } from "@google/genai";
// import { createWriteStream } from "fs"; // Not needed if we only return the URI
// import { Readable } from "stream"; // Not needed if we only return the URI

// Ensure your VITE_GEMINI_API_KEY is set in your environment variables
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
if (!apiKey) {
  console.error("VITE_GEMINI_API_KEY is not set. Video generation will fail.");
}
const ai = new GoogleGenAI({ apiKey });

/**
 * Generates a video using Veo 2 based on a text prompt.
 * @param {string} prompt - The text prompt for the video.
 * @param {object} config - Optional configuration for video generation.
 * @returns {Promise<string>} - A promise that resolves to the URI of the generated video.
 */
export const generateVideoWithVeo = async (prompt, config = {}) => {
  if (!apiKey) {
    throw new Error("Gemini API Key is not configured.");
  }
  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
    throw new Error("A valid prompt string is required.");
  }

  console.log(`Starting video generation with prompt: "${prompt}"`);

  try {
    let operation = await ai.models.generateVideos({
      model: "veo-2.0-generate-001",
      prompt: prompt,
      config: {
        personGeneration: "dont_allow", // Default, can be overridden by config
        aspectRatio: "16:9",         // Default, can be overridden by config
        numberOfVideos: 1,             // We only need one video for the hero
        durationSeconds: 6,            // Default 5-8s, let's pick 6s
        ...config, // Allow overriding defaults
      },
    });

    console.log("Video generation operation started:", operation.name);

    // Poll for completion
    while (!operation.done) {
      console.log(`Polling operation ${operation.name}, current status: ${operation.metadata?.state || 'UNKNOWN'}`);
      await new Promise((resolve) => setTimeout(resolve, 10000)); // Poll every 10 seconds
      operation = await ai.operations.getVideosOperation({
        operation: operation, // Pass the whole operation object
      });
    }

    console.log("Video generation operation completed:", operation.name, "Done:", operation.done);

    if (operation.error) {
      console.error("Error during video generation operation:", operation.error);
      throw new Error(`Video generation failed: ${operation.error.message || 'Unknown error'}`);
    }
    
    const generatedVideos = operation.response?.generatedVideos;
    if (generatedVideos && generatedVideos.length > 0 && generatedVideos[0].video?.uri) {
      const baseVideoUri = generatedVideos[0].video.uri;
      // The URI from Veo requires the API key appended for direct access, as per documentation.
      const videoUriWithKey = `${baseVideoUri}&key=${apiKey}`;
      console.log("Generated video URI (with key appended):", videoUriWithKey);
      return videoUriWithKey; 
    } else {
      console.error("No video URI found in the response:", operation.response);
      throw new Error("Video generation completed, but no video URI was returned.");
    }
  } catch (error) {
    console.error("Failed to generate video with Veo:", error);
    // More specific error handling based on error type if needed
    if (error.message && error.message.includes("Quota")) {
        throw new Error("Video generation failed due to quota limits. Please check your Google Cloud project quotas.");
    }
    if (error.message && error.message.includes("API key not valid")) {
        throw new Error("Video generation failed due to an invalid API key. Please check your VITE_GEMINI_API_KEY.");
    }
    throw error; // Re-throw the original or a new error
  }
};

// Example usage (for testing purposes, can be removed)
/*
async function testVeo() {
  try {
    const prompt = "A serene beach at sunset with gentle waves.";
    console.log(`Testing Veo with prompt: "${prompt}"`);
    const videoUrl = await generateVideoWithVeo(prompt);
    console.log("Test successful. Video URL:", videoUrl);
  } catch (error) {
    console.error("Test failed:", error.message);
  }
}
// testVeo(); 
*/

/**
 * Generates a video using Veo 2 from a text prompt and an initial image.
 * @param {string} prompt - The text prompt for the video.
 * @param {string} base64ImageData - Base64 encoded string of the initial image.
 * @param {string} mimeType - MIME type of the initial image (e.g., 'image/jpeg', 'image/png').
 * @param {object} config - Optional configuration for video generation.
 * @returns {Promise<string>} - A promise that resolves to the URI of the generated video (with API key).
 */
export const generateVideoWithVeoFromImage = async (prompt, base64ImageData, mimeType, config = {}) => {
  if (!apiKey) {
    throw new Error("Gemini API Key is not configured.");
  }
  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
    throw new Error("A valid prompt string is required.");
  }
  if (!base64ImageData || typeof base64ImageData !== 'string') {
    throw new Error("Valid base64 image data string is required.");
  }
  if (!mimeType || typeof mimeType !== 'string') {
    throw new Error("Valid image MIME type string is required.");
  }

  console.log(`Starting image-to-video generation with prompt: "${prompt}" and image (mimeType: ${mimeType})`);

  try {
    const videoGenerationPayload = {
      model: "veo-2.0-generate-001",
      prompt: prompt,
      image: {
        imageBytes: base64ImageData,
        mimeType: mimeType,
      },
      config: {
        personGeneration: "dont_allow", // Default, can be overridden by config
        aspectRatio: "16:9",         // Default, can be overridden by config
        numberOfVideos: 1,             // We only need one video
        durationSeconds: 6,            // Default 5-8s, let's pick 6s
        ...config, // Allow overriding defaults
      },
    };

    console.log("Veo image-to-video payload (excluding imageBytes):", { ...videoGenerationPayload, image: { mimeType: videoGenerationPayload.image.mimeType, imageBytes: '...' }});


    let operation = await ai.models.generateVideos(videoGenerationPayload);

    console.log("Image-to-video generation operation started:", operation.name);

    // Poll for completion
    while (!operation.done) {
      console.log(`Polling operation ${operation.name}, current status: ${operation.metadata?.state || 'UNKNOWN'}`);
      await new Promise((resolve) => setTimeout(resolve, 10000)); // Poll every 10 seconds
      operation = await ai.operations.getVideosOperation({
        operation: operation,
      });
    }

    console.log("Image-to-video generation operation completed:", operation.name, "Done:", operation.done);

    if (operation.error) {
      console.error("Error during image-to-video generation operation:", operation.error);
      throw new Error(`Image-to-video generation failed: ${operation.error.message || 'Unknown error'}`);
    }
    
    const generatedVideos = operation.response?.generatedVideos;
    if (generatedVideos && generatedVideos.length > 0 && generatedVideos[0].video?.uri) {
      const baseVideoUri = generatedVideos[0].video.uri;
      const videoUriWithKey = `${baseVideoUri}&key=${apiKey}`;
      console.log("Generated image-to-video URI (with key appended):", videoUriWithKey);
      return videoUriWithKey;
    } else {
      console.error("No video URI found in the image-to-video response:", operation.response);
      throw new Error("Image-to-video generation completed, but no video URI was returned.");
    }
  } catch (error) {
    console.error("Failed to generate image-to-video with Veo:", error);
    if (error.message && error.message.includes("Quota")) {
        throw new Error("Image-to-video generation failed due to quota limits.");
    }
    if (error.message && error.message.includes("API key not valid")) {
        throw new Error("Image-to-video generation failed due to an invalid API key.");
    }
    throw error;
  }
};

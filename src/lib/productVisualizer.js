// src/lib/productVisualizer.js

import {
  GoogleGenAI,
  Modality, // Essential for specifying response types
  HarmCategory,
  HarmBlockThreshold,
} from "@google/genai";

// --- Configuration: API Key ---
// For Vite/frontend (ensure your build process handles this)
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  const errorMsg = "VITE_GEMINI_API_KEY is not set. Please check your .env file.";
  console.error(errorMsg);
  // In a browser environment, throwing here might be too disruptive.
  // Consider returning a specific error object or handling it in the calling component.
  // For now, let's throw to make it clear during development.
  throw new Error(errorMsg);
}

// --- Initialize the GoogleGenAI Client ---
const ai = new GoogleGenAI({ apiKey: API_KEY });
const imageGenerationModel = "gemini-2.0-flash-preview-image-generation";

// --- Helper Function: Convert Image Source to GenerativePart ---
async function imageToGenerativePart(imageSource, mimeTypeHint) {
  if (!imageSource) {
    throw new Error("Image source is undefined or null.");
  }

  let base64ImageData;
  let mimeType = mimeTypeHint;

  if (typeof imageSource === 'string' && (imageSource.startsWith('http://') || imageSource.startsWith('https://'))) {
    console.log(`Fetching image from URL: ${imageSource}`);
    const response = await fetch(imageSource);
    if (!response.ok) {
      throw new Error(`Failed to fetch image from ${imageSource}: ${response.statusText}`);
    }
    const blob = await response.blob();
    mimeType = blob.type || mimeType || 'image/jpeg'; // Use blob's type, then hint, then fallback
    base64ImageData = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result.split(',')[1]);
        } else {
          reject(new Error("FileReader did not return a string for URL image."));
        }
      };
      reader.onerror = (error) => reject(new Error(`FileReader failed for URL image: ${error}`));
      reader.readAsDataURL(blob);
    });
  } else if (typeof imageSource === 'string' && imageSource.startsWith('data:')) {
    console.log("Processing Data URL image.");
    try {
      const parts = imageSource.split(',');
      if (parts.length < 2) throw new Error("Invalid data URL structure.");
      const metaPart = parts[0];
      base64ImageData = parts[1];
      const mimeTypeMatch = metaPart.match(/:(.*?);/);
      if (!mimeTypeMatch || !mimeTypeMatch[1]) throw new Error("Could not parse MIME type from data URL.");
      mimeType = mimeTypeMatch[1];
    } catch (error) {
      console.error("Error parsing data URL:", imageSource, error);
      throw new Error(`Invalid data URL format: ${error.message}`);
    }
  } else if (typeof File !== 'undefined' && imageSource instanceof File) {
    console.log(`Processing File object: ${imageSource.name}`);
    mimeType = imageSource.type;
    base64ImageData = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result.split(',')[1]);
        } else {
          reject(new Error("FileReader did not return a string for File object."));
        }
      };
      reader.onerror = (error) => reject(new Error(`FileReader failed for File object: ${error}`));
      reader.readAsDataURL(imageSource);
    });
  } else if (typeof imageSource === 'string') {
    // This branch is for local file paths, primarily for Node.js.
    // It will likely not be used in a typical Vite frontend for user-provided images.
    // If imageSource is a string but not http/data, and not in Node, it's an issue.
    // The dynamic imports for 'node:fs/promises' and 'node:path' will fail in browser.
    // We can add a check or let it fail if this path is incorrectly reached in browser.
    // For robustness in browser, we might assume non-URL/DataURL strings are invalid if not File objects.
    console.warn(`Received string imageSource that is not a URL or Data URL: "${imageSource}". This path is intended for Node.js file paths.`);
    // Attempting to use Node.js specific part, will fail in browser.
    // This part of the guide's code is not directly browser-compatible.
    // For a pure frontend implementation, this branch might be removed or throw an error.
    // However, to adhere to the guide, I'm including it but noting its context.
    try {
        console.log(`Attempting to read image from local path (Node.js context): ${imageSource}`);
        const fs = await import('node:fs/promises'); 
        const imageBuffer = await fs.readFile(imageSource);
        base64ImageData = imageBuffer.toString('base64');
        const path = await import('node:path'); 
        const ext = path.extname(imageSource).toLowerCase();
        if (!mimeType) {
            if (ext === '.png') mimeType = 'image/png';
            else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
            else if (ext === '.webp') mimeType = 'image/webp';
            else if (ext === '.gif') mimeType = 'image/gif';
            else throw new Error(`Unsupported image extension or MIME type not provided for path: ${imageSource}`);
        }
    } catch (nodeError) {
        console.error("Failed to process string as Node.js file path (this is expected in browser):", nodeError);
        throw new Error("Unsupported string imageSource in browser. Must be URL or Data URL, or provide a File object.");
    }
  } else {
    throw new Error("Unsupported image source type. Provide a URL, Data URL, or File object.");
  }

  if (!base64ImageData) {
    throw new Error("Could not obtain base64 image data.");
  }
  if (!mimeType) {
    mimeType = 'image/jpeg'; 
    console.warn("MIME type could not be determined, defaulting to image/jpeg.");
  }
  
  const supportedMimeTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif'];
  if (!supportedMimeTypes.includes(mimeType)) {
    console.warn(`MIME type ${mimeType} may not be optimally supported. Supported types are: ${supportedMimeTypes.join(', ')}.`);
  }

  return {
    inlineData: {
      data: base64ImageData,
      mimeType: mimeType,
    },
  };
}

export async function generateProductVisualization({
  mainProduct,
  referenceSceneSource,
  additionalProducts = [],
  customInstructions = "",
}) {
  if (!mainProduct || !mainProduct.name || !mainProduct.imageSource) {
    throw new Error("Main product with name and imageSource is required.");
  }
  if (!referenceSceneSource) {
    throw new Error("Reference scene imageSource is required.");
  }

  const parts = [];
  let promptText = `Visually integrate the product named "${mainProduct.name}" into a scene inspired by the provided reference scene image.
The main product is described as: "${mainProduct.description || 'Not specified'}".
The reference scene image sets the style, lighting, and overall environment.
Make the main product the primary focus, well-lit, and naturally fitting the scene's perspective.
`;

  if (additionalProducts.length > 0) {
    promptText += "\nAlso, incorporate the following additional products naturally into the scene:\n";
    additionalProducts.forEach((p, index) => {
      promptText += `- Product ${index + 1}: "${p.name}" (Description: "${p.description || 'Not specified'}")\n`;
    });
  }

  if (customInstructions.trim() !== "") {
    promptText += `\nSpecific User Instructions: "${customInstructions.trim()}"\n`;
  }
  promptText += "\nPlease generate a high-quality, photorealistic image based on these instructions and the provided images. Also provide a brief text commentary about the generated image or any challenges encountered.";
  parts.push({ text: promptText });

  try {
    parts.push(await imageToGenerativePart(referenceSceneSource));
    parts.push(await imageToGenerativePart(mainProduct.imageSource));
    for (const p of additionalProducts) {
      if (p.imageSource) {
        try {
          parts.push(await imageToGenerativePart(p.imageSource));
        } catch (error) {
          console.warn(`Could not process image for additional product "${p.name}": ${error.message}. Skipping this image.`);
        }
      }
    }
  } catch (error) {
    throw new Error(`Failed to process one or more input images: ${error.message}`);
  }
  
  console.log("Constructed prompt parts. Total parts:", parts.length);

  try {
    const result = await ai.models.generateContent({ // result is GenerateContentResponse
      model: imageGenerationModel,
      contents: [{ role: "user", parts: parts }], 
      generationConfig: { temperature: 0.6, candidateCount: 1 },
      safetySettings: [ 
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      ],
      config: { 
        responseModalities: [Modality.TEXT, Modality.IMAGE],
      },
    });

    // Corrected: result from ai.models.generateContent IS the GenerateContentResponse
    const apiResponse = result; 
    if (!apiResponse) { // Check if the entire result is null/undefined
        console.error("Full API result from Gemini was undefined:", result);
        throw new Error("Invalid or empty response from Gemini API.");
    }
    // The actual response content (candidates, promptFeedback) is directly on apiResponse (which is `result`)
    // No, the user log shows that result IS GenerateContentResponse, which has candidates directly.
    // The SDK's `GenerateContentResult` has a `response` property which is `GenerateContentResponse`.
    // However, `ai.models.generateContent` might return `GenerateContentResponse` directly.
    // The user's log: `GenerateContentResponse {candidates: Array(1), ...}` was the value of `result` (logged as apiResponse in my error).
    // So, `apiResponse = result` is correct. Then `apiResponse.candidates` is correct.

    let imageUrl = null;
    let commentary = "No specific commentary from the model.";
    // The user log showed `result` (which was `apiResponse` in my `console.error`) was the `GenerateContentResponse`
    // So, logging `apiResponse` (which is now `result`) is correct.
    console.log("Full API response from Gemini:", JSON.stringify(apiResponse, null, 2));

    if (apiResponse.promptFeedback?.blockReason) {
      commentary = `Image generation may have been blocked. Reason: ${apiResponse.promptFeedback.blockReason}.`;
      console.warn(commentary);
    }

    const candidate = apiResponse.candidates?.[0];
    if (candidate) {
      if (candidate.finishReason && candidate.finishReason !== "STOP" && candidate.finishReason !== "MAX_TOKENS") {
        const finishMessage = `Generation stopped. Reason: ${candidate.finishReason}.`;
        commentary = commentary === "No specific commentary from the model." ? finishMessage : `${commentary}. ${finishMessage}`;
        console.warn(finishMessage);
      }
      if (candidate.content?.parts?.length > 0) {
        for (const part of candidate.content.parts) {
          if (part.text) {
            commentary = (commentary === "No specific commentary from the model." || !commentary.includes(part.text)) ? (commentary === "No specific commentary from the model." ? part.text : commentary + " " + part.text) : commentary;
          } else if (part.inlineData?.mimeType?.startsWith('image/')) {
            imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            console.log(`Image generated successfully. MIME type: ${part.inlineData.mimeType}`);
          }
        }
      }
    } else if (!apiResponse.promptFeedback?.blockReason) {
      commentary = commentary === "No specific commentary from the model." ? "No candidates returned by the model." : `${commentary}. Also, no candidates were returned.`;
    }
    
    if (!imageUrl && commentary === "No specific commentary from the model.") {
        commentary = "Image generation failed, and no specific reason or commentary was provided.";
    }

    return { imageUrl, commentary, promptUsed: promptText };
  } catch (error) {
    console.error("Error during Gemini API call or response processing:", error);
    let detailedMessage = error.message;
    if (error.response?.message) detailedMessage = error.response.message;
    else if (error.response) detailedMessage = JSON.stringify(error.response);
    throw new Error(`Product visualization failed: ${detailedMessage}`);
  }
}

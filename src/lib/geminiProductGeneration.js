import { GoogleGenAI, Modality, HarmCategory, HarmBlockThreshold } from "@google/genai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

// Added logoImageBase64 and logoMimeType parameters
export async function generateProductWithGemini(productType, storeName, logoImageBase64 = null, logoMimeType = 'image/png') {
  if (!API_KEY) {
    console.error("[geminiProductGeneration Function] VITE_GEMINI_API_KEY is not available.");
    throw new Error("Gemini API key is not configured.");
  }

  if (!productType || !storeName) {
    throw new Error("Product type and store name are required to generate a product.");
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });

  let prompt = `Generate a product for a store named "${storeName}" that sells ${productType}.
The product should include:
1. A catchy title.
2. A brief description (15-25 words).
3. A realistic price (e.g., 29.99, 45.00).
4. A visually appealing product image.

Return the text details (title, description, price) as a single JSON object in the text part of your response.
IMPORTANT: The text part of your response must contain ONLY this JSON object and NO other text, explanations, or conversational remarks. For example:
{
  "title": "Example Product Title",
  "description": "This is a fantastic example product, perfect for your needs and desires.",
  "price": "19.99"
}

Generate an image for this product in the image part of your response.`;

  const geminiContents = [];
  if (logoImageBase64) {
    prompt += `\n\nA logo image is also provided. Subtly incorporate this logo onto the product, its packaging, or in the scene if appropriate. For example, it could be a small brand mark on the item or a logo in the background if it's a lifestyle shot. Ensure the product remains the main focus.`;
    geminiContents.push({ text: prompt });
    geminiContents.push({ inlineData: { data: logoImageBase64, mimeType: logoMimeType } });
    console.log(`[geminiProductGeneration Function] Generating product with logo for type: ${productType}, store: ${storeName}`);
  } else {
    geminiContents.push({ text: prompt });
    console.log(`[geminiProductGeneration Function] Generating product without logo for type: ${productType}, store: ${storeName}`);
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-preview-image-generation", // This model supports image and text
      contents: geminiContents, // Use the constructed contents array
      safetySettings,
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
      },
    });

    let productTextDetails = null;
    let imageData = null;
    let rawTextResponse = "";

    if (response.candidates && response.candidates.length > 0 && response.candidates[0].content && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.text) {
          rawTextResponse += part.text;
          try {
            let jsonStringToParse = null;
            const trimmedText = part.text.trim();
            
            // Attempt to find JSON, whether it's wrapped in markdown, at the start, or at the end.
            // Strategy:
            // 1. Check for markdown-style JSON.
            // 2. If not found, find the first '{' and try to parse from there to its corresponding '}'.
            // 3. If that fails or isn't found, find the last '{' and try to parse from there. (Handles JSON at the end)

            const markdownJsonMatch = trimmedText.match(/```json\s*([\s\S]*?)\s*```/);
            if (markdownJsonMatch && markdownJsonMatch[1]) {
              jsonStringToParse = markdownJsonMatch[1];
            } else {
              // Try to find any substring that is a valid JSON object.
              // This is a common pattern: some text, then the JSON.
              // So, look for the last '{' which might start the JSON block.
              let firstBrace = trimmedText.indexOf('{');
              let lastBrace = trimmedText.lastIndexOf('{'); // Prefer JSON at the end if multiple '{'

              // Start search from lastBrace if it exists, otherwise from firstBrace
              let searchStartIndex = lastBrace !== -1 ? lastBrace : firstBrace;

              if (searchStartIndex !== -1) {
                let balance = 0;
                let endIndex = -1;
                // Iterate from the chosen brace to find its corresponding closing brace
                for (let i = searchStartIndex; i < trimmedText.length; i++) {
                  if (trimmedText[i] === '{') {
                    balance++;
                  } else if (trimmedText[i] === '}') {
                    balance--;
                  }
                  if (balance === 0 && searchStartIndex === i && trimmedText[i] !== '{') { 
                    // Edge case: searchStartIndex was not '{', something is wrong.
                    break;
                  }
                  if (balance === 0 && trimmedText[i] === '}') {
                    endIndex = i;
                    jsonStringToParse = trimmedText.substring(searchStartIndex, endIndex + 1);
                    // Validate this substring is JSON, if not, try from firstBrace if we used lastBrace
                    try {
                      JSON.parse(jsonStringToParse); // Test parse
                      break; // Found valid JSON
                    } catch (e) {
                      jsonStringToParse = null; // Invalid, reset
                      if (searchStartIndex === lastBrace && firstBrace !== -1 && firstBrace !== lastBrace) {
                        // Retry with firstBrace if lastBrace attempt failed
                        searchStartIndex = firstBrace; 
                        i = firstBrace -1; // restart loop from firstBrace
                        balance = 0; // reset balance
                        continue;
                      }
                      break; // Stop if this attempt failed
                    }
                  }
                }
              }
            }

            if (jsonStringToParse) {
              productTextDetails = JSON.parse(jsonStringToParse); // This should now be a valid JSON string
            } else {
              console.warn("[geminiProductGeneration Function] Could not extract JSON from text part:", part.text);
            }
          } catch (e) {
            console.warn("[geminiProductGeneration Function] Error parsing extracted JSON string:", jsonStringToParse, "Original text:", part.text, e);
          }
        } else if (part.inlineData && part.inlineData.data) {
          imageData = part.inlineData.data;
          console.log("[geminiProductGeneration Function] Image data found for product.");
        }
      }
    }

    if (!productTextDetails || !imageData) {
      let errorMsg = "Failed to generate complete product data. ";
      if (!productTextDetails) errorMsg += "Text details missing. ";
      if (!imageData) errorMsg += "Image data missing. ";
      console.error(errorMsg, "Raw text response:", rawTextResponse);
      throw new Error(errorMsg + `Raw text (if any): ${rawTextResponse}`);
    }

    // Validate parsed details (basic check)
    if (typeof productTextDetails.title !== 'string' || 
        typeof productTextDetails.description !== 'string' ||
        (typeof productTextDetails.price !== 'string' && typeof productTextDetails.price !== 'number')) {
      console.error("[geminiProductGeneration Function] Parsed product details are not in the expected format:", productTextDetails);
      throw new Error("AI response for product details was not in the expected format (title, description, price).");
    }
    
    // Ensure price is a string
    productTextDetails.price = String(productTextDetails.price);

    console.log("[geminiProductGeneration Function] Successfully generated product details and image data.");
    return { ...productTextDetails, imageData };

  } catch (error) {
    console.error("[geminiProductGeneration Function] Error:", error.message, error.stack);
    throw new Error(`Product generation failed: ${error.message}`);
  }
}

import { GoogleGenAI } from "@google/genai"; // Changed SDK

// IMPORTANT: In a real application, use environment variables for API keys.
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.error("VITE_GEMINI_API_KEY is not set. Please add it to your .env file. Store name suggestions will fail.");
  // No early return here, let the function handle the apiKey check
}

// Instantiate with the new SDK
// const genAI = new GoogleGenAI({ apiKey }); // Instantiated inside the function for clarity or if options change

export async function generateStoreNameSuggestions(promptContent) {
  if (!apiKey) {
    console.error("API Key not configured inside generateStoreNameSuggestions. Cannot generate suggestions.");
    return { error: "API Key not configured. Cannot generate suggestions." };
  }

  const genAI = new GoogleGenAI({ apiKey }); // Instantiate here

  try {
    const fullPrompt = `Suggest 5 creative and catchy store name options based on the following description or keywords: "${promptContent}". Return the names as a JSON array of strings. For example: ["StoreName1", "StoreName2", "StoreName3", "StoreName4", "StoreName5"]`;

    // Using ai.models.generateContent similar to the image generation example
    const response = await genAI.models.generateContent({
      model: "gemini-2.0-flash", // Text generation model
      contents: fullPrompt, // Pass the prompt string
      // config for text generation might include temperature, topP, etc.
      // For now, defaults are fine. No specific responseModalities needed for text.
    });

    let text = "";
    // Extract text from response (structure from @google/genai for text)
    if (response.candidates && response.candidates.length > 0 && response.candidates[0].content && response.candidates[0].content.parts && response.candidates[0].content.parts.length > 0 && response.candidates[0].content.parts[0].text) {
      text = response.candidates[0].content.parts[0].text;
    } else {
      console.error("Could not extract text from AI response for store name suggestions. Response:", JSON.stringify(response));
      return { error: "AI response structure not as expected or empty.", rawResponse: JSON.stringify(response) };
    }
    
    // Attempt to parse the JSON array from the model's response
    // The model might return text with ```json ... ``` markdown, so we need to extract it.
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    let suggestions = [];
    if (jsonMatch && jsonMatch[1]) {
      suggestions = JSON.parse(jsonMatch[1]);
    } else {
      // Fallback if no JSON block is found, try parsing the whole text
      try {
        suggestions = JSON.parse(text);
      } catch (e) {
        console.error("Failed to parse suggestions as JSON from:", text);
        // If parsing fails, try to extract names if they are comma-separated or line-separated
        suggestions = text.split(/[\n,]+/).map(s => s.trim()).filter(s => s.length > 0).slice(0, 5);
        if (suggestions.length === 0) {
          return { error: "Could not parse store name suggestions from AI response.", rawResponse: text };
        }
      }
    }
    
    if (!Array.isArray(suggestions) || suggestions.some(s => typeof s !== 'string')) {
        console.error("Parsed suggestions are not a valid array of strings:", suggestions);
        return { error: "AI response was not in the expected format (array of strings).", rawResponse: text };
    }

    return { suggestions: suggestions.slice(0, 5) }; // Ensure only 5 suggestions
  } catch (error) {
    console.error("Error generating store name suggestions:", error);
    return { error: `Error generating suggestions: ${error.message}` };
  }
}

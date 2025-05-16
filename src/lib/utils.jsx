
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { v4 as uuidv4 } from 'uuid';

export function cn(...inputs) {
	return twMerge(clsx(inputs));
}

export function generateId() {
  return uuidv4();
}

// Use environment variable for Pexels API Key
const PEXELS_API_KEY_FROM_ENV = import.meta.env.VITE_PEXELS_API_KEY;
console.log("[utils.jsx] VITE_PEXELS_API_KEY loaded:", PEXELS_API_KEY_FROM_ENV ? "Exists" : "MISSING");
export const PEXELS_API_KEY = PEXELS_API_KEY_FROM_ENV || 'YOUR_PEXELS_API_KEY_FALLBACK'; // Fallback if not set, though it should be

export const PEXELS_API_URL = 'https://api.pexels.com/v1';

// Use environment variable for Gemini API Key (though this might be managed elsewhere too)
const GEMINI_API_KEY_FROM_ENV = import.meta.env.VITE_GEMINI_API_KEY;
console.log("[utils.jsx] VITE_GEMINI_API_KEY loaded:", GEMINI_API_KEY_FROM_ENV ? "Exists" : "MISSING");
export const GEMINI_API_KEY = GEMINI_API_KEY_FROM_ENV || 'YOUR_GEMINI_API_KEY_FALLBACK';


export const SHOPIFY_STORE_DOMAIN_PLACEHOLDER = 'your-shop-name.myshopify.com';
export const SHOPIFY_STOREFRONT_ACCESS_TOKEN_PLACEHOLDER = 'YOUR_SHOPIFY_STOREFRONT_ACCESS_TOKEN';

export const fetchPexelsImages = async (query, perPage = 1, orientation = 'landscape') => {
  if (!PEXELS_API_KEY || PEXELS_API_KEY === 'YOUR_PEXELS_API_KEY_FALLBACK') {
    console.warn('Pexels API key is not set or is fallback. Using placeholder images.');
    const placeholderUrl = (w, h, q) => `https://via.placeholder.com/${w}x${h}.png?text=${encodeURIComponent(q)}`;
    return Array(perPage).fill(null).map((_, i) => ({ 
      id: generateId(),
      src: { 
        large: placeholderUrl(1200, 800, `${query} ${i+1}`), 
        medium: placeholderUrl(800, 600, `${query} ${i+1}`), 
        original: placeholderUrl(1920, 1280, `${query} ${i+1}`), 
        square: placeholderUrl(400, 400, `${query} ${i+1}`), 
        landscape: placeholderUrl(1200, 800, `${query} ${i+1}`),
        portrait: placeholderUrl(800,1200, `${query} ${i+1}`),
        small: placeholderUrl(400,260, `${query} ${i+1}`),
        tiny: placeholderUrl(200,130, `${query} ${i+1}`),
      }, 
      photographer: 'Placeholder Artist',
      alt: `Placeholder for ${query} ${i+1}`
    }));
  }

  const url = `${PEXELS_API_URL}/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=${orientation}`;
  try {
    const response = await fetch(url, {
      headers: {
        Authorization: PEXELS_API_KEY,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Pexels API error:', errorData);
      throw new Error(`Pexels API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.photos || data.photos.length === 0) {
        console.warn(`No Pexels images found for query: "${query}". Attempting fallback.`);
        // Avoid infinite recursion if fallback also yields no results by having a different fallback query or limit.
        // For simplicity, just returning placeholders if primary query fails.
        const placeholderUrl = (w, h, q) => `https://via.placeholder.com/${w}x${h}.png?text=NoImage:${encodeURIComponent(q)}`;
        return Array(perPage).fill(null).map((_, i) => ({ 
            id: generateId(),
            src: { large: placeholderUrl(1200,800,`${query} ${i+1}`), medium: placeholderUrl(800,600,`${query} ${i+1}`), original: placeholderUrl(1920,1280,`${query} ${i+1}`), square: placeholderUrl(400,400,`${query} ${i+1}`), landscape: placeholderUrl(1200,800,`${query} ${i+1}`), portrait: placeholderUrl(800,1200,`${query} ${i+1}`), small: placeholderUrl(400,260,`${query} ${i+1}`), tiny: placeholderUrl(200,130,`${query} ${i+1}`) }, 
            photographer: 'N/A',
            alt: `No image found for ${query} ${i+1}`
        }));
    }
    return data.photos.map(photo => ({
      id: photo.id,
      src: photo.src, // Pexels photo src object has various sizes
      photographer: photo.photographer,
      alt: photo.alt || `Photo by ${photo.photographer} of ${query}`
    }));
  } catch (error) {
    console.error('Error fetching Pexels images:', error);
    const placeholderUrl = (w,h,q) => `https://via.placeholder.com/${w}x${h}.png?text=${encodeURIComponent(q)}`;
     return Array(perPage).fill(null).map((_, i) => ({ 
      id: generateId(),
      src: { 
        large: placeholderUrl(1200, 800, `Error ${query} ${i+1}`), 
        medium: placeholderUrl(800, 600, `Error ${query} ${i+1}`), 
        original: placeholderUrl(1920, 1280, `Error ${query} ${i+1}`), 
        square: placeholderUrl(400, 400, `Error ${query} ${i+1}`),
        landscape: placeholderUrl(1200, 800, `Error ${query} ${i+1}`),
        portrait: placeholderUrl(800,1200, `Error ${query} ${i+1}`),
        small: placeholderUrl(400,260, `Error ${query} ${i+1}`),
        tiny: placeholderUrl(200,130, `Error ${query} ${i+1}`),
      }, 
      photographer: 'Placeholder Error',
      alt: `Placeholder Error for ${query} ${i+1}`
    }));
  }
};

export const fetchPexelsVideos = async (query, perPage = 1, orientation = 'landscape') => {
  if (!PEXELS_API_KEY || PEXELS_API_KEY === 'YOUR_PEXELS_API_KEY_FALLBACK') {
    console.warn('Pexels API key is not set or is fallback. Using placeholder videos.');
    // Simplified placeholder for video
    return Array(perPage).fill(null).map((_, i) => ({
      id: generateId(),
      url: `https://videos.pexels.com/videos/placeholder-video-${i+1}.mp4`, // This URL won't work, just for structure
      image: `https://via.placeholder.com/1280x720.png?text=Video+Placeholder+${encodeURIComponent(query)}`, // Poster
      alt: `Placeholder video for ${query} ${i+1}`
    }));
  }

  const url = `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=${orientation}`;
  try {
    const response = await fetch(url, {
      headers: {
        Authorization: PEXELS_API_KEY,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Pexels Videos API error:', errorData);
      throw new Error(`Pexels Videos API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.videos || data.videos.length === 0) {
      console.warn(`No Pexels videos found for query: "${query}".`);
      return Array(perPage).fill(null).map((_, i) => ({
        id: generateId(),
        url: `https://videos.pexels.com/videos/no-video-${i+1}.mp4`,
        image: `https://via.placeholder.com/1280x720.png?text=No+Video+Found+${encodeURIComponent(query)}`,
        alt: `No video found for ${query} ${i+1}`
      }));
    }
    
    return data.videos.map(video => {
      const suitableFile = video.video_files.find(vf => vf.quality === 'hd' && vf.file_type === 'video/mp4') || 
                           video.video_files.find(vf => vf.file_type === 'video/mp4') || 
                           video.video_files[0];
      return {
        id: video.id,
        url: suitableFile ? suitableFile.link : null,
        image: video.video_pictures[0]?.picture || `https://via.placeholder.com/1280x720.png?text=${encodeURIComponent(video.url || query)}`, // Poster image
        duration: video.duration,
        user: video.user, // Contains photographer name etc.
        alt: `Video of ${query} by ${video.user?.name || 'Pexels Contributor'}`
      };
    });
  } catch (error) {
    console.error('Error fetching Pexels videos:', error);
    return Array(perPage).fill(null).map((_, i) => ({
      id: generateId(),
      url: `https://videos.pexels.com/videos/error-video-${i+1}.mp4`,
      image: `https://via.placeholder.com/1280x720.png?text=Video+Error+${encodeURIComponent(query)}`,
      alt: `Error fetching video for ${query} ${i+1}`
    }));
  }
};

import { GoogleGenAI, Modality, HarmCategory, HarmBlockThreshold } from "@google/genai"; // Import for actual Gemini call

export const generateImageWithGemini = async (prompt) => {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_FALLBACK') {
    console.warn('Gemini API key is not set or is fallback. Returning placeholder image.');
    return {
      url: `https://via.placeholder.com/512x512.png?text=${encodeURIComponent(prompt.substring(0, 30))}`,
      alt: `Placeholder for: ${prompt}`,
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const safetySettings = [ // Standard safety settings
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ];

    console.log(`[utils.jsx/generateImageWithGemini] Calling Gemini with prompt: "${prompt}"`);
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-preview-image-generation",
      contents: [{text: prompt}],
      safetySettings,
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE], // Expect text and image, like other Gemini calls
      },
    });

    let imageData = null;
    let imageMimeType = 'image/png'; // Default
    // let textResponse = ""; // If we wanted to capture text

    if (response.candidates && response.candidates.length > 0 && response.candidates[0].content && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        // if (part.text) { textResponse += part.text; } // Can capture text if needed
        if (part.inlineData && part.inlineData.data) {
          imageData = part.inlineData.data;
          imageMimeType = part.inlineData.mimeType || 'image/png';
          console.log(`[utils.jsx/generateImageWithGemini] Image generated. MimeType: ${imageMimeType}`);
          // Found image, no need to look further for image data in this simple generator
          break; 
        }
      }
    }

    if (imageData) {
      return {
        url: `data:${imageMimeType};base64,${imageData}`,
        alt: `AI Generated Image for: ${prompt}`,
      };
    }
    throw new Error("No image data found in Gemini response.");
  } catch (error) {
    console.error("[utils.jsx/generateImageWithGemini] Error generating image with Gemini:", error);
    // Fallback to placeholder on error
    return {
      url: `https://via.placeholder.com/512x512.png?text=Error:${encodeURIComponent(prompt.substring(0,20))}`,
      alt: `Error generating image for: ${prompt}`,
    };
  }
};

export const generateStoreNameSuggestion = async (productDescription) => {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_FALLBACK') {
    console.warn('Gemini API key not set or is fallback for store name suggestion. Returning generic name.');
    return `${productDescription.split(' ')[0] || 'My'} Store`;
  }
  console.log(`Mock call to Gemini for store name suggestion based on: "${productDescription}"`);
  await new Promise(resolve => setTimeout(resolve, 1000));
  return `Awesome ${productDescription.split(' ')[0] || 'Goods'} Emporium`;
};

export const generateAIProductDescriptions = (productType, productName) => {
  const templates = {
    fashion: [
      `Elevate your style with our ${productName}. Crafted for comfort and a modern look.`,
      `The ${productName} is a must-have for any fashion-forward wardrobe. Versatile and chic.`,
      `Discover the perfect blend of quality and design in our ${productName}. Ideal for any occasion.`,
    ],
    electronics: [
      `Experience next-level technology with the ${productName}. Packed with features for modern life.`,
      `The ${productName} offers superior performance and sleek design. Upgrade your tech today.`,
      `Unleash innovation with the ${productName}. Reliable, powerful, and built to last.`,
    ],
    food: [
      `Savor the rich flavors of our ${productName}. Made with the freshest, high-quality ingredients.`,
      `Our ${productName} is a delicious treat for any time of day. Wholesome and satisfying.`,
      `Indulge in the authentic taste of ${productName}. Perfect for sharing or enjoying solo.`,
    ],
    jewelry: [
      `Adorn yourself with the exquisite ${productName}. A timeless piece that radiates elegance.`,
      `The ${productName} is a symbol of sophistication and luxury. Crafted with precision.`,
      `Make a statement with our stunning ${productName}. Perfect for special moments.`,
    ],
    general: [
      `Discover the quality and utility of the ${productName}. A great addition to your collection.`,
      `The ${productName} is designed for excellence and everyday use. You'll love it.`,
      `Enhance your life with the versatile ${productName}. Built for performance and style.`,
    ],
  };
  const descriptions = templates[productType] || templates.general;
  return descriptions[Math.floor(Math.random() * descriptions.length)];
};

export const generateAIStoreContent = (storeType, storeName) => {
  const heroTitles = {
    fashion: `Step Into Style at ${storeName}`,
    electronics: `${storeName}: Your Tech Universe`,
    food: `Taste the Difference with ${storeName}`,
    jewelry: `Shine Bright with ${storeName}`,
    general: `Welcome to ${storeName} - Quality Finds!`,
  };
  const heroDescriptions = {
    fashion: `Explore the latest trends and timeless classics. ${storeName} offers curated fashion for every individual. Express yourself with our unique collection.`,
    electronics: `Discover cutting-edge gadgets and essential electronics at ${storeName}. We bring you innovation, performance, and value, all in one place.`,
    food: `From farm-fresh produce to gourmet delights, ${storeName} is your source for delicious and wholesome food. Quality ingredients for a healthier life.`,
    jewelry: `Find exquisite pieces that tell your story. ${storeName} presents a stunning collection of fine jewelry, perfect for gifting or treating yourself.`,
    general: `Your one-stop shop for amazing products. ${storeName} offers a diverse range of quality items to meet your everyday needs and special desires.`,
  };
  const featureTitles = [
    "Fast Worldwide Shipping", 
    "Secure Online Payments", 
    "24/7 Customer Support", 
    "Easy Returns & Exchanges"
  ];
  const featureDescriptions = [
    "Get your orders delivered quickly and reliably, no matter where you are.",
    "Shop with confidence using our encrypted and secure payment gateways.",
    "Our dedicated team is here to help you around the clock with any queries.",
    "Not satisfied? We offer a hassle-free return and exchange policy."
  ];
  const newsletterHeading = `Join the ${storeName} Family`;
  const newsletterText = `Sign up for our newsletter to receive exclusive offers, new product alerts, and style tips directly to your inbox. Don't miss out!`;

  return {
    heroTitle: heroTitles[storeType] || heroTitles.general,
    heroDescription: heroDescriptions[storeType] || heroDescriptions.general,
    featureTitles,
    featureDescriptions,
    newsletterHeading,
    newsletterText,
  };
};

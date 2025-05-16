// Pexels API client
// IMPORTANT: In a real application, use environment variables for API keys.
const PEXELS_API_KEY = import.meta.env.VITE_PEXELS_API_KEY;

if (!PEXELS_API_KEY) {
  console.error("VITE_PEXELS_API_KEY is not set. Please add it to your .env file. Pexels video search will fail.");
}

const PEXELS_API_URL = 'https://api.pexels.com/videos';

/**
 * Searches for videos on Pexels.
 * @param {string} query - The search query.
 * @param {number} perPage - Number of results per page.
 * @returns {Promise<object>} - A promise that resolves to an object containing videos or an error.
 */
export async function searchPexelsVideos(query, perPage = 9) {
  if (!PEXELS_API_KEY) {
    return { error: "Pexels API Key not configured." };
  }
  if (!query || !query.trim()) {
    return { error: "Search query cannot be empty." };
  }

  const url = `${PEXELS_API_URL}/search?query=${encodeURIComponent(query)}&per_page=${perPage}`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: PEXELS_API_KEY,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      console.error('Pexels API error:', response.status, errorData);
      return { error: `Pexels API error: ${errorData.message || response.statusText}` };
    }

    const data = await response.json();
    
    // We need to find the most suitable video file (e.g., a common mp4 format)
    const videos = data.videos.map(video => {
      // Pexels API returns multiple video files of different qualities/formats.
      // We try to find a decent quality MP4.
      const mp4File = video.video_files.find(vf => vf.file_type === 'video/mp4' && (vf.quality === 'hd' || vf.quality === 'sd')) 
                      || video.video_files.find(vf => vf.file_type === 'video/mp4'); // fallback to any mp4
      
      return {
        id: video.id,
        width: video.width,
        height: video.height,
        duration: video.duration,
        imageUrl: video.image, // This is the poster/thumbnail image
        videoUrl: mp4File ? mp4File.link : (video.video_files[0] ? video.video_files[0].link : null), // Link to the actual video file
        photographer: video.user.name,
        pexelsUrl: video.url, // Link to the Pexels page for the video
      };
    }).filter(v => v.videoUrl); // Only include videos where we found a usable video file URL

    return { videos, totalResults: data.total_results, page: data.page, perPage: data.per_page };

  } catch (error) {
    console.error('Error fetching from Pexels API:', error);
    return { error: `Network error or other issue fetching Pexels videos: ${error.message}` };
  }
}

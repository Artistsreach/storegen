/**
 * Loads an image from a URL or a data URL.
 * @param {string} src - The image source (URL or data URL).
 * @returns {Promise<HTMLImageElement>} A promise that resolves with the loaded image element.
 */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // For URLs, especially external ones like Pexels, CORS might be an issue
    // if the canvas is tainted. Setting crossOrigin for external URLs.
    if (src.startsWith('http')) {
      img.crossOrigin = 'Anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = (err) => {
      console.error("Failed to load image:", src, err);
      reject(new Error(`Failed to load image: ${src}`));
    };
    img.src = src;
  });
}

/**
 * Overlays a logo onto a base product image.
 * @param {string} baseImageSrc - URL or data URL of the base product image.
 * @param {string} logoDataUrl - Data URL of the logo image (e.g., data:image/png;base64,...).
 * @param {object} [options] - Optional parameters.
 * @param {number} [options.logoScale=0.15] - Scale of the logo relative to the base image's smaller dimension.
 * @param {string} [options.position='bottom-right'] - Position of the logo ('bottom-right', 'bottom-left', 'top-right', 'top-left').
 * @param {number} [options.margin=0.05] - Margin for the logo relative to the base image's smaller dimension.
 * @returns {Promise<string>} A promise that resolves with the data URL of the composite image.
 */
export async function overlayLogoOnProductImage(
  baseImageSrc,
  logoDataUrl,
  options = {}
) {
  const { logoScale = 0.15, position = 'bottom-right', margin = 0.05 } = options;

  if (!baseImageSrc || !logoDataUrl) {
    console.warn("overlayLogoOnProductImage: Missing base image or logo data URL.");
    return baseImageSrc; // Return original if no logo
  }

  try {
    const [baseImg, logoImg] = await Promise.all([
      loadImage(baseImageSrc),
      loadImage(logoDataUrl),
    ]);

    const canvas = document.createElement('canvas');
    canvas.width = baseImg.naturalWidth || baseImg.width;
    canvas.height = baseImg.naturalHeight || baseImg.height;
    const ctx = canvas.getContext('2d');

    // Draw base image
    ctx.drawImage(baseImg, 0, 0, canvas.width, canvas.height);

    // Calculate logo dimensions and position
    const baseShorterSide = Math.min(canvas.width, canvas.height);
    const targetLogoHeight = baseShorterSide * logoScale;
    const scaleRatio = targetLogoHeight / (logoImg.naturalHeight || logoImg.height);
    const logoW = (logoImg.naturalWidth || logoImg.width) * scaleRatio;
    const logoH = targetLogoHeight;
    const marginPx = baseShorterSide * margin;

    let x, y;

    switch (position) {
      case 'bottom-left':
        x = marginPx;
        y = canvas.height - logoH - marginPx;
        break;
      case 'top-right':
        x = canvas.width - logoW - marginPx;
        y = marginPx;
        break;
      case 'top-left':
        x = marginPx;
        y = marginPx;
        break;
      case 'bottom-right':
      default:
        x = canvas.width - logoW - marginPx;
        y = canvas.height - logoH - marginPx;
        break;
    }

    // Draw logo
    ctx.drawImage(logoImg, x, y, logoW, logoH);

    return canvas.toDataURL('image/png'); // Always output as PNG to preserve logo transparency
  } catch (error) {
    console.error('Error overlaying logo on product image:', error);
    return baseImageSrc; // Fallback to original base image URL on error
  }
}

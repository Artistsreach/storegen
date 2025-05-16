import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, WandIcon } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { generateCaptionForImageData } from '@/lib/geminiImageGeneration';
import { generateVideoWithVeoFromImage } from '@/lib/geminiVideoGeneration';

// Helper to convert image URL (http or data) to base64 and mimeType
// This is duplicated from ProductDetail.jsx for now, consider moving to a util if used in more places.
const convertImageSrcToBasics = (imageSrc) => {
  return new Promise((resolve, reject) => {
    if (!imageSrc) {
      return reject(new Error("Image source is undefined or null."));
    }
    if (imageSrc.startsWith('data:')) {
      try {
        const parts = imageSrc.split(',');
        if (parts.length < 2) throw new Error("Invalid data URL structure.");
        const metaPart = parts[0];
        const base64Data = parts[1];
        const mimeTypeMatch = metaPart.match(/:(.*?);/);
        if (!mimeTypeMatch || !mimeTypeMatch[1]) throw new Error("Could not parse MIME type from data URL.");
        const mimeType = mimeTypeMatch[1];
        resolve({ base64ImageData: base64Data, mimeType });
      } catch (error) {
        console.error("Error parsing data URL:", imageSrc, error);
        reject(new Error(`Invalid data URL format: ${error.message}`));
      }
    } else { // Assuming it's an HTTP/HTTPS URL
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        try {
          // Prioritize original image type if known, else default to PNG
          let mimeType = 'image/png';
          if (imageSrc.toLowerCase().endsWith('.jpg') || imageSrc.toLowerCase().endsWith('.jpeg')) {
            mimeType = 'image/jpeg';
          }
          // Add more types if needed (webp, etc.)
          const dataUrl = canvas.toDataURL(mimeType); 
          const parts = dataUrl.split(',');
          const base64Data = parts[1];
          resolve({ base64ImageData: base64Data, mimeType });
        } catch (e) {
          console.error("Canvas toDataURL failed:", e);
          reject(new Error("Canvas toDataURL failed. " + e.message));
        }
      };
      img.onerror = (e) => {
        console.error("Failed to load image from URL for conversion:", imageSrc, e);
        reject(new Error("Failed to load image from URL for conversion."));
      };
      img.src = imageSrc;
    }
  });
};


const GenerateProductVideoModal = ({ open, onOpenChange, product, onVideoGenerated }) => {
  const [prompt, setPrompt] = useState('');
  const [base64ImageData, setBase64ImageData] = useState(null);
  const [mimeType, setMimeType] = useState(null);
  const [isLoadingCaption, setIsLoadingCaption] = useState(false);
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  const productImageUrl = product?.image?.src?.large || product?.image?.src?.medium;

  useEffect(() => {
    // Load image data when modal opens, but don't generate caption automatically
    if (open && productImageUrl) {
      setError(null);
      setPrompt('');
      setBase64ImageData(null); // Reset image data
      setMimeType(null);

      convertImageSrcToBasics(productImageUrl)
        .then(imgData => {
          setBase64ImageData(imgData.base64ImageData);
          setMimeType(imgData.mimeType);
        })
        .catch(err => {
          console.error("Error loading product image data:", err);
          setError(`Failed to load product image: ${err.message}`);
          toast({ title: "Error", description: `Failed to load product image: ${err.message}`, variant: "destructive" });
        });
    }
  }, [open, productImageUrl, toast]);

  const handleSuggestPrompt = async () => {
    if (!base64ImageData || !mimeType) {
      toast({ title: "Error", description: "Product image data is not available to suggest a prompt.", variant: "destructive" });
      return;
    }
    setIsLoadingCaption(true);
    setError(null);
    try {
      // Use base64ImageData and mimeType from state
      const caption = await generateCaptionForImageData(base64ImageData, mimeType);
      setPrompt(caption);
    } catch (err) {
      console.error("Error generating prompt suggestion:", err);
      setError(`Failed to suggest prompt: ${err.message}`);
      toast({ title: "Suggestion Failed", description: `Could not suggest a prompt: ${err.message}`, variant: "destructive" });
    } finally {
      setIsLoadingCaption(false);
    }
  };

  const handleGenerateVideo = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt for the video.');
      return;
    }
    if (!base64ImageData || !mimeType) {
      setError('Product image data is not available.');
      return;
    }

    setIsLoadingVideo(true);
    setError(null);
    try {
      const newVideoUrl = await generateVideoWithVeoFromImage(prompt, base64ImageData, mimeType);
      if (onVideoGenerated) {
        onVideoGenerated(newVideoUrl);
      }
      onOpenChange(false); // Close modal on success
    } catch (err) {
      console.error('Error generating product video:', err);
      setError(err.message || 'Failed to generate video. Please try again.');
      toast({ title: "Video Generation Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsLoadingVideo(false);
    }
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Generate Product Video</DialogTitle>
          <DialogDescription>
            Create a short video for "{product.name}" using its image and a prompt.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {productImageUrl && (
            <div className="flex flex-col items-center gap-2">
              <img src={productImageUrl} alt={product.name} className="w-32 h-32 object-contain rounded border" />
              <p className="text-xs text-muted-foreground">Using this image as the base.</p>
            </div>
          )}
          
          <div className="grid w-full gap-1.5">
            <div className="flex justify-between items-center">
              <Label htmlFor="video-prompt">Video Prompt</Label>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSuggestPrompt} 
                disabled={isLoadingCaption || isLoadingVideo || !base64ImageData}
              >
                {isLoadingCaption ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <WandIcon className="mr-2 h-4 w-4" />}
                Suggest
              </Button>
            </div>
            <Textarea
              id="video-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., A dynamic shot of the product with vibrant background..."
              rows={4}
              disabled={isLoadingCaption || isLoadingVideo}
            />
            <p className="text-xs text-muted-foreground">
              AI will use the product image and this prompt to create a video.
            </p>
          </div>

          {error && <p className="text-sm text-red-500 col-span-4 text-center">{error}</p>}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isLoadingVideo}>Cancel</Button>
          </DialogClose>
          <Button 
            onClick={handleGenerateVideo} 
            disabled={isLoadingCaption || isLoadingVideo || !prompt.trim() || !base64ImageData}
          >
            {isLoadingVideo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <WandIcon className="mr-2 h-4 w-4" />}
            Generate Video
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GenerateProductVideoModal;

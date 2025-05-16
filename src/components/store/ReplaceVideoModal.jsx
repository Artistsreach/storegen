import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { generateVideoWithVeo } from '@/lib/geminiVideoGeneration';

const ReplaceVideoModal = ({ open, onOpenChange, storeId, currentVideoUrl, onVideoReplaced }) => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerateVideo = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt for the video.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      console.log(`Generating video for store ${storeId} with prompt: "${prompt}"`);
      const newVideoUrl = await generateVideoWithVeo(prompt); 

      if (onVideoReplaced) {
        // The video URI from Veo might need the API key for direct access.
        // The onVideoReplaced function should handle saving this appropriately,
        // potentially by downloading it or proxying. For now, we pass it as is.
        // If the API key is needed for the URL to work:
        // onVideoReplaced(`${newVideoUrl}&key=${import.meta.env.VITE_GOOGLE_API_KEY}`);
        onVideoReplaced(newVideoUrl); 
      }
      onOpenChange(false); // Close modal on success
      setPrompt(''); // Reset prompt
    } catch (err) {
      console.error('Error generating video:', err);
      setError(err.message || 'Failed to generate video. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[572px]">
        <DialogHeader className="text-left">
          <DialogTitle>Replace Hero Video</DialogTitle>
          <DialogDescription className="text-left">
            Generate a new video using a text prompt with Veo 2. The current video is: <br />
            <a href={currentVideoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline truncate block max-w-full">{currentVideoUrl || 'No video set'}</a>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="prompt" className="text-left block mb-1">
              Prompt
            </Label>
            <Input
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., A futuristic cityscape at sunset"
              disabled={isLoading}
            />
          </div>
          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
        </div>
        <DialogFooter className="justify-start">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleGenerateVideo} disabled={isLoading || !prompt.trim()}>
            {isLoading ? 'Generating...' : 'Generate Video'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReplaceVideoModal;

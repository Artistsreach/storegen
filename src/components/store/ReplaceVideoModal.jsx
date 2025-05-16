import React, { useState, useEffect } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'; // Added Tabs
import { generateVideoWithVeo } from '@/lib/geminiVideoGeneration';
import { searchPexelsVideos } from '@/lib/pexels'; // Added Pexels search

const ReplaceVideoModal = ({ open, onOpenChange, storeId, currentVideoUrl, onVideoReplaced }) => {
  const [activeTab, setActiveTab] = useState('ai');
  
  // AI Generation State
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  // Pexels Search State
  const [pexelsQuery, setPexelsQuery] = useState('');
  const [pexelsVideos, setPexelsVideos] = useState([]);
  const [isPexelsLoading, setIsPexelsLoading] = useState(false);
  const [pexelsError, setPexelsError] = useState(null);

  // Reset states when modal opens or tab changes
  useEffect(() => {
    if (open) {
      setAiPrompt('');
      setIsAiLoading(false);
      setAiError(null);
      setPexelsQuery('');
      setPexelsVideos([]);
      setIsPexelsLoading(false);
      setPexelsError(null);
      // setActiveTab('ai'); // Optionally reset to default tab
    }
  }, [open]);

  const handleAiGenerateVideo = async () => {
    if (!aiPrompt.trim()) {
      setAiError('Please enter a prompt for the video.');
      return;
    }
    setIsAiLoading(true);
    setAiError(null);
    try {
      console.log(`Generating video for store ${storeId} with prompt: "${aiPrompt}"`);
      const newVideoUrl = await generateVideoWithVeo(aiPrompt);
      if (onVideoReplaced) {
        onVideoReplaced(newVideoUrl);
      }
      onOpenChange(false);
      setAiPrompt('');
    } catch (err) {
      console.error('Error generating video with AI:', err);
      setAiError(err.message || 'Failed to generate video. Please try again.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handlePexelsSearch = async () => {
    if (!pexelsQuery.trim()) {
      setPexelsError('Please enter a search query for Pexels.');
      return;
    }
    setIsPexelsLoading(true);
    setPexelsError(null);
    setPexelsVideos([]);
    try {
      const result = await searchPexelsVideos(pexelsQuery);
      if (result.error) {
        setPexelsError(result.error);
        setPexelsVideos([]);
      } else {
        setPexelsVideos(result.videos || []);
        if ((result.videos || []).length === 0) {
          setPexelsError('No videos found for your query.');
        }
      }
    } catch (err) {
      console.error('Error searching Pexels videos:', err);
      setPexelsError(err.message || 'Failed to search Pexels. Please try again.');
    } finally {
      setIsPexelsLoading(false);
    }
  };

  const handlePexelsVideoSelect = (videoUrl) => {
    if (onVideoReplaced && videoUrl) {
      onVideoReplaced(videoUrl);
      onOpenChange(false);
    } else {
      setPexelsError("Invalid video URL selected or replacement handler missing.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[672px]"> {/* Increased width for Pexels results */}
        <DialogHeader className="text-left">
          <DialogTitle>Replace Hero Video</DialogTitle>
          <DialogDescription className="text-left">
            Current video: <a href={currentVideoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline truncate block max-w-full">{currentVideoUrl || 'No video set'}</a>
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ai">AI Generation (Veo)</TabsTrigger>
            <TabsTrigger value="pexels">Search Pexels</TabsTrigger>
          </TabsList>
          
          <TabsContent value="ai" className="space-y-4 py-4">
            <div>
              <Label htmlFor="aiPrompt" className="text-left block mb-1">
                AI Video Prompt
              </Label>
              <Input
                id="aiPrompt"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g., A futuristic cityscape at sunset"
                disabled={isAiLoading}
              />
            </div>
            {aiError && <p className="text-sm text-red-500 text-center">{aiError}</p>}
            <DialogFooter className="justify-start pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isAiLoading}>
                Cancel
              </Button>
              <Button onClick={handleAiGenerateVideo} disabled={isAiLoading || !aiPrompt.trim()}>
                {isAiLoading ? 'Generating...' : 'Generate Video'}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="pexels" className="space-y-4 py-4">
            <div className="flex gap-2">
              <Input
                id="pexelsQuery"
                value={pexelsQuery}
                onChange={(e) => setPexelsQuery(e.target.value)}
                placeholder="e.g., Nature, Business, Technology"
                disabled={isPexelsLoading}
                className="flex-grow"
              />
              <Button onClick={handlePexelsSearch} disabled={isPexelsLoading || !pexelsQuery.trim()}>
                {isPexelsLoading ? 'Searching...' : 'Search'}
              </Button>
            </div>
            {pexelsError && <p className="text-sm text-red-500 text-center">{pexelsError}</p>}
            {isPexelsLoading && <p className="text-sm text-muted-foreground text-center">Loading Pexels videos...</p>}
            
            {!isPexelsLoading && pexelsVideos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto pr-2">
                {pexelsVideos.map((video) => (
                  <div 
                    key={video.id} 
                    className="relative aspect-video rounded-md overflow-hidden cursor-pointer group border hover:border-primary"
                    onClick={() => handlePexelsVideoSelect(video.videoUrl)}
                  >
                    <img src={video.imageUrl} alt={`Pexels video by ${video.photographer}`} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                      <p className="text-white text-xs text-center p-1 bg-black/50 rounded">Use Video</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
             <DialogFooter className="justify-start pt-4">
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPexelsLoading}>
                    Cancel
                </Button>
             </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ReplaceVideoModal;

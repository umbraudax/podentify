'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Play, Clock, BookOpen, Loader2, Sparkles } from 'lucide-react';
import { Chapter } from '@/lib/types';

interface ChaptersSectionProps {
  chapters: Chapter[];
  currentTime: number;
  onSeek: (time: number) => void;
  onGenerateChapters: () => void;
  isGenerating: boolean;
  disabled?: boolean;
}

export default function ChaptersSection({
  chapters,
  currentTime,
  onSeek,
  onGenerateChapters,
  isGenerating,
  disabled = false
}: ChaptersSectionProps) {
  const [hoveredChapter, setHoveredChapter] = useState<string | null>(null);

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getCurrentChapter = () => {
    return chapters.find(
      chapter => currentTime >= chapter.start_time && currentTime <= chapter.end_time
    );
  };

  const currentChapter = getCurrentChapter();

  if (chapters.length === 0 && !isGenerating) {
    return (
      <Card className="bg-surface-primary/90 backdrop-blur-sm border border-border shadow-xl">
        <CardContent className="p-6">
          <div className="text-center">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-text-tertiary" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              No Chapters Yet
            </h3>
            <p className="text-text-secondary mb-4">
              Generate AI-powered chapters to help listeners navigate your content
            </p>
            <Button 
              onClick={onGenerateChapters}
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
              disabled={disabled}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Chapters
            </Button>
            {disabled && (
              <p className="text-sm text-text-tertiary mt-3">
                Please wait for transcript to complete before generating chapters
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isGenerating) {
    return (
      <Card className="bg-surface-primary/90 backdrop-blur-sm border border-border shadow-xl">
        <CardContent className="p-6">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-brand-primary" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              Generating Chapters
            </h3>
            <p className="text-text-secondary">
              AI is analyzing your content to create meaningful chapters...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-surface-primary/90 backdrop-blur-sm border border-border shadow-xl">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <span>Chapters</span>
          </div>
          <Badge variant="outline" className="text-xs">
            {chapters.length} chapters
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-1 max-h-80 overflow-y-auto">
          {chapters.map((chapter, index) => {
            const isActive = currentChapter?.id === chapter.id;
            const isHovered = hoveredChapter === chapter.id;
            
            return (
              <TooltipProvider key={chapter.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={`group relative px-4 py-3 cursor-pointer transition-all duration-200 ${
                        isActive 
                          ? 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-l-4 border-blue-500' 
                          : isHovered
                            ? 'bg-surface-secondary'
                            : 'hover:bg-surface-secondary'
                      }`}
                      onMouseEnter={() => setHoveredChapter(chapter.id)}
                      onMouseLeave={() => setHoveredChapter(null)}
                      onClick={() => onSeek(chapter.start_time)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-xs font-medium text-text-tertiary">
                              Chapter {index + 1}
                            </span>
                            <div className="flex items-center space-x-1 text-xs text-text-tertiary">
                              <Clock className="w-3 h-3" />
                              <span>
                                {formatTime(chapter.start_time)} - {formatTime(chapter.end_time)}
                              </span>
                            </div>
                          </div>
                          <h4 className={`font-medium leading-snug mb-1 ${
                            isActive 
                              ? 'text-blue-700 dark:text-blue-300' 
                              : 'text-text-primary'
                          }`}>
                            {chapter.title}
                          </h4>
                          {chapter.summary && (
                            <p className="text-sm text-text-secondary line-clamp-2">
                              {chapter.summary}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2 ml-3">
                          <Badge variant="outline" className="text-xs">
                            {formatTime(chapter.duration)}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            className={`w-8 h-8 p-0 rounded-full transition-all duration-200 ${
                              isActive || isHovered
                                ? 'opacity-100 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                : 'opacity-0 group-hover:opacity-100'
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSeek(chapter.start_time);
                            }}
                          >
                            <Play className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Progress bar for current chapter */}
                      {isActive && (
                        <div className="mt-2">
                          <div className="w-full h-1 bg-surface-secondary rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                              style={{
                                width: `${Math.max(0, Math.min(100, ((currentTime - chapter.start_time) / chapter.duration) * 100))}%`
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-xs">
                    <div>
                      <div className="font-medium">{chapter.title}</div>
                      <div className="text-sm opacity-90 mt-1">
                        {formatTime(chapter.start_time)} - {formatTime(chapter.end_time)}
                      </div>
                      {chapter.summary && (
                        <div className="text-sm opacity-75 mt-2">
                          {chapter.summary}
                        </div>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
        
        {chapters.length > 0 && (
          <div className="p-4 border-t border-border">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onGenerateChapters}
              className="w-full"
              disabled={isGenerating || disabled}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Regenerate Chapters
            </Button>
            {disabled && (
              <p className="text-sm text-text-tertiary mt-2 text-center">
                Please wait for transcript to complete before regenerating chapters
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 
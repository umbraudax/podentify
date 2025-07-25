import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface GeminiChapter {
  title: string;
  start_time: number;
  end_time: number;
  summary: string;
}

export interface GeminiSocialClip {
  title: string;
  start_time: number;
  end_time: number;
  engagement_score: number;
  engagement_label: string;
}

export interface GeminiAnalysisResult {
  chapters: GeminiChapter[];
  social_clips: GeminiSocialClip[];
}

export class GeminiService {
  private model;

  constructor() {
    // Using the cheapest Gemini model available
    this.model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  }

  async analyzeTranscript(
    fullTranscript: string,
    transcriptWords: Array<{
      word: string;
      start_time: number;
      end_time: number;
      speaker?: string;
    }>
  ): Promise<GeminiAnalysisResult> {
    // Create a structured prompt for chapter and clip generation
    const prompt = `
You are an AI content analyst specializing in podcast and audio content. Analyze the following transcript and generate both chapters and viral social media clips.

TRANSCRIPT:
${fullTranscript}

WORD-LEVEL TIMING DATA (for precise timestamp reference):
${transcriptWords.slice(0, 500).map(word => 
  `${word.start_time.toFixed(2)}s: "${word.word}"${word.speaker ? ` (${word.speaker})` : ''}`
).join('\n')}

Please provide your analysis in the following JSON format:

{
  "chapters": [
    {
      "title": "Chapter title (concise but descriptive)",
      "start_time": 0.0,
      "end_time": 120.5,
      "summary": "Brief summary of what's discussed in this chapter"
    }
  ],
  "social_clips": [
    {
      "title": "Catchy clip title",
      "start_time": 15.2,
      "end_time": 45.8,
      "engagement_score": 85,
      "engagement_label": "High Impact"
    }
  ]
}

GUIDELINES:

For CHAPTERS:
- Create 3-8 logical chapters that represent natural topic breaks
- Each chapter should be 2-10 minutes long
- Use descriptive but concise titles
- Provide helpful summaries
- Ensure chapters don't overlap and cover the full content

For SOCIAL CLIPS:
- Identify 3-7 segments with high viral potential
- Look for: surprising facts, controversial statements, emotional moments, quotable insights, funny exchanges
- Clips should be 15-90 seconds long (optimal: 30-60 seconds)
- Engagement score: 0-100 (higher = more viral potential)
- Engagement labels: "High Impact", "Viral Potential", "Thought-Provoking", "Controversial", "Inspiring", "Funny"
- Prioritize standalone segments that make sense without context
- Choose moments that would work well on TikTok, Instagram Reels, Twitter

Use precise timestamps based on the word-level timing data provided. Return ONLY the JSON response, no additional text.
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Parse the JSON response
      const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const analysisResult = JSON.parse(cleanedText);
      
      // Validate and clean the response
      return this.validateAndCleanResult(analysisResult);
    } catch (error) {
      console.error('Error analyzing transcript with Gemini:', error);
      throw new Error('Failed to analyze transcript');
    }
  }

  private validateAndCleanResult(result: any): GeminiAnalysisResult {
    // Validate chapters
    const chapters: GeminiChapter[] = (result.chapters || [])
      .filter((chapter: any) => 
        chapter.title && 
        typeof chapter.start_time === 'number' && 
        typeof chapter.end_time === 'number' &&
        chapter.end_time > chapter.start_time
      )
      .map((chapter: any) => ({
        title: String(chapter.title).substring(0, 200), // Limit title length
        start_time: Number(chapter.start_time),
        end_time: Number(chapter.end_time),
        summary: String(chapter.summary || '').substring(0, 500) // Limit summary length
      }));

    // Validate social clips
    const social_clips: GeminiSocialClip[] = (result.social_clips || [])
      .filter((clip: any) => 
        clip.title && 
        typeof clip.start_time === 'number' && 
        typeof clip.end_time === 'number' &&
        clip.end_time > clip.start_time &&
        clip.end_time - clip.start_time >= 10 && // At least 10 seconds
        clip.end_time - clip.start_time <= 120 // At most 2 minutes
      )
      .map((clip: any) => ({
        title: String(clip.title).substring(0, 200),
        start_time: Number(clip.start_time),
        end_time: Number(clip.end_time),
        engagement_score: Math.min(100, Math.max(0, Number(clip.engagement_score || 50))),
        engagement_label: String(clip.engagement_label || 'Interesting')
      }));

    return {
      chapters,
      social_clips
    };
  }

  // Method to generate more clips on demand
  async generateAdditionalClips(
    fullTranscript: string,
    existingClips: GeminiSocialClip[],
    transcriptWords: Array<{
      word: string;
      start_time: number;
      end_time: number;
      speaker?: string;
    }>
  ): Promise<GeminiSocialClip[]> {
    const existingTimeRanges = existingClips.map(clip => 
      `${clip.start_time}s-${clip.end_time}s: "${clip.title}"`
    ).join('\n');

    const prompt = `
You are an AI content analyst. Generate 3-5 NEW viral social media clips from this transcript, avoiding the time ranges already used.

TRANSCRIPT:
${fullTranscript}

EXISTING CLIPS (AVOID THESE TIME RANGES):
${existingTimeRanges}

WORD-LEVEL TIMING DATA:
${transcriptWords.slice(0, 500).map(word => 
  `${word.start_time.toFixed(2)}s: "${word.word}"${word.speaker ? ` (${word.speaker})` : ''}`
).join('\n')}

Find NEW segments with viral potential. Return ONLY JSON:

{
  "social_clips": [
    {
      "title": "Catchy clip title",
      "start_time": 15.2,
      "end_time": 45.8,
      "engagement_score": 85,
      "engagement_label": "High Impact"
    }
  ]
}

Requirements:
- 15-90 second clips
- High viral potential
- Don't overlap with existing clips
- Standalone segments that make sense without context
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const analysisResult = JSON.parse(cleanedText);
      
      return this.validateAndCleanResult({ social_clips: analysisResult.social_clips || [] }).social_clips;
    } catch (error) {
      console.error('Error generating additional clips:', error);
      throw new Error('Failed to generate additional clips');
    }
  }
}

export const geminiService = new GeminiService(); 
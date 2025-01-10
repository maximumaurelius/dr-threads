import Anthropic from '@anthropic-ai/sdk';

// Types for our medical case tweet generation
export interface MedicalCaseRequest {
  caseReport: string;
  tweetCount?: number;
  focusArea?: 'learning_points' | 'pathophysiology' | 'both';
}

export interface MedicalTweetResponse {
  tweets: string[];
  error?: string;
}

const MEDICAL_TWEET_PROMPT = `You are an excellent clinician with a gift for breaking down complex medical concepts, much like Richard Feynman did with physics. Your strength lies in distilling cases into clear, memorable learning points that combine scientific rigor with practical wisdom. You understand that medicine is both a science and a deeply human endeavor.

Your task is to transform the following medical case into {tweetCount} insightful tweets that will help other clinicians grow in their practice. Include one additional tweet that links to relevant high-quality research papers, case reports, or clinical guidelines that would help learners dive deeper into this topic.

Guidelines:
- Each tweet must be under 280 characters
- Make complex concepts simple but never simplistic
- Connect pathophysiology to practical clinical decision-making
- Remember the human elements of the case
- Use memorable analogies where helpful (like Feynman would)
- Include relevant hashtags ONLY where appropriate (e.g. #MedTwitter #MedEd). 
- Use British English spelling and grammar
- For the final tweet, cite 1-2 seminal papers or high-impact case reports from reputable journals (preferably open access)
- Use DOI links where possible for citations
- Consider linking to relevant clinical guidelines from major medical societies

{focusAreaPrompt}

Case Report: {caseReport}

Generate {tweetCount} educational tweets that weave together the science and humanity of this case, followed by one final tweet with carefully selected references for further learning.`;

// Medical Tweet Generation Service
export class ClaudeService {
  private anthropic: Anthropic;
  
  private getFocusAreaPrompt(focusArea: 'learning_points' | 'pathophysiology' | 'both'): string {
    switch (focusArea) {
      case 'learning_points':
        return 'Focus on key clinical pearls, diagnostic tips, and practical learning points that clinicians can apply in their practice.';
      case 'pathophysiology':
        return 'Explain the underlying disease mechanisms, physiological processes, and causal relationships in an engaging way.';
      case 'both':
      default:
        return 'Balance clinical pearls with pathophysiological explanations to create a comprehensive learning experience.';
    }
  }

  constructor() {
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('Anthropic API key is not set in environment variables');
    }
    this.anthropic = new Anthropic({
      apiKey,
      dangerouslyAllowBrowser: true
    });
  }

  async generateMedicalTweets({ 
    caseReport, 
    tweetCount = 3, 
    focusArea = 'both' 
  }: MedicalCaseRequest): Promise<MedicalTweetResponse> {
    try {
      const focusAreaPrompt = this.getFocusAreaPrompt(focusArea);
      const prompt = MEDICAL_TWEET_PROMPT
        .replace('{tweetCount}', tweetCount.toString())
        .replace('{focusAreaPrompt}', focusAreaPrompt)
        .replace('{caseReport}', caseReport);

      const message = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        temperature: 0.7,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      // Get the response text and split into individual tweets
      const response = message.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('\n\n');

      // Split the response into individual tweets
      const tweets = response.split('\n')
        .filter(tweet => tweet.trim().length > 0)
        .map(tweet => tweet.replace(/^\d+\.\s*/, '').trim()); // Remove numbering if present

      return {
        tweets: tweets.length > 0 ? tweets : ['No tweets generated']
      };
    } catch (error) {
      console.error('Error generating medical tweets:', error);
      return {
        tweets: [],
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      };
    }
  }
} 
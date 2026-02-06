import OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Analysis types
export interface TranscriptAnalysis {
  sentiment: "positive" | "neutral" | "negative";
  summary: string;
  keyPoints: string[];
  objections: string[];
  buyingSignals: string[];
  actionItems: string[];
  leadScore: number;
  competitorMentions: string[];
  coachingRecommendations: string[];
  closeProbability: number;
  nextBestAction: string;
  objectionCategories: Array<{
    category: string;
    objection: string;
    suggestedResponse: string;
  }>;
}

// Analyze transcript
export async function analyzeTranscript(transcript: string): Promise<TranscriptAnalysis> {
  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages: [
      {
        role: "system",
        content: `You are an expert call analyst. Analyze the following call transcript and extract:
1. Overall customer sentiment (positive/neutral/negative)
2. A brief summary (2-3 sentences)
3. Key points discussed
4. Customer objections raised
5. Buying signals detected
6. Action items or next steps
7. Lead score (1-100 based on likelihood to convert)
8. Competitor mentions (any competitor names or products mentioned)
9. Coaching recommendations (specific advice for the sales rep to improve)
10. Close probability (0-100, likelihood this deal closes)
11. Next best action (single most important follow-up action)
12. Objection categories (categorize each objection with a category name, the specific objection, and a suggested response)

Return your analysis as a JSON object with these exact fields:
- sentiment: "positive" | "neutral" | "negative"
- summary: string
- keyPoints: string[]
- objections: string[]
- buyingSignals: string[]
- actionItems: string[]
- leadScore: number
- competitorMentions: string[]
- coachingRecommendations: string[]
- closeProbability: number
- nextBestAction: string
- objectionCategories: Array<{ category: string, objection: string, suggestedResponse: string }>`,
      },
      { role: "user", content: transcript },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from OpenAI");
  }

  return JSON.parse(content) as TranscriptAnalysis;
}

// Generate call summary
export async function generateSummary(transcript: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages: [
      {
        role: "system",
        content:
          "You are a helpful assistant that summarizes phone call transcripts. Provide a concise 2-3 sentence summary of the key points and outcome of the call.",
      },
      { role: "user", content: transcript },
    ],
    temperature: 0.3,
    max_tokens: 200,
  });

  return response.choices[0]?.message?.content || "";
}

// Extract keywords/topics
export async function extractTopics(transcript: string): Promise<string[]> {
  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages: [
      {
        role: "system",
        content:
          "Extract the main topics discussed in this call transcript. Return as a JSON array of strings with 3-5 key topics.",
      },
      { role: "user", content: transcript },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) return [];

  const parsed = JSON.parse(content);
  return parsed.topics || [];
}

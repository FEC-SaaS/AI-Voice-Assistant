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
    model: "gpt-4o-mini",
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

// Interview analysis types
export interface InterviewAnalysis {
  overallScore: number;
  skillScores: Record<string, number>;
  strengths: string[];
  weaknesses: string[];
  cultureFit: string;
  communicationScore: number;
  experienceMatch: string;
  recommendation: "strong_yes" | "yes" | "maybe" | "no";
  summary: string;
  redFlags: string[];
  standoutMoments: string[];
}

// Analyze interview transcript
export async function analyzeInterviewTranscript(
  transcript: string,
  jobRequirements: { skills?: string[]; experience?: string; education?: string; questions?: string[] }
): Promise<InterviewAnalysis> {
  const skills = jobRequirements.skills || [];
  const skillsList = skills.length > 0 ? skills.join(", ") : "general professional skills";

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are an expert recruitment analyst. Analyze this interview transcript and evaluate the candidate against the job requirements.

Required skills to evaluate: ${skillsList}
Experience requirement: ${jobRequirements.experience || "Not specified"}
Education requirement: ${jobRequirements.education || "Not specified"}

Return your analysis as a JSON object with these exact fields:
- overallScore: number (0-100, overall candidate score)
- skillScores: object (key = skill name, value = score 0-100 for each required skill)
- strengths: string[] (3-5 candidate strengths demonstrated in the interview)
- weaknesses: string[] (2-4 areas of concern or gaps)
- cultureFit: string (brief assessment of culture fit based on communication style and values)
- communicationScore: number (0-100, how well they communicated)
- experienceMatch: string (brief assessment of how well their experience matches)
- recommendation: "strong_yes" | "yes" | "maybe" | "no" (hiring recommendation)
- summary: string (2-3 sentence executive summary of the candidate)
- redFlags: string[] (any concerning signals, empty array if none)
- standoutMoments: string[] (particularly impressive answers or moments)`,
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

  return JSON.parse(content) as InterviewAnalysis;
}

// Generate suggested interview questions from job description
export async function generateInterviewQuestions(
  jobTitle: string,
  jobDescription: string
): Promise<{ skills: string[]; questions: string[] }> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a recruitment expert. Given a job title and description, extract the key required skills and generate relevant interview questions.

Return a JSON object with:
- skills: string[] (5-8 key technical/professional skills required for this role)
- questions: string[] (5-7 targeted interview questions to evaluate candidates for this specific role)

Make questions behavioral and specific to the role, not generic. Include a mix of technical and situational questions.`,
      },
      {
        role: "user",
        content: `Job Title: ${jobTitle}\n\nJob Description:\n${jobDescription}`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.5,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from OpenAI");
  }

  return JSON.parse(content) as { skills: string[]; questions: string[] };
}

// Generate call summary
export async function generateSummary(transcript: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
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
    model: "gpt-4o-mini",
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

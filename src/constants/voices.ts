export interface Voice {
  id: string;
  name: string;
  provider: string;
  gender: "male" | "female";
  accent: string;
  description: string;
  previewUrl?: string;
}

export const VOICES: Voice[] = [
  // ElevenLabs voices
  {
    id: "rachel",
    name: "Rachel",
    provider: "elevenlabs",
    gender: "female",
    accent: "American",
    description: "Warm and professional female voice",
  },
  {
    id: "drew",
    name: "Drew",
    provider: "elevenlabs",
    gender: "male",
    accent: "American",
    description: "Friendly and approachable male voice",
  },
  {
    id: "clyde",
    name: "Clyde",
    provider: "elevenlabs",
    gender: "male",
    accent: "American",
    description: "Deep and authoritative male voice",
  },
  {
    id: "paul",
    name: "Paul",
    provider: "elevenlabs",
    gender: "male",
    accent: "American",
    description: "Clear and professional male voice",
  },
  {
    id: "domi",
    name: "Domi",
    provider: "elevenlabs",
    gender: "female",
    accent: "American",
    description: "Energetic and upbeat female voice",
  },
  {
    id: "dave",
    name: "Dave",
    provider: "elevenlabs",
    gender: "male",
    accent: "British",
    description: "Polished British male voice",
  },
  {
    id: "fin",
    name: "Fin",
    provider: "elevenlabs",
    gender: "male",
    accent: "Irish",
    description: "Friendly Irish male voice",
  },
  {
    id: "sarah",
    name: "Sarah",
    provider: "elevenlabs",
    gender: "female",
    accent: "American",
    description: "Natural and conversational female voice",
  },
  {
    id: "antoni",
    name: "Antoni",
    provider: "elevenlabs",
    gender: "male",
    accent: "American",
    description: "Smooth and calm male voice",
  },
  {
    id: "elli",
    name: "Elli",
    provider: "elevenlabs",
    gender: "female",
    accent: "American",
    description: "Young and cheerful female voice",
  },
  // PlayHT voices
  {
    id: "jennifer",
    name: "Jennifer",
    provider: "playht",
    gender: "female",
    accent: "American",
    description: "Professional American female voice",
  },
  {
    id: "michael",
    name: "Michael",
    provider: "playht",
    gender: "male",
    accent: "American",
    description: "Confident American male voice",
  },
  // Deepgram voices
  {
    id: "asteria",
    name: "Asteria",
    provider: "deepgram",
    gender: "female",
    accent: "American",
    description: "Clear and articulate female voice",
  },
  {
    id: "orion",
    name: "Orion",
    provider: "deepgram",
    gender: "male",
    accent: "American",
    description: "Rich and engaging male voice",
  },
];

export const VOICE_PROVIDERS = [
  { id: "elevenlabs", name: "ElevenLabs", premium: false },
  { id: "playht", name: "PlayHT", premium: false },
  { id: "deepgram", name: "Deepgram", premium: false },
] as const;

export function getVoice(voiceId: string): Voice | undefined {
  return VOICES.find((v) => v.id === voiceId);
}

export function getVoicesByProvider(provider: string): Voice[] {
  return VOICES.filter((v) => v.provider === provider);
}

export function getVoicesByGender(gender: "male" | "female"): Voice[] {
  return VOICES.filter((v) => v.gender === gender);
}

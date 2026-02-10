export interface Voice {
  id: string;
  name: string;
  provider: string;
  gender: "male" | "female";
  accent: string;
  description: string;
  previewUrl?: string;
}

// Vapi-supported voices - these work without any external credentials
export const VOICES: Voice[] = [
  // ============================================
  // VAPI BUILT-IN VOICES (Free, recommended)
  // ============================================
  {
    id: "Elliot",
    name: "Elliot",
    provider: "vapi",
    gender: "male",
    accent: "American",
    description: "Clear and professional male voice",
  },
  {
    id: "Rohan",
    name: "Rohan",
    provider: "vapi",
    gender: "male",
    accent: "American",
    description: "Confident and articulate male voice",
  },
  {
    id: "Savannah",
    name: "Savannah",
    provider: "vapi",
    gender: "female",
    accent: "American",
    description: "Energetic and upbeat female voice",
  },
  {
    id: "Leah",
    name: "Leah",
    provider: "vapi",
    gender: "female",
    accent: "American",
    description: "Young and cheerful female voice",
  },
  {
    id: "Tara",
    name: "Tara",
    provider: "vapi",
    gender: "female",
    accent: "American",
    description: "Confident female voice",
  },
  {
    id: "Jess",
    name: "Jess",
    provider: "vapi",
    gender: "female",
    accent: "American",
    description: "Casual and relatable female voice",
  },
  {
    id: "Leo",
    name: "Leo",
    provider: "vapi",
    gender: "male",
    accent: "American",
    description: "Smooth and calm male voice",
  },
  {
    id: "Dan",
    name: "Dan",
    provider: "vapi",
    gender: "male",
    accent: "American",
    description: "Reliable and trustworthy male voice",
  },
  {
    id: "Mia",
    name: "Mia",
    provider: "vapi",
    gender: "female",
    accent: "American",
    description: "Bright and pleasant female voice",
  },
  {
    id: "Zac",
    name: "Zac",
    provider: "vapi",
    gender: "male",
    accent: "American",
    description: "Youthful and energetic male voice",
  },
  {
    id: "Zoe",
    name: "Zoe",
    provider: "vapi",
    gender: "female",
    accent: "American",
    description: "Modern and dynamic female voice",
  },

  // ============================================
  // DEEPGRAM VOICES (Free through Vapi)
  // ============================================
  {
    id: "luna",
    name: "Luna",
    provider: "deepgram",
    gender: "female",
    accent: "American",
    description: "Soft and soothing female voice",
  },
  {
    id: "stella",
    name: "Stella",
    provider: "deepgram",
    gender: "female",
    accent: "American",
    description: "Bright and engaging female voice",
  },
  {
    id: "athena",
    name: "Athena",
    provider: "deepgram",
    gender: "female",
    accent: "American",
    description: "Wise and professional female voice",
  },
  {
    id: "hera",
    name: "Hera",
    provider: "deepgram",
    gender: "female",
    accent: "American",
    description: "Authoritative female voice",
  },
  {
    id: "orion",
    name: "Orion",
    provider: "deepgram",
    gender: "male",
    accent: "American",
    description: "Rich and engaging male voice",
  },
  {
    id: "arcas",
    name: "Arcas",
    provider: "deepgram",
    gender: "male",
    accent: "American",
    description: "Strong and confident male voice",
  },
  {
    id: "perseus",
    name: "Perseus",
    provider: "deepgram",
    gender: "male",
    accent: "American",
    description: "Heroic and commanding male voice",
  },
  {
    id: "angus",
    name: "Angus",
    provider: "deepgram",
    gender: "male",
    accent: "American",
    description: "Friendly and approachable male voice",
  },
  {
    id: "orpheus",
    name: "Orpheus",
    provider: "deepgram",
    gender: "male",
    accent: "American",
    description: "Melodic and pleasant male voice",
  },
  {
    id: "helios",
    name: "Helios",
    provider: "deepgram",
    gender: "male",
    accent: "American",
    description: "Warm and radiant male voice",
  },
  {
    id: "zeus",
    name: "Zeus",
    provider: "deepgram",
    gender: "male",
    accent: "American",
    description: "Powerful and authoritative male voice",
  },
];

export const VOICE_PROVIDERS = [
  { id: "vapi", name: "Standard (Recommended)", premium: false, description: "Free built-in voices, no setup required" },
  { id: "deepgram", name: "Deepgram", premium: false, description: "High-quality AI voices" },
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

// Get the default voice for a provider
export function getDefaultVoiceForProvider(provider: string): Voice | undefined {
  const voices = getVoicesByProvider(provider);
  return voices[0];
}

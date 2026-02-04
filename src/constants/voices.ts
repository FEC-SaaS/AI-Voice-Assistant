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
    id: "Kylie",
    name: "Kylie",
    provider: "vapi",
    gender: "female",
    accent: "American",
    description: "Friendly and warm female voice",
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
    id: "Lily",
    name: "Lily",
    provider: "vapi",
    gender: "female",
    accent: "American",
    description: "Soft and approachable female voice",
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
    id: "Hana",
    name: "Hana",
    provider: "vapi",
    gender: "female",
    accent: "American",
    description: "Calm and professional female voice",
  },
  {
    id: "Neha",
    name: "Neha",
    provider: "vapi",
    gender: "female",
    accent: "American",
    description: "Warm and conversational female voice",
  },
  {
    id: "Cole",
    name: "Cole",
    provider: "vapi",
    gender: "male",
    accent: "American",
    description: "Deep and authoritative male voice",
  },
  {
    id: "Harry",
    name: "Harry",
    provider: "vapi",
    gender: "male",
    accent: "British",
    description: "Polished British male voice",
  },
  {
    id: "Paige",
    name: "Paige",
    provider: "vapi",
    gender: "female",
    accent: "American",
    description: "Natural and engaging female voice",
  },
  {
    id: "Spencer",
    name: "Spencer",
    provider: "vapi",
    gender: "male",
    accent: "American",
    description: "Friendly and casual male voice",
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
    id: "asteria",
    name: "Asteria",
    provider: "deepgram",
    gender: "female",
    accent: "American",
    description: "Clear and articulate female voice",
  },
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
  {
    id: "apollo",
    name: "Apollo",
    provider: "deepgram",
    gender: "male",
    accent: "American",
    description: "Artistic and expressive male voice",
  },

  // ============================================
  // PLAYHT VOICES (Vapi stock - no credentials needed)
  // ============================================
  {
    id: "jennifer",
    name: "Jennifer",
    provider: "playht",
    gender: "female",
    accent: "American",
    description: "Professional American female voice",
  },
  {
    id: "melissa",
    name: "Melissa",
    provider: "playht",
    gender: "female",
    accent: "American",
    description: "Warm and friendly female voice",
  },
  {
    id: "will",
    name: "Will",
    provider: "playht",
    gender: "male",
    accent: "American",
    description: "Confident American male voice",
  },
  {
    id: "chris",
    name: "Chris",
    provider: "playht",
    gender: "male",
    accent: "American",
    description: "Casual and relatable male voice",
  },
  {
    id: "matt",
    name: "Matt",
    provider: "playht",
    gender: "male",
    accent: "American",
    description: "Professional male voice",
  },
  {
    id: "jack",
    name: "Jack",
    provider: "playht",
    gender: "male",
    accent: "American",
    description: "Friendly male voice",
  },
  {
    id: "ruby",
    name: "Ruby",
    provider: "playht",
    gender: "female",
    accent: "American",
    description: "Energetic female voice",
  },
  {
    id: "davis",
    name: "Davis",
    provider: "playht",
    gender: "male",
    accent: "American",
    description: "Clear and articulate male voice",
  },

  // ============================================
  // 11LABS VOICES (Vapi stock - no credentials needed)
  // Note: These require 11labs credentials configured in Vapi
  // or use their stock voices
  // ============================================
  {
    id: "burt",
    name: "Burt",
    provider: "11labs",
    gender: "male",
    accent: "American",
    description: "Deep and mature male voice",
  },
  {
    id: "marissa",
    name: "Marissa",
    provider: "11labs",
    gender: "female",
    accent: "American",
    description: "Warm and professional female voice",
  },
  {
    id: "andrea",
    name: "Andrea",
    provider: "11labs",
    gender: "female",
    accent: "American",
    description: "Soft and gentle female voice",
  },
  {
    id: "sarah",
    name: "Sarah",
    provider: "11labs",
    gender: "female",
    accent: "American",
    description: "Natural and conversational female voice",
  },
  {
    id: "phillip",
    name: "Phillip",
    provider: "11labs",
    gender: "male",
    accent: "American",
    description: "Authoritative male voice",
  },
  {
    id: "steve",
    name: "Steve",
    provider: "11labs",
    gender: "male",
    accent: "American",
    description: "Friendly and approachable male voice",
  },
];

export const VOICE_PROVIDERS = [
  { id: "vapi", name: "Standard (Recommended)", premium: false, description: "Free built-in voices, no setup required" },
  { id: "deepgram", name: "Deepgram", premium: false, description: "High-quality AI voices" },
  { id: "playht", name: "PlayHT", premium: false, description: "Natural sounding voices" },
  { id: "11labs", name: "ElevenLabs", premium: true, description: "Premium voices (may require credentials)" },
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

/**
 * Generate pre-recorded audio files for the Talk to Agent demo.
 * Uses OpenAI's TTS API to create natural-sounding voice clips.
 *
 * Run: node scripts/generate-demo-audio.mjs
 *
 * Voices:
 * - Atlas (male agent): "onyx" - deep, authoritative male
 * - Aria (female agent): "nova" - warm, friendly female
 * - Customer (male, for Aria scripts): "echo" - natural male
 * - Customer (female, for Atlas scripts): "shimmer" - natural female
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, "..", "public", "audio", "demo");

// Load .env manually
const envPath = path.join(__dirname, "..", ".env");
const envContent = fs.readFileSync(envPath, "utf-8");
const apiKeyMatch = envContent.match(/^OPENAI_API_KEY=(.+)$/m);
const OPENAI_API_KEY = apiKeyMatch?.[1]?.trim();

if (!OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY not found in .env");
  process.exit(1);
}

// ═══════════════════════════════════════════════════
// ATLAS SCRIPTS (Male agent - "onyx", Female customer - "shimmer")
// ═══════════════════════════════════════════════════

const ATLAS_1_DENTAL = [
  { role: "agent", text: "Hey there! Thanks for checking out CallTone. I'm Atlas, your AI-powered business phone assistant. What kind of business are you running?" },
  { role: "customer", text: "I run a dental practice. We miss a lot of calls during procedures." },
  { role: "agent", text: "That's super common with dental offices. You're literally hands-in-mouth, can't pick up the phone. And every missed call is potentially a new patient walking to your competitor." },
  { role: "agent", text: "That's exactly what I handle. I pick up every single call, 24/7. I answer questions about your services, book appointments right into your calendar, and send the caller a confirmation text. All while you focus on your patients." },
  { role: "customer", text: "That sounds great. How does the appointment scheduling work?" },
  { role: "agent", text: "I ask the caller for their preferred date and time, check your real-time availability, and book it on the spot. They get an instant confirmation by email and text. No back-and-forth, no phone tag." },
  { role: "customer", text: "What if someone calls after hours or on weekends?" },
  { role: "agent", text: "I never sleep! Nights, weekends, holidays, I'm always here. After-hours callers get the same friendly, professional experience. I can even text you a summary of every call so you start your morning fully caught up." },
  { role: "customer", text: "Wow, that would save us so much time. How do I get started?" },
  { role: "agent", text: "It's really easy. Just sign up on our website and you can build your own AI phone agent in about two minutes. You'll be up and running before your next patient walks in!" },
  { role: "customer", text: "That sounds awesome. Thanks, Atlas!" },
  { role: "agent", text: "You're welcome! You're going to love having me on your team. Thanks for chatting and welcome to CallTone. Have a great day!" },
];

const ATLAS_2_LAW = [
  { role: "agent", text: "Hey! I'm Atlas from CallTone. I help businesses handle their phone calls with AI. Tell me, what kind of work do you do?" },
  { role: "customer", text: "I'm a personal injury attorney. My team is in court half the day and we miss way too many new client calls." },
  { role: "agent", text: "Oh, I hear that a lot from law firms. When someone's been in an accident, they're calling three or four attorneys. The first one who picks up usually gets the case." },
  { role: "customer", text: "Exactly. That's our biggest problem. By the time we call back, they've already hired someone else." },
  { role: "agent", text: "That's where I come in. I answer every call instantly, I qualify the lead by asking about their case, collect their contact info, and book a consultation right into your calendar. The caller feels taken care of, and you don't lose the case." },
  { role: "customer", text: "Can you handle sensitive conversations? Legal calls can be pretty emotional." },
  { role: "agent", text: "Absolutely. I'm trained to be empathetic and professional. I listen carefully, I don't rush people, and I make sure they feel heard. I can also route urgent calls directly to your cell if it's a high-priority situation." },
  { role: "customer", text: "What about intake forms? We need specific information from potential clients." },
  { role: "agent", text: "I can gather all the details you need during the call, like the type of incident, when it happened, insurance info, whatever your intake process requires. Then I send you a clean summary so you're fully prepped before the consultation." },
  { role: "customer", text: "That's impressive. How quickly can we get this set up?" },
  { role: "agent", text: "You can be live in about two minutes. Just sign up, customize my script with your firm's details, and connect your phone number. It's that simple." },
  { role: "customer", text: "I think we need this. Thanks, Atlas!" },
  { role: "agent", text: "My pleasure! You're going to capture so many more cases. Welcome to CallTone, and good luck in court!" },
];

const ATLAS_3_AUTO = [
  { role: "agent", text: "What's up! I'm Atlas, your AI phone assistant from CallTone. What line of work are you in?" },
  { role: "customer", text: "I own an auto repair shop. We're always under the hood and can't get to the phone." },
  { role: "agent", text: "Classic problem for auto shops. Your hands are covered in grease, the lift is up, you can't just drop everything to answer a call. But that caller might need a brake job worth five hundred bucks." },
  { role: "customer", text: "Right! And half the time it goes to voicemail and they just call the next shop." },
  { role: "agent", text: "Not anymore. I pick up every single call. I can answer questions about your services, give estimated turnaround times, and schedule drop-offs based on your availability. The customer gets helped immediately, and you don't lose the job." },
  { role: "customer", text: "What if they're asking about pricing? I can't have you quoting wrong prices." },
  { role: "agent", text: "Great question. You set up your service menu with price ranges, and I'll give accurate quotes based on what you've told me. For anything custom, I let them know you'll provide a detailed estimate after inspection, and I book them in." },
  { role: "customer", text: "Can you handle the tow truck calls? Those are usually emergencies." },
  { role: "agent", text: "For sure. I can flag emergency calls as high priority and immediately text or call you so you can dispatch. The customer gets reassurance right away, and you get the alert in seconds." },
  { role: "customer", text: "This sounds like exactly what we need. What's the setup like?" },
  { role: "agent", text: "Super easy. Sign up, plug in your services and hours, and forward your number. Takes about two minutes and you're live. No complicated tech stuff at all." },
  { role: "customer", text: "Love it. Thanks, Atlas!" },
  { role: "agent", text: "You got it! No more missed calls, no more lost jobs. Welcome to CallTone!" },
];

const ATLAS_4_REALESTATE = [
  { role: "agent", text: "Hey there! Atlas here from CallTone. I'm an AI phone assistant that helps businesses never miss a call. What do you do?" },
  { role: "customer", text: "I'm a real estate agent. I'm constantly in showings and open houses and I miss leads all day." },
  { role: "agent", text: "Real estate is tough for that. You're driving between properties, you're mid-showing with a buyer, and your phone's buzzing with a potential seller. You can't just pause the tour to take it." },
  { role: "customer", text: "Exactly. And in this market, if you don't respond fast, another agent grabs them." },
  { role: "agent", text: "That's the thing, speed to lead is everything in real estate. I answer every call instantly. I find out if they're buying or selling, what area they're interested in, their budget range, and their timeline. Then I book a callback or showing with you." },
  { role: "customer", text: "Can you answer questions about specific listings?" },
  { role: "agent", text: "Yep! You can load your active listings into the system, and I'll share details like price, square footage, bedrooms, and open house times. I can even send them the listing link via text while we're on the call." },
  { role: "customer", text: "That's really smart. What about after-hours inquiries from Zillow or Realtor.com?" },
  { role: "agent", text: "Those are some of your best leads, and they usually come in evenings and weekends. I handle those calls 24/7 with the same energy and professionalism. You wake up to qualified leads instead of missed calls." },
  { role: "customer", text: "Alright, I'm convinced. How do I start?" },
  { role: "agent", text: "Just head to our website and sign up. You'll have your AI assistant live in a couple minutes. Your competitors won't know what hit them." },
  { role: "customer", text: "Ha! Love the confidence. Thanks, Atlas!" },
  { role: "agent", text: "Anytime! Go close some deals. Welcome to CallTone!" },
];

// ═══════════════════════════════════════════════════
// ARIA SCRIPTS (Female agent - "nova", Male customer - "echo")
// ═══════════════════════════════════════════════════

const ARIA_1_PLUMBING = [
  { role: "agent", text: "Hi there! I'm Aria, your AI voice agent from CallTone. I help businesses never miss a customer call. What industry are you in?" },
  { role: "customer", text: "I own a plumbing company. We get a ton of calls when my guys are out on jobs." },
  { role: "agent", text: "Plumbing is one of the busiest industries for inbound calls. Emergencies don't wait, and neither should your customers. I answer those calls instantly, day or night." },
  { role: "agent", text: "I gather the caller's info, describe your services, and schedule a visit based on your crew's availability. If it's an emergency, I flag it as high priority so you see it right away." },
  { role: "customer", text: "What about after-hours calls? We get a lot of those." },
  { role: "agent", text: "That's where I really shine. I work 24/7, weekends and holidays included. After-hours callers get the same professional experience. And I can send you a text alert for urgent calls so nothing falls through the cracks." },
  { role: "customer", text: "That's huge. We've definitely lost jobs because nobody picked up the phone." },
  { role: "agent", text: "Exactly, and that's the real cost of missed calls. Every unanswered ring is a job that goes to your competitor. With me handling your phones, you capture every single lead, even when your whole crew is out on jobs." },
  { role: "customer", text: "Alright, I'm sold. How do I set this up?" },
  { role: "agent", text: "Super easy! Sign up on our website and you'll have your own AI receptionist live in about two minutes. Your team will wonder how they ever managed without it." },
  { role: "customer", text: "Love it. Thanks, Aria!" },
  { role: "agent", text: "Thank you! I think you're really going to see a difference. Welcome to CallTone and have a fantastic day!" },
];

const ARIA_2_MEDICAL = [
  { role: "agent", text: "Hi! I'm Aria from CallTone. I'm an AI phone assistant that helps businesses manage their calls. What kind of practice do you run?" },
  { role: "customer", text: "I run a family medical clinic. Our front desk is overwhelmed with calls, patients are waiting on hold, it's a mess." },
  { role: "agent", text: "That's so common in medical offices. Your receptionist is checking in patients, handling insurance questions, and the phone just keeps ringing. Something's gotta give." },
  { role: "customer", text: "Exactly. We've even had patients complain they couldn't get through to book appointments." },
  { role: "agent", text: "That's a big deal because those patients will eventually find a clinic that does pick up. I solve that by answering every call immediately. I can schedule appointments, answer questions about your services and hours, and route urgent medical concerns to your staff." },
  { role: "customer", text: "What about prescription refill requests? We get those constantly." },
  { role: "agent", text: "I can take down the refill details, patient name, medication, pharmacy, and send them to your staff in an organized message. Your nurses can process them in batch instead of being interrupted all day." },
  { role: "customer", text: "Can you handle appointment reminders too?" },
  { role: "agent", text: "Absolutely! I can call or text patients with appointment reminders and even handle rescheduling if they need to change. That alone cuts no-shows by a huge amount, which means more revenue for your practice." },
  { role: "customer", text: "This could really transform how we operate. What's the cost look like?" },
  { role: "agent", text: "Way less than hiring another receptionist, I can tell you that. Just sign up on our website and you can try it out. Most clinics are up and running the same day." },
  { role: "customer", text: "Perfect. Thanks so much, Aria!" },
  { role: "agent", text: "You're so welcome! Your patients are going to love the experience. Welcome to CallTone!" },
];

const ARIA_3_SALON = [
  { role: "agent", text: "Hey there! I'm Aria, your AI phone assistant from CallTone. Tell me about your business!" },
  { role: "customer", text: "I own a hair salon and spa. We're always with clients and can't pick up the phone." },
  { role: "agent", text: "Oh I totally get that. You're mid-color, your hands are in foils, and the phone is ringing off the hook. You can't just stop what you're doing, but that caller wants to book a blowout for Saturday." },
  { role: "customer", text: "Yes! And our receptionist can only handle so much. During peak hours it's impossible." },
  { role: "agent", text: "That's exactly my sweet spot. I answer every call, book appointments based on stylist availability, and even handle specific requests like who they want to see or what service they need. The whole thing syncs with your calendar in real time." },
  { role: "customer", text: "What about walk-in availability? Sometimes people call to check if we have openings right now." },
  { role: "agent", text: "I can check your live schedule and let them know the earliest available slot. If there's a cancellation, I can fill it instantly by reaching out to your waitlist. That means fewer empty chairs and more revenue." },
  { role: "customer", text: "Oh wow, the waitlist thing is really cool. Do you send appointment confirmations?" },
  { role: "agent", text: "Of course! Text and email confirmations go out automatically. Plus I send reminders before the appointment so you get fewer no-shows. And if someone needs to cancel, I help them reschedule right away." },
  { role: "customer", text: "I think my whole team would love this. How do we get started?" },
  { role: "agent", text: "Just sign up online and add your stylists and services. You'll be live in minutes. Your clients will think you hired a super-organized receptionist!" },
  { role: "customer", text: "Ha! That's exactly what we need. Thanks, Aria!" },
  { role: "agent", text: "Thank you! Your salon is going to run so smoothly. Welcome to CallTone!" },
];

const ARIA_4_RESTAURANT = [
  { role: "agent", text: "Hi there! Aria here from CallTone. I'm an AI assistant that answers business calls. What do you do?" },
  { role: "customer", text: "I manage a restaurant. During dinner rush, nobody can answer the phone and we lose tons of reservation calls." },
  { role: "agent", text: "Oh, restaurants are one of my favorite use cases. Your staff is running food, bussing tables, greeting guests, and meanwhile the phone is ringing with someone wanting a table for six on Friday night." },
  { role: "customer", text: "That's literally every Friday and Saturday for us. We probably lose twenty reservations a week." },
  { role: "agent", text: "That's real money walking out the door. I answer every call instantly and handle reservations, party sizes, special requests, dietary needs, all of it. I plug right into your booking system so there's no double-booking." },
  { role: "customer", text: "What about takeout and delivery orders?" },
  { role: "agent", text: "I can walk callers through your menu, take their order, confirm the details, and even give them an estimated pickup time. It's like having a dedicated phone operator who never gets flustered during the rush." },
  { role: "customer", text: "People always ask about our specials and hours too." },
  { role: "agent", text: "Easy! You update your specials in the dashboard and I share them with every caller. Same with hours, location, parking info, private dining options, whatever you need. I'm always up to date." },
  { role: "customer", text: "This is exactly what we've been looking for. How fast can we set it up?" },
  { role: "agent", text: "You can be live before tonight's dinner rush! Just sign up, add your menu and hours, and connect your phone number. Takes about two minutes." },
  { role: "customer", text: "That's incredible. Thanks, Aria!" },
  { role: "agent", text: "My pleasure! Your tables are about to stay full. Welcome to CallTone and bon appetit!" },
];

// ═══════════════════════════════════════════════════

const ALL_SCRIPTS = [
  { name: "atlas_1", script: ATLAS_1_DENTAL, agentVoice: "onyx", customerVoice: "shimmer" },
  { name: "atlas_2", script: ATLAS_2_LAW, agentVoice: "onyx", customerVoice: "shimmer" },
  { name: "atlas_3", script: ATLAS_3_AUTO, agentVoice: "onyx", customerVoice: "shimmer" },
  { name: "atlas_4", script: ATLAS_4_REALESTATE, agentVoice: "onyx", customerVoice: "shimmer" },
  { name: "aria_1", script: ARIA_1_PLUMBING, agentVoice: "nova", customerVoice: "echo" },
  { name: "aria_2", script: ARIA_2_MEDICAL, agentVoice: "nova", customerVoice: "echo" },
  { name: "aria_3", script: ARIA_3_SALON, agentVoice: "nova", customerVoice: "echo" },
  { name: "aria_4", script: ARIA_4_RESTAURANT, agentVoice: "nova", customerVoice: "echo" },
];

async function generateAudio(text, voice, outputPath) {
  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1-hd",
      input: text,
      voice: voice,
      response_format: "mp3",
      speed: 1.0,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI TTS API error (${response.status}): ${err}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(outputPath, buffer);
  const sizeKB = (buffer.length / 1024).toFixed(1);
  console.log(`    -> ${path.basename(outputPath)} (${sizeKB} KB)`);
}

async function generateScript({ name, script, agentVoice, customerVoice }) {
  console.log(`\n[${name}] Generating ${script.length} lines...`);
  console.log(`  Agent: ${agentVoice}, Customer: ${customerVoice}`);

  for (let i = 0; i < script.length; i++) {
    const line = script[i];
    const voice = line.role === "agent" ? agentVoice : customerVoice;
    const filename = `${name}_${String(i).padStart(2, "0")}_${line.role}.mp3`;
    const outputPath = path.join(OUTPUT_DIR, filename);

    if (fs.existsSync(outputPath)) {
      console.log(`  [skip] ${filename} (already exists)`);
      continue;
    }

    console.log(`  [${i + 1}/${script.length}] ${line.role}: "${line.text.substring(0, 60)}..."`);
    await generateAudio(line.text, voice, outputPath);
    await new Promise((r) => setTimeout(r, 400));
  }
}

async function main() {
  console.log("=== CallTone Demo Audio Generator ===");
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log(`Scripts: ${ALL_SCRIPTS.length} (${ALL_SCRIPTS.reduce((s, x) => s + x.script.length, 0)} total lines)`);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  for (const entry of ALL_SCRIPTS) {
    await generateScript(entry);
  }

  const files = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith(".mp3"));
  const totalSize = files.reduce((sum, f) => sum + fs.statSync(path.join(OUTPUT_DIR, f)).size, 0);
  console.log(`\nDone! ${files.length} audio files (${(totalSize / 1024 / 1024).toFixed(1)} MB total)`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});

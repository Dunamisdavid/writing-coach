import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SCENARIO_PERSONAS: Record<string, string> = {
  interview: "You are a professional but friendly hiring manager conducting a job interview. Ask one relevant question at a time, react naturally to answers, and keep the conversation moving like a real interview.",
  client: "You are a busy but polite client in a business meeting discussing a project. Raise realistic concerns, ask about timelines and budget, and respond like a real stakeholder would.",
  negotiation: "You are a firm but fair counterpart in a business negotiation. Push back reasonably on offers, but stay open to a good deal.",
  support: "You are a mildly frustrated customer contacting support about a product issue. Start somewhat annoyed but respond well to good service.",
  casual: "You are a friendly acquaintance catching up casually over coffee. Keep it light, ask follow-up questions, share small reactions.",
};

export async function POST(req: NextRequest) {
  const { scenario, messages } = await req.json();
  const persona = SCENARIO_PERSONAS[scenario] || SCENARIO_PERSONAS.casual;

  const history = messages
    .map((m: any) => `${m.role === 'user' ? 'Learner' : 'You'}: ${m.content}`)
    .join('\n');

  const prompt = `${persona}
You are talking with a non-native English speaker practicing their conversation skills. Keep your replies natural, conversational, and SHORT (1-3 sentences) — like a real spoken exchange, not an essay. Never break character or mention that this is practice.

Conversation so far:
${history}

Respond with ONLY your next line of dialogue, nothing else — no labels, no quotes.`;

  try {
    const response = await ai.models.generateContent({ model: 'gemini-flash-lite-latest', contents: prompt });
    return NextResponse.json({ reply: (response.text ?? '').trim() });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Roleplay failed' }, { status: 500 });
  }
}
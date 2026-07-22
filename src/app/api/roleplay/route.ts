import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: NextRequest) {
  const { persona, messages } = await req.json();

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
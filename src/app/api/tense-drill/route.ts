import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function GET() {
  const entries = await prisma.entry.findMany({ select: { corrections: true } });
  const tenseIssues: string[] = [];
  for (const e of entries) {
    const corrections = (e.corrections as any[]) || [];
    for (const c of corrections) {
      if (/tense/i.test(c.tag || '')) tenseIssues.push(`"${c.original}" → "${c.fixed}"`);
    }
  }
  const context = tenseIssues.length
    ? `This learner has specifically struggled with these past tense mistakes: ${tenseIssues.slice(0, 8).join('; ')}. Generate drills that target similar patterns.`
    : `This learner is a professional web developer practicing English tenses generally.`;

  const prompt = `You are an English tense-drill generator. ${context}
Generate exactly 5 multiple-choice fill-in-the-blank questions testing English verb tenses (mix of present perfect, past simple, past perfect, future, conditionals).
Respond with ONLY a raw JSON array (no markdown fences, no preamble) in this exact shape:
[
  {
    "sentence": "I ___ the report yesterday.",
    "options": ["see", "saw", "have seen", "had seen"],
    "correctIndex": 1,
    "explanation": "one short sentence explaining why this tense is correct here"
  }
]`;

  try {
    const response = await ai.models.generateContent({ model: 'gemini-flash-lite-latest', contents: prompt });
    const clean = (response.text ?? '').replace(/```json|```/g, '').trim();
    const questions = JSON.parse(clean);
    return NextResponse.json(questions);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Could not generate drill' }, { status: 500 });
  }
}
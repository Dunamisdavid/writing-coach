import { GoogleGenAI, Modality } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: NextRequest) {
  const { voiceName } = await req.json().catch(() => ({ voiceName: 'Kore' }));

  try {
    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        liveConnectConstraints: {
          model: 'gemini-2.5-flash-native-audio-preview-12-2025',
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName || 'Kore' } },
            },
          },
        },
      },
    });
    return NextResponse.json({ token: token.name });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Could not create session token' }, { status: 500 });
  }
}
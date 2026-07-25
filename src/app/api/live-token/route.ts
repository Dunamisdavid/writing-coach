import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST() {
    try {
        const token = await ai.authTokens.create({
            config: {
                uses: 1,
                expireTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // valid 30 min
                liveConnectConstraints: {
                    model: 'gemini-2.5-flash-native-audio-preview-12-2025',
                },
            },
        });
        return NextResponse.json({ token: token.name });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Could not create session token' }, { status: 500 });
    }
}
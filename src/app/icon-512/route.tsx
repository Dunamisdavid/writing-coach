import { ImageResponse } from 'next/og';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 290,
          background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
        }}
      >
        ✦
      </div>
    ),
    { width: 512, height: 512 }
  );
}
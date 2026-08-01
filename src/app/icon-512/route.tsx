import { ImageResponse } from 'next/og';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 36,
          background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
        }}
      >
        {[105, 225, 320, 200, 130].map((h, i) => (
          <div key={i} style={{ width: 42, height: h, background: 'white', borderRadius: 24 }} />
        ))}
      </div>
    ),
    { width: 512, height: 512 }
  );
}
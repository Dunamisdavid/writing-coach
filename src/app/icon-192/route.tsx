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
          gap: 14,
          background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
        }}
      >
        {[40, 85, 120, 75, 50].map((h, i) => (
          <div key={i} style={{ width: 16, height: h, background: 'white', borderRadius: 10 }} />
        ))}
      </div>
    ),
    { width: 192, height: 192 }
  );
}
import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
          borderRadius: 8,
        }}
      >
        {[6, 14, 20, 12, 8].map((h, i) => (
          <div key={i} style={{ width: 3, height: h, background: 'white', borderRadius: 2 }} />
        ))}
      </div>
    ),
    size
  );
}
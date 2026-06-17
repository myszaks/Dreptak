import { ImageResponse } from '@vercel/og'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const title = searchParams.get('title') ?? 'Dreptak Challenge'
  const steps = searchParams.get('steps') ?? '0'
  const rank = searchParams.get('rank') ?? '1'

  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '24px',
          fontFamily: 'system-ui',
        }}
      >
        <div style={{ fontSize: 80 }}>👟</div>
        <div
          style={{
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            fontSize: 56,
            fontWeight: 900,
            letterSpacing: '-2px',
          }}
        >
          Dreptak
        </div>
        <div
          style={{
            color: 'rgba(255,255,255,0.8)',
            fontSize: 28,
            fontWeight: 700,
            textAlign: 'center',
            maxWidth: 700,
          }}
        >
          {title}
        </div>
        {parseInt(steps) > 0 && (
          <div
            style={{
              color: '#4ade80',
              fontSize: 40,
              fontWeight: 900,
            }}
          >
            {parseInt(steps).toLocaleString('pl-PL')} kroków
          </div>
        )}
        <div
          style={{
            color: 'rgba(255,255,255,0.4)',
            fontSize: 18,
          }}
        >
          dreptak.app
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}

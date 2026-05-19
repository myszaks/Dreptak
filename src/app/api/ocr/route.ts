import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

const PROMPT = `This is a screenshot from a health or fitness app (Apple Health, Google Fit, Samsung Health, etc.).
Your task: find and return ONLY the step count (number of steps walked today or on the displayed day).

Rules:
- Reply with ONLY a single integer number (e.g. 8532)
- Do NOT include any text, units, commas, spaces or explanations
- If you see multiple numbers, pick the one that represents the daily step count (usually the largest prominent number on the steps screen, NOT a goal/target or a graph axis value)
- If you genuinely cannot find a step count, reply with the word: null`

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 })
  }

  try {
    const formData = await req.formData()
    const image = formData.get('image') as File | null
    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    // Limit size — Gemini accepts up to 20MB inline
    if (image.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image too large (max 20MB)' }, { status: 400 })
    }

    const bytes = await image.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')
    const mimeType = (image.type || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp'

    const genAI = new GoogleGenerativeAI(apiKey)

    // Try models in order of preference
    const modelNames = ['gemini-2.5-flash', 'gemini-2.0-flash']
    let result: Awaited<ReturnType<ReturnType<typeof genAI.getGenerativeModel>['generateContent']>> | null = null
    let lastError: unknown = null
    for (const modelName of modelNames) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName })
        result = await model.generateContent([
          { inlineData: { mimeType, data: base64 } },
          PROMPT,
        ])
        break
      } catch (e: any) {
        lastError = e
        if (e?.status === 404) continue   // model not available, try next
        throw e                            // quota/auth errors — bubble up immediately
      }
    }
    if (!result) throw lastError

    const text = result.response.text().trim()
    console.log('[Gemini OCR] raw response:', text)

    if (text === 'null' || text === '') {
      return NextResponse.json({ steps: null })
    }

    const steps = parseInt(text.replace(/\D/g, ''), 10)
    return NextResponse.json({ steps: isNaN(steps) ? null : steps })
  } catch (err: any) {
    console.error('[Gemini OCR] error:', err)
    if (err?.status === 429) {
      return NextResponse.json(
        { error: 'quota_exceeded', message: 'Limit API wyczerpany. Sprawdź klucz GEMINI_API_KEY — potrzebujesz klucza z konta osobistego (nie firmowego) lub włącz billing w Google Cloud.' },
        { status: 429 }
      )
    }
    return NextResponse.json({ error: 'OCR failed' }, { status: 500 })
  }
}

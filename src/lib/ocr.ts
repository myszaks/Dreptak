/**
 * OCR utilities for step count extraction from health app screenshots
 * Supports: Apple Health, Google Fit, Samsung Health
 */

export interface OCRResult {
  steps: number | null
  confidence: number
  rawText: string
  candidates: number[]
}

/**
 * Parse raw OCR text and extract the most likely step count
 */
export function extractStepsFromText(rawText: string): OCRResult {
  const cleaned = rawText.replace(/\r\n/g, '\n').trim()

  // Extract all number candidates (handles formats: 10523, 10 523, 10,523, 10.523, 49)
  const numberPatterns = [
    // Large numbers with spaces (Polish format): 10 523
    /\b(\d{1,3}(?:\s\d{3})+)\b/g,
    // Large numbers with commas: 10,523
    /\b(\d{1,3}(?:,\d{3})+)\b/g,
    // Large numbers with dots (European): 10.523
    /\b(\d{1,3}(?:\.\d{3})+)\b/g,
    // Plain numbers 1-6 digits: 10523, 8532, 49, 0
    /\b(\d{1,6})\b/g,
  ]

  const candidates = new Set<number>()

  for (const pattern of numberPatterns) {
    const matches = cleaned.matchAll(pattern)
    for (const match of matches) {
      const raw = match[1]
      const normalized = raw.replace(/[\s,\.]/g, '')
      const num = parseInt(normalized, 10)
      if (isValidStepCount(num)) {
        candidates.add(num)
      }
    }
  }

  const candidateArray = Array.from(candidates).sort((a, b) => b - a)

  // Heuristics for the most likely step count
  const bestCandidate = pickBestCandidate(candidateArray, cleaned)
  const confidence = calculateConfidence(bestCandidate, candidateArray, cleaned)

  return {
    steps: bestCandidate,
    confidence,
    rawText: cleaned,
    candidates: candidateArray,
  }
}

function isValidStepCount(n: number): boolean {
  return n >= 0 && n <= 99_999
}

function pickBestCandidate(candidates: number[], rawText: string): number | null {
  if (candidates.length === 0) return null

  const stepKeywords = [
    'kroki', 'krok', 'steps', 'step count', 'schritt', 'stap', 'pas', 'adım',
  ]

  const lines = rawText.split('\n')

  // Find lines containing step keywords
  const stepLineIndexes = lines
    .map((l, i) => ({ l: l.toLowerCase(), i }))
    .filter(({ l }) => stepKeywords.some((k) => l.includes(k)))
    .map(({ i }) => i)

  if (stepLineIndexes.length > 0) {
    // The step count is displayed immediately after the heading (lines +1 to +3).
    // Return the FIRST valid number found there — not the largest.
    // This prevents graph scale markers (e.g. 500) from winning over the real count (e.g. 16).
    for (const idx of stepLineIndexes) {
      const afterLines = lines.slice(idx + 1, Math.min(lines.length, idx + 4))
      for (const line of afterLines) {
        const nums = [...line.matchAll(/\b(\d[\d\s,.]*)\b/g)]
        for (const m of nums) {
          const n = parseInt(m[1].replace(/[\s,.]/g, ''), 10)
          if (isValidStepCount(n)) return n
        }
      }
    }

    // Keyword found but no number right after — widen search, prefer step-range numbers
    const contextNumbers: number[] = []
    for (const idx of stepLineIndexes) {
      const context = lines.slice(Math.max(0, idx - 1), Math.min(lines.length, idx + 5)).join(' ')
      const nums = [...context.matchAll(/\b(\d[\d\s,.]*)\b/g)]
      for (const m of nums) {
        const n = parseInt(m[1].replace(/[\s,.]/g, ''), 10)
        if (isValidStepCount(n)) contextNumbers.push(n)
      }
    }
    if (contextNumbers.length > 0) {
      const inRange = contextNumbers.find((c) => c >= 1000 && c <= 50_000)
      return inRange ?? contextNumbers[0]
    }
  }

  // Fallback: prefer 4-5 digit numbers in typical step range
  const preferred = candidates.find((c) => c >= 1000 && c <= 50_000)
  return preferred ?? candidates[0]
}

function calculateConfidence(
  bestCandidate: number | null,
  allCandidates: number[],
  rawText: string
): number {
  if (!bestCandidate) return 0

  let confidence = 0.5 // base confidence

  // Boost if step keywords are present
  const stepKeywords = ['kroki', 'steps', 'step', 'schritt']
  const lowerText = rawText.toLowerCase()
  if (stepKeywords.some((k) => lowerText.includes(k))) {
    confidence += 0.3
  }

  // Boost if value is in typical range (3,000 - 25,000)
  if (bestCandidate >= 3000 && bestCandidate <= 25_000) {
    confidence += 0.1
  }

  // Penalty if there are many candidates (ambiguous text)
  if (allCandidates.length > 5) {
    confidence -= 0.1
  }

  return Math.min(1, Math.max(0, confidence))
}

/**
 * Preprocess image for better OCR accuracy
 */
export function getOCRPreprocessingConfig() {
  return {
    lang: 'eng+pol',
    oem: 1, // LSTM_ONLY for better accuracy
    psm: 3, // Automatic page segmentation
  }
}

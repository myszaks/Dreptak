'use client'

import { useState, useCallback } from 'react'

const STORAGE_KEY = 'screenshot_attempts'
export const MAX_SCREENSHOT_ATTEMPTS = 5

interface AttemptsRecord {
  date: string
  count: number
}

function readRecord(): AttemptsRecord {
  if (typeof window === 'undefined') return { date: '', count: 0 }
  const today = new Date().toISOString().split('T')[0]
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { date: today, count: 0 }
    const record = JSON.parse(raw) as AttemptsRecord
    return record.date === today ? record : { date: today, count: 0 }
  } catch {
    return { date: today, count: 0 }
  }
}

export function useScreenshotAttempts() {
  const [count, setCount] = useState(() => readRecord().count)

  const increment = useCallback(() => {
    const today = new Date().toISOString().split('T')[0]
    const current = readRecord()
    const updated: AttemptsRecord = { date: today, count: current.count + 1 }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    } catch {
      // ignore quota errors
    }
    setCount(updated.count)
  }, [])

  return {
    attempts: count,
    increment,
    hasReachedLimit: count >= MAX_SCREENSHOT_ATTEMPTS,
    remaining: Math.max(0, MAX_SCREENSHOT_ATTEMPTS - count),
  }
}

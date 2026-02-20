import { NextResponse } from 'next/server'
import { loadBoardConfig } from '@/lib/board-config'

/**
 * GET: Return current board column config (from project/tasks/board-config.json or defaults).
 * Lets the UI display or extend columns without hardcoding.
 */
export async function GET() {
  try {
    const config = await loadBoardConfig()
    return NextResponse.json(config)
  } catch (error) {
    console.error('Error loading board config:', error)
    return NextResponse.json({ error: 'Failed to load board config' }, { status: 500 })
  }
}

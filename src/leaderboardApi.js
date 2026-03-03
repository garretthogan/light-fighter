/**
 * Leaderboard API client. Development: localhost:3000. Production: VITE_LEADERBOARD_API_URL.
 */
const getBaseUrl = () => {
  if (import.meta.env.DEV) return 'http://localhost:3000'
  const url = import.meta.env.VITE_LEADERBOARD_API_URL
  return typeof url === 'string' && url.length > 0 ? url.replace(/\/$/, '') : ''
}

/**
 * Format seconds to "M:SS" for display.
 * @param {number} seconds
 * @returns {string}
 */
export function formatSurvivalTime(seconds) {
  const s = Math.floor(Number(seconds) || 0)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

/**
 * Fetch top entries by score.
 * @returns {Promise<Array<{ rank: number, player_id: string, player_name: string, score: number, survival_time: number }>>}
 */
export async function getLeaderboardScore() {
  const base = getBaseUrl()
  if (!base) return []
  const res = await fetch(`${base}/leaderboard/score`)
  if (!res.ok) throw new Error(`Leaderboard: ${res.status}`)
  return res.json()
}

/**
 * Submit a score. No-op if base URL is not configured.
 * @param {{ score: number, survival_time: number, player_name?: string, player_id?: string }} payload
 * @returns {Promise<{ id: string } | null>}
 */
export async function postScore(payload) {
  const base = getBaseUrl()
  if (!base) return null
  const body = {
    score: payload.score,
    survival_time: payload.survival_time,
    player_name: typeof payload.player_name === 'string' ? payload.player_name : 'Anonymous',
    player_id: typeof payload.player_id === 'string' ? payload.player_id : 'anonymous'
  }
  const res = await fetch(`${base}/scores`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Submit score: ${res.status} ${text}`)
  }
  return res.json()
}

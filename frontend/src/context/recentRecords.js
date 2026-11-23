const key = 'adam-session-recent-records'
export function recentRecords() {
  try { const ids=JSON.parse(sessionStorage.getItem(key)||'[]');return Array.isArray(ids)?ids.filter(id=>typeof id==='string').slice(0,5):[] } catch {return []}
}
export function rememberRecord(id) {
  try {sessionStorage.setItem(key,JSON.stringify([id,...recentRecords().filter(r=>r!==id)].slice(0,5)))} catch { /* Session storage is optional. */ }
}

import React, { useState } from 'react'
import { apiClient } from '../api/client'

export default function ResearchAssistant() {
  const [query, setQuery] = useState('')
  const [articles, setArticles] = useState([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  async function ask(event) {
    event.preventDefault()
    setArticles([])
    if (!query.trim()) return
    if (/diagnose me|should i take|what dose|prescribe|medical emergency/i.test(query)) {
      setMessage('For personal symptoms or treatment decisions, contact a healthcare professional.')
      return
    }
    setLoading(true)
    setMessage('')
    try {
      const { data } = await apiClient.get('/ai/literature/search', { params: { q: query.trim(), top_k: 3 } })
      const matches = data.articles.filter(a => /^\d+$/.test(a.pmid) && a.title && a.abstract)
      setArticles(matches)
      if (!matches.length) setMessage('I could not find evidence.')
    } catch { setMessage('Literature search is unavailable. Please retry.') }
    finally { setLoading(false) }
  }
  return <section className="card p-4 space-y-3"><h2 className="font-bold">AIRA literature assistant</h2>
    <p>Ask a research question to retrieve indexed study summaries. Research use only, not a medical device.</p>
    <form onSubmit={ask} className="flex gap-2"><input className="bg-surface-900 rounded border p-2 min-w-0 flex-1" aria-label="Research question" placeholder="Ask about a taxon or study finding" value={query} required maxLength={500} disabled={loading} onChange={e => setQuery(e.target.value)} /><button disabled={loading}>Search</button></form>
    <div aria-live="polite">{loading ? 'Searching literature…' : message}</div>
    {articles.map(a => <article key={a.pmid} className="space-y-1"><a className="text-accent-400 underline" href={'https://pubmed.ncbi.nlm.nih.gov/' + a.pmid + '/'}>{a.title}</a>
      <p>{a.authors} · {a.year} · PMID {a.pmid}</p><p>{a.abstract}</p></article>)}
  </section>
}

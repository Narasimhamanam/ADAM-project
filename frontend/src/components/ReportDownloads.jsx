import React, { useState } from 'react'
import { Download } from 'lucide-react'
import { apiClient } from '../api/client'

export default function ReportDownloads({ record }) {
  const [busy,setBusy]=useState('')
  const [error,setError]=useState('')
  async function download(format) {
    setBusy(format);setError('')
    try {
      const response=await apiClient.get('/reports/'+encodeURIComponent(record),{params:{format},responseType:'blob',timeout:120000})
      const url=URL.createObjectURL(response.data)
      const a=document.createElement('a')
      a.href=url
      a.download=response.headers['content-disposition']?.match(/filename="([^"]+)"/)?.[1] ||
        'ADAM_report_'+record+'_'+new Date(response.headers.date || Date.now()).toISOString().slice(0,10)+'.'+format
      a.click()
      setTimeout(()=>URL.revokeObjectURL(url),30000)
    } catch {setError('Download failed. Retry when the research service is available.')}
    finally {setBusy('')}
  }
  return <div className="export-actions" aria-busy={!!busy}>{['pdf','json'].map(f=><button className="glass-button" disabled={!!busy || !record} key={f} onClick={()=>download(f)}>
    <Download size={14}/>{busy===f?'Preparing file…':f==='pdf'?'Download report (PDF)':'Export data (JSON)'}</button>)}{error&&<span role="alert">{error}</span>}</div>
}

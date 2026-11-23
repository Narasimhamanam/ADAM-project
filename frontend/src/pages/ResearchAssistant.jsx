import React, { useEffect, useRef, useState } from 'react'
import { useConversation } from '../context/Conversation'
import Avatar, { OrbIcon } from '../components/Avatar'
import { Send, Square, Copy, RefreshCw, ThumbsUp, ThumbsDown, ArrowDown } from 'lucide-react'

export default function ResearchAssistant({compact=false}) {
  const chat=useConversation(),[draft,setDraft]=useState(''),[copied,setCopied]=useState('')
  const area=useRef(null),log=useRef(null),follow=useRef(true)
  const last=chat.active.messages.at(-1)
  useEffect(()=>{if(follow.current && log.current)log.current.scrollTop=log.current.scrollHeight},[chat.active.messages,chat.busy])
  useEffect(()=>{if(area.current){area.current.style.height='auto';area.current.style.height=Math.min(area.current.scrollHeight,120)+'px'}},[draft])
  function send(){if(draft.trim()&&!chat.busy){chat.ask(draft);setDraft('');follow.current=true}}
  const sources=[...chat.active.messages].reverse().find(m=>m.data)?.data.sources||[]
  return <div className={'assistant-layout '+(compact?'compact':'')}>
    {!compact && <aside className="card chat-history"><h2>Conversations</h2><button className="new-chat-btn" onClick={chat.newChat}>+ New conversation</button>
      {chat.threads.map(t=><button key={t.id} aria-current={t.id===chat.active.id?'true':undefined} onClick={()=>chat.choose(t.id)}>{t.messages[0]?.text||'New conversation'}</button>)}</aside>}
    <section className="card chat-main"><header className="assistant-heading"><Avatar animated state={chat.busy?(chat.partial?'answering':'thinking'):draft?'listening':last?.role==='error'?'error':last?.data?'answering':'idle'}/>
      <div><h2>AIRA</h2><p>Evidence assistant</p></div><button className="ml-auto" onClick={chat.clear}>Clear chat</button></header>
      <div className="chat-options"><label>Audience <select value={chat.audience} onChange={e=>chat.setAudience(e.target.value)}><option value="patient">Patient</option><option value="clinician">Clinician</option></select></label></div>
      <label className="chat-options"><input type="checkbox" checked={chat.useRecord && !!chat.record} disabled={!chat.record || chat.busy} onChange={e=>chat.setUseRecord(e.target.checked)}/>Use selected record {chat.record || '(select a report first)'}</label>
      <div className="chat-log" ref={log} onScroll={e=>{const n=e.currentTarget;follow.current=n.scrollHeight-n.scrollTop-n.clientHeight<55}}>
        {!chat.active.messages.length && <div className="chat-empty"><h3>What would you like to understand?</h3>
          {['Which study examined butyrate and amyloid burden?','What do compositional microbiome data mean?'].map(q=><button key={q} onClick={()=>chat.ask(q)}>{q}</button>)}</div>}
        {chat.active.messages.map(m=><article className={'bubble '+m.role} key={m.id}>
          {m.role==='user'?m.text:m.role==='error'?<><p role="alert">{m.text}</p><button onClick={()=>chat.ask(m.question)}>Retry</button></>:<>
            <div className="answer-title"><OrbIcon size={23}/><strong>AIRA</strong></div>
            <p>{m.data.answer.split(/(\[\d+\])/).map((part,i)=>/^\[\d+\]$/.test(part)?<a key={i} href={'#src-'+m.id+'-'+part.slice(1,-1)}>{part}</a>:part)}</p>
            <p>{m.data.explanation}</p>{m.data.project_source && <a href={m.data.project_source}>Saved study results</a>}{m.data.context && <p>Record {m.data.context.sample_id} � Study {m.data.context.study_id} � Day {m.data.context.visit_day}</p>}
            {m.data.sources.map((s,i)=><details key={s.pmid} id={'src-'+m.id+'-'+(i+1)}><summary>[{i+1}] {s.title}</summary>
              <p>{s.claim}</p><a href={'https://pubmed.ncbi.nlm.nih.gov/'+s.pmid+'/'} target="_blank" rel="noreferrer">{s.authors}, {s.year} · PMID {s.pmid}</a><p>Study design: {s.study_type||'unrecorded'} · Sample size: {s.sample_size??'unrecorded'}</p></details>)}
            <p><strong>Caveats. </strong>{m.data.caveats}</p><small>{m.data.disclaimer}</small>
            <div className="chat-actions"><button aria-label="Copy answer" onClick={async()=>{try{await navigator.clipboard.writeText([m.data.answer,m.data.explanation,...m.data.sources.map(s=>s.title+' PMID '+s.pmid),m.data.disclaimer].join('\n'));setCopied(m.id)}catch{setCopied('')}}}><Copy size={15}/>{copied===m.id?'Copied':''}</button>
              <button disabled={chat.busy} aria-label="Regenerate answer" onClick={()=>chat.ask(m.question)}><RefreshCw size={15}/></button>
              {[[1,ThumbsUp],[-1,ThumbsDown]].map(([value,Icon])=><button key={value} aria-label={value===1?'Helpful':'Unhelpful'} aria-pressed={m.feedback===value} onClick={()=>chat.feedback(m.id,value)}><Icon size={15}/></button>)}</div>
            {m.feedbackError && <p role="alert">Feedback could not be saved.</p>}
            {m.data.followups.map(q=><button key={q} disabled={chat.busy} onClick={()=>chat.ask(q)}>{q}</button>)}
          </>}
        </article>)}
        {chat.busy && chat.partial && <p>{chat.partial}</p>}
        <div aria-live="polite">{chat.busy?chat.phase:last?.data?'Answer ready.':''}</div>
      </div>
      <form className="composer" onSubmit={e=>{e.preventDefault();send()}}><textarea ref={area} rows={1} maxLength={500} aria-label="Research question" placeholder="Ask a research question…" value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();send()}}}/>
        {chat.busy?<button type="button" aria-label="Stop" onClick={chat.stop}><Square size={17}/></button>:<button disabled={!draft.trim()} aria-label="Send"><Send size={17}/></button>}
        <button type="button" aria-label="Scroll to latest" onClick={()=>{follow.current=true;log.current.scrollTop=log.current.scrollHeight}}><ArrowDown size={16}/></button></form>
      <small>Research use only, not a medical device.</small>
    </section>
    {!compact && <aside className="card evidence-list"><h2>Evidence</h2>{sources.length?sources.map(s=><p key={s.pmid}><a href={'https://pubmed.ncbi.nlm.nih.gov/'+s.pmid+'/'}>{s.title}</a></p>):<p>Sources appear with a supported answer.</p>}</aside>}
  </div>
}

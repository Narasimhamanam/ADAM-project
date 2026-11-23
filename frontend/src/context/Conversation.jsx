import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { apiClient } from '../api/client'

const Context = createContext(null)
export const useConversation = () => useContext(Context)
const fresh = () => ({ id: crypto.randomUUID(), messages: [] })

export function ConversationProvider({children}) {
  const [threads,setThreads]=useState(()=>[fresh()])
  const [selected,select]=useState(null)
  const [audience,setAudience]=useState('patient')
  const [busy,setBusy]=useState(false)
  const [phase,setPhase]=useState(''),[partial,setPartial]=useState('')
  const [record,setRecord]=useState(null),[useRecord,setUseRecord]=useState(false)
  const controller=useRef(null)
  const active=threads.find(t=>t.id===selected)||threads[0]
  const update=(id,fn)=>setThreads(list=>list.map(t=>t.id===id?{...t,messages:fn(t.messages)}:t))
  function stop(){controller.current?.abort();controller.current=null;setBusy(false)}
  useEffect(()=>()=>controller.current?.abort(),[])
  function newChat(){stop();const thread=fresh();setThreads(v=>[thread,...v]);select(thread.id)}
  function clear(){stop();update(active.id,()=>[])}
  async function ask(text){
    const question=text.trim()
    if(!question||controller.current)return
    const ctl=new AbortController(),id=active.id
    controller.current=ctl;setBusy(true);setPartial('');setPhase('Contacting evidence service')
    const append=m=>update(id,rows=>[...rows,{id:crypto.randomUUID(),...m}])
    append({role:'user',text:question})
    try{
      const response=await fetch(apiClient.defaults.baseURL+'/ai/answers/stream',{method:'POST',
        headers:{'Content-Type':'application/json'},body:JSON.stringify({question,audience,sample_id:useRecord?record:null}),signal:ctl.signal})
      if(!response.ok)throw new Error('Evidence service unavailable')
      const reader=response.body.getReader(), decoder=new TextDecoder()
      let pending='',completed=false
      while(!completed){
        const {done,value}=await reader.read()
        pending+=decoder.decode(value,{stream:!done})
        const lines=pending.split('\n');pending=lines.pop()
        for(const line of lines.filter(Boolean)){
          const event=JSON.parse(line)
          if(ctl.signal.aborted)return
          if(event.phase)setPhase(event.phase)
          if(event.text)setPartial(v=>v+event.text)
          if(event.result){append({role:'assistant',data:event.result,question,audience});completed=true}
        }
        if(done&&!completed)throw new Error('Incomplete answer')
      }
    }catch{if(!ctl.signal.aborted)append({role:'error',question,text:navigator.onLine?'The evidence service could not complete this search.':'You are offline. Reconnect to retry.'})}
    finally{if(controller.current===ctl){controller.current=null;setBusy(false)}}
  }
  async function feedback(id,value){
    const message=active.messages.find(m=>m.id===id)
    if(!message?.data)return
    try{
      await apiClient.post('/ai/answers/feedback',{rating:value,audience:message.audience,pmids:message.data.sources.map(s=>s.pmid)})
      update(active.id,rows=>rows.map(m=>m.id===id?{...m,feedback:value,feedbackError:false}:m))
    }catch{update(active.id,rows=>rows.map(m=>m.id===id?{...m,feedbackError:true}:m))}
  }
  return <Context.Provider value={{phase,partial,record,setRecord,useRecord,setUseRecord,threads,active,choose:id=>{stop();select(id)},audience,setAudience,busy,ask,stop,newChat,clear,feedback}}>{children}</Context.Provider>
}

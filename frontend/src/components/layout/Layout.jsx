import React, { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import ResearchAssistant from '../../pages/ResearchAssistant'
import Avatar from '../Avatar'
import { ConversationProvider } from '../../context/Conversation'
import Header from './Header'
import Sidebar from './Sidebar'

export default function Layout({ children, backendStatus }) {
  const [sidebarOpen,setSidebarOpen]=useState(false),[opened,setOpened]=useState(false)
  const [greeting,setGreeting]=useState(()=>{try{return !sessionStorage.getItem('aira-greeted')}catch{return false}})
  const [position,setPosition]=useState(null)
  const drag=useRef(null),dragged=useRef(false)
  useEffect(()=>{
    if(!greeting)return
    try{sessionStorage.setItem('aira-greeted','1')}catch{}
    const timer=setTimeout(()=>setGreeting(false),4500)
    return ()=>clearTimeout(timer)
  },[greeting])
  const dialog=useRef(null),launcher=useRef(null)
  const location=useLocation()
  useEffect(()=>{setOpened(false)},[location.pathname])
  useEffect(()=>{if(opened && dialog.current && !dialog.current.open)dialog.current.showModal()},[opened])
  return <ConversationProvider><div className="glass-shell flex h-screen overflow-hidden bg-surface-950 print:h-auto print:overflow-visible print:bg-white">
    <Sidebar isOpen={sidebarOpen} onClose={()=>setSidebarOpen(false)}/>
    <div className="min-w-0 flex flex-1 flex-col overflow-hidden print:overflow-visible"><Header onMenuToggle={()=>setSidebarOpen(v=>!v)} backendStatus={backendStatus}/>
      <main id="main-content" className="flex-1 overflow-y-auto p-4 lg:p-6 print:p-0 print:overflow-visible">{children}</main>
      {location.pathname!=='/assistant'&&<><button className="aira-launch print:hidden" ref={launcher} aria-expanded={opened} aria-haspopup="dialog"
        style={position?{left:position.x,top:position.y,right:'auto',bottom:'auto'}:undefined}
        onPointerDown={e=>{dragged.current=false;if(e.pointerType==='mouse'){const r=e.currentTarget.getBoundingClientRect();drag.current={x:e.clientX-r.left,y:e.clientY-r.top,startX:e.clientX,startY:e.clientY};e.currentTarget.setPointerCapture(e.pointerId)}}}
        onPointerMove={e=>{if(!drag.current)return;const d=drag.current;if(Math.abs(e.clientX-d.startX)+Math.abs(e.clientY-d.startY)>6)dragged.current=true;if(dragged.current)setPosition({x:Math.max(0,Math.min(innerWidth-e.currentTarget.offsetWidth,e.clientX-d.x)),y:Math.max(0,Math.min(innerHeight-e.currentTarget.offsetHeight,e.clientY-d.y))})}}
        onPointerUp={()=>{drag.current=null}} onPointerCancel={()=>{drag.current=null}}
        onClick={()=>{if(!dragged.current){setOpened(true);setGreeting(false)}}}><Avatar state={greeting?'greeting':'idle'}/>Ask AIRA
        {greeting&&<span className="aira-greeting">Have a literature question?</span>}</button>
        {opened&&<dialog className="aira-dialog" aria-label="AIRA evidence assistant" ref={dialog} onClose={()=>{setOpened(false);launcher.current?.focus()}}>
          <div className="dialog-tools"><Link to="/assistant">Expand AIRA</Link><button onClick={()=>dialog.current.close()}>Minimize</button></div><ResearchAssistant compact/>
        </dialog>}</>}
    </div></div></ConversationProvider>
}

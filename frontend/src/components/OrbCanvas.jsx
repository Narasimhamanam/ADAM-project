import React, { useEffect, useRef } from 'react'

// Orthographic sphere with a lit translucent core and two orbital filaments.
const fragment = `
precision mediump float;
uniform vec2 res; uniform float t; uniform float mode;
void main(){
 vec2 p=(gl_FragCoord.xy/res-0.5)*2.4;
 p.y-=0.045*sin(t*1.8);
 float r=length(p); float z=sqrt(max(0.,1.-dot(p,p)));
 float diffuse=max(0.,dot(normalize(vec3(p,z)),normalize(vec3(-.5,.8,.9))));
 vec3 base=mix(vec3(.035,.17,.22),vec3(.18,.70,.67),diffuse);
 base+=vec3(.48,.74,.72)*pow(diffuse,16.);
 float core=exp(-6.*r*r)*(.75+.2*sin(t*(mode==3.?6.:2.)));
 base+=vec3(.09,.31,.27)*core;
 float phase=t*(mode==2.?2.3:.5);
 float stripe=abs(p.y-.28*sin(3.*p.x+phase)-.26*p.x);
 base+=vec3(.48,.9,.86)*(1.-smoothstep(.015,.052,stripe))*.65;
 base+=vec3(.47,.83,.82)*smoothstep(.90,1.,r);
 if(mode==4.)base*=.55;
 if(mode==1.)base*=1.18;
 gl_FragColor=vec4(base,1.-smoothstep(.97,1.,r));
}`
export default function OrbCanvas({ state }) {
  const ref=useRef(null), mode=useRef(0)
  useEffect(()=>{mode.current=['idle','listening','thinking','answering','error','greeting'].indexOf(state)},[state])
  useEffect(()=>{
    const canvas=ref.current, gl=canvas.getContext('webgl',{alpha:true,antialias:false,powerPreference:'low-power'})
    if(!gl)return
    const shaders=[]
    const program=gl.createProgram()
    for(const [type,code] of [[gl.VERTEX_SHADER,'attribute vec2 pos;void main(){gl_Position=vec4(pos,0.,1.);}'],[gl.FRAGMENT_SHADER,fragment]]){
      const s=gl.createShader(type);gl.shaderSource(s,code);gl.compileShader(s);gl.attachShader(program,s);shaders.push(s)
    }
    gl.linkProgram(program)
    const buffer=gl.createBuffer()
    let timer
    if(gl.getProgramParameter(program,gl.LINK_STATUS)){
      canvas.width=canvas.height=Math.round(44*Math.min(devicePixelRatio,1.5))
      gl.viewport(0,0,canvas.width,canvas.height);gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer)
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW)
      const pos=gl.getAttribLocation(program,'pos');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0)
      const time=gl.getUniformLocation(program,'t'),m=gl.getUniformLocation(program,'mode')
      gl.uniform2f(gl.getUniformLocation(program,'res'),canvas.width,canvas.height)
      const draw=()=>{gl.uniform1f(time,performance.now()/1000);gl.uniform1f(m,mode.current);gl.drawArrays(gl.TRIANGLES,0,3)}
      draw();timer=setInterval(draw,50)
    }
    return ()=>{clearInterval(timer);gl.deleteBuffer(buffer);shaders.forEach(s=>gl.deleteShader(s));gl.deleteProgram(program);gl.getExtension('WEBGL_lose_context')?.loseContext()}
  },[])
  return <canvas ref={ref} aria-hidden="true" width="44" height="44"/>
}

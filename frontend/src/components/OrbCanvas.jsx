import React, { useEffect, useRef } from 'react'

// Enhanced multi-state WebGL fragment shader with particle orbiting, responsive core pulse, and state tinting
const fragment = `
precision mediump float;
uniform vec2 res;
uniform float t;
uniform float mode; // 0: idle, 1: listening, 2: thinking, 3: answering, 4: error, 5: greeting

void main(){
  vec2 p = (gl_FragCoord.xy / res - 0.5) * 2.4;

  // Gentle float bob (enhanced in greeting, paused in error)
  float bob = (mode == 4.0) ? 0.0 : (mode == 5.0) ? 0.08 * sin(t * 3.5) : 0.045 * sin(t * 1.8);
  p.y -= bob;

  // Slight lean towards input when listening
  if (mode == 1.0) {
    p.x += 0.08;
    p.y += 0.04;
  }

  float r = length(p);
  float z = sqrt(max(0.0, 1.0 - dot(p, p)));

  // Diffuse illumination with specular highlight
  vec3 lightDir = normalize(vec3(-0.5, 0.8, 0.9));
  float diffuse = max(0.0, dot(normalize(vec3(p, z)), lightDir));

  // Base palette: Teal-Cyan gradient
  vec3 base = mix(vec3(0.035, 0.17, 0.22), vec3(0.18, 0.70, 0.67), diffuse);
  base += vec3(0.48, 0.74, 0.72) * pow(diffuse, 16.0);

  // Core pulsation depending on state
  float pulseFreq = (mode == 3.0) ? 6.5 : (mode == 2.0) ? 4.2 : 2.0;
  float pulseAmp = (mode == 3.0) ? 0.35 : (mode == 1.0) ? 0.28 : 0.20;
  float core = exp(-6.0 * r * r) * (0.75 + pulseAmp * sin(t * pulseFreq));
  base += vec3(0.09, 0.31, 0.27) * core;

  // Orbital filaments / helix rings
  float phaseSpeed = (mode == 2.0) ? 3.8 : (mode == 3.0) ? 2.6 : 0.6;
  float phase = t * phaseSpeed;
  float stripe1 = abs(p.y - 0.28 * sin(3.0 * p.x + phase) - 0.26 * p.x);
  float stripe2 = abs(p.y + 0.22 * sin(3.0 * p.x - phase) + 0.24 * p.x);

  base += vec3(0.48, 0.90, 0.86) * (1.0 - smoothstep(0.015, 0.052, stripe1)) * 0.65;
  if (mode == 2.0 || mode == 3.0) {
    // Second helix visible during thinking/answering
    base += vec3(0.35, 0.75, 0.85) * (1.0 - smoothstep(0.015, 0.052, stripe2)) * 0.55;
  }

  // Orbiting particle in thinking mode
  if (mode == 2.0) {
    vec2 particlePos = vec2(0.65 * cos(t * 4.5), 0.35 * sin(t * 4.5));
    float pDist = length(p - particlePos);
    base += vec3(0.85, 1.0, 0.95) * exp(-45.0 * pDist * pDist);
  }

  // Specular edge fresnel
  base += vec3(0.47, 0.83, 0.82) * smoothstep(0.90, 1.0, r);

  // State-specific color grading
  if (mode == 4.0) { // Error: desaturated amber/red tone, lower luminance
    base = mix(base, vec3(0.75, 0.35, 0.25), 0.55) * 0.75;
  } else if (mode == 1.0) { // Listening: brighter, energetic cyan
    base *= 1.25;
  } else if (mode == 3.0) { // Answering: luminous teal glow
    base += vec3(0.12, 0.25, 0.22);
  } else if (mode == 5.0) { // Greeting: soft cheerful highlight
    base *= 1.15;
  }

  gl_FragColor = vec4(base, 1.0 - smoothstep(0.97, 1.0, r));
}`

export default function OrbCanvas({ state }) {
  const ref = useRef(null)
  const mode = useRef(0)

  useEffect(() => {
    const idx = ['idle', 'listening', 'thinking', 'answering', 'error', 'greeting'].indexOf(state)
    mode.current = idx >= 0 ? idx : 0
  }, [state])

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const gl = canvas.getContext('webgl', { alpha: true, antialias: false, powerPreference: 'low-power' })
    if (!gl) return

    const shaders = []
    const program = gl.createProgram()
    for (const [type, code] of [
      [gl.VERTEX_SHADER, 'attribute vec2 pos;void main(){gl_Position=vec4(pos,0.,1.);}'],
      [gl.FRAGMENT_SHADER, fragment]
    ]) {
      const s = gl.createShader(type)
      gl.shaderSource(s, code)
      gl.compileShader(s)
      gl.attachShader(program, s)
      shaders.push(s)
    }
    gl.linkProgram(program)
    const buffer = gl.createBuffer()
    let timer

    if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
      canvas.width = canvas.height = Math.round(44 * Math.min(window.devicePixelRatio || 1, 1.5))
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.useProgram(program)
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
      const pos = gl.getAttribLocation(program, 'pos')
      gl.enableVertexAttribArray(pos)
      gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0)
      const time = gl.getUniformLocation(program, 't')
      const m = gl.getUniformLocation(program, 'mode')
      gl.uniform2f(gl.getUniformLocation(program, 'res'), canvas.width, canvas.height)

      const draw = () => {
        if (document.hidden) return // Automatically pause when tab is inactive
        gl.uniform1f(time, performance.now() / 1000)
        gl.uniform1f(m, mode.current)
        gl.drawArrays(gl.TRIANGLES, 0, 3)
      }
      draw()
      timer = setInterval(draw, 45)
    }

    return () => {
      clearInterval(timer)
      gl.deleteBuffer(buffer)
      shaders.forEach(s => gl.deleteShader(s))
      gl.deleteProgram(program)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }, [])

  return <canvas ref={ref} aria-hidden="true" width="44" height="44" />
}

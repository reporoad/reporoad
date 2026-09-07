(() => {
  const start = performance.now();
  const html = document.getElementById('html');
  setInterval(() => {
    html.textContent = `HTML · ${Math.floor((performance.now() - start) / 1000)}s`;
    document.getElementById('html-status').textContent = `JavaScript running · page ${document.visibilityState}`;
  }, 1000);

  const two = document.getElementById('two');
  const ctx = two.getContext('2d');
  if (ctx) {
    const draw = (time) => {
      ctx.fillStyle = '#132f45'; ctx.fillRect(0, 0, 640, 240);
      ctx.fillStyle = '#ffd56d'; ctx.fillRect(280 + Math.sin(time / 650) * 230, 70, 80, 80);
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
    document.getElementById('two-status').textContent = '2D context created · yellow square should move';
  } else document.getElementById('two-status').textContent = '2D context unavailable';

  function cube(id, preserve) {
    const canvas = document.getElementById(id);
    const status = document.getElementById(`${id}-status`);
    let gl;
    try {
      gl = canvas.getContext('webgl2', { preserveDrawingBuffer: preserve, antialias: true, alpha: false });
      if (!gl) throw new Error('WebGL2 context unavailable');
      const shader = (type, source) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, source); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
        return s;
      };
      const vs = shader(gl.VERTEX_SHADER, `#version 300 es
        in vec3 position; uniform float angle; out vec3 color;
        void main() {
          float c=cos(angle), s=sin(angle);
          vec3 p=vec3(c*position.x+s*position.z,position.y,-s*position.x+c*position.z);
          p=vec3(p.x,0.85*p.y-0.53*p.z,0.53*p.y+0.85*p.z);
          gl_Position=vec4(p.x*0.375,p.y,p.z*0.3,1.0);
          color=position*0.55+0.5;
        }`);
      const fs = shader(gl.FRAGMENT_SHADER, `#version 300 es
        precision mediump float; in vec3 color; out vec4 pixel;
        void main() { pixel=vec4(color,1.0); }`);
      const program = gl.createProgram();
      gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
      gl.useProgram(program);
      const corners = [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]];
      const indices = [0,1,2,0,2,3,4,6,5,4,7,6,0,4,5,0,5,1,3,2,6,3,6,7,1,5,6,1,6,2,0,3,7,0,7,4];
      const vertices = new Float32Array(indices.flatMap(i => corners[i].map(v => v * 0.55)));
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
      const position = gl.getAttribLocation(program, 'position');
      gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 0, 0);
      gl.enable(gl.DEPTH_TEST); gl.viewport(0,0,640,240);
      const angle = gl.getUniformLocation(program, 'angle');
      let frames = 0, lastReport = 0;
      const draw = time => {
        if (gl.isContextLost()) return;
        gl.clearColor(0.05,0.16,0.23,1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.uniform1f(angle, time / 1000); gl.drawArrays(gl.TRIANGLES,0,36); frames++;
        if (time - lastReport > 1000) {
          const error = gl.getError();
          status.textContent = `WebGL2 · preserve=${gl.getContextAttributes().preserveDrawingBuffer} · ${frames} frames submitted · GL error ${error}`;
          lastReport = time;
        }
        requestAnimationFrame(draw);
      };
      canvas.addEventListener('webglcontextlost', () => { status.textContent = 'WebGL2 context LOST · reload to retry'; });
      requestAnimationFrame(draw);
    } catch (error) { status.textContent = `FAILED: ${error.message || error}`; }
  }
  cube('normal', false);
  cube('preserved', true);
})();

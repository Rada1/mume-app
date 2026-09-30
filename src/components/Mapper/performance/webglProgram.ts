/**
 * @file Small typed WebGL2 shader compiler for the worker map renderer.
 */
// --- Logic Section ---

export interface WebGLProgramWithUniforms {
  program: WebGLProgram;
  uniforms: ReadonlyMap<string, WebGLUniformLocation | null>;
}

export function compileProgram(
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string,
  uniformNames: readonly string[],
): WebGLProgramWithUniforms {
  const compileShader = (type: number, source: string): WebGLShader => {
    const shader = gl.createShader(type);
    if (!shader) throw new Error('WebGL could not allocate a map shader.');
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader) || 'shader compilation failed';
      gl.deleteShader(shader);
      throw new Error(`Performance map shader: ${message}`);
    }
    return shader;
  };

  const vertex = compileShader(gl.VERTEX_SHADER, vertexSource);
  const fragment = compileShader(gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (!program) throw new Error('WebGL could not allocate a map program.');
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) || 'program linking failed';
    gl.deleteProgram(program);
    throw new Error(`Performance map program: ${message}`);
  }

  const uniforms = new Map<string, WebGLUniformLocation | null>();
  for (const name of uniformNames) uniforms.set(name, gl.getUniformLocation(program, name));
  return { program, uniforms };
}

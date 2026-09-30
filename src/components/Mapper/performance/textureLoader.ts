/**
 * @file Loads only MMapper texture layers used by the reduced fast renderer.
 */
// --- Logic Section ---

import { dottedWallImages } from './vendor/textures';

export async function createTextureArray(
  gl: WebGL2RenderingContext,
  files: readonly string[],
  size: number,
  usedLayers: ReadonlySet<number>,
  proceduralLayers: ReadonlySet<number> = new Set(),
  createProceduralLayer?: (layer: number, size: number) => Uint8Array<ArrayBuffer> | null,
): Promise<WebGLTexture> {
  const texture = gl.createTexture();
  if (!texture) throw new Error('WebGL could not allocate a map texture array.');
  const levels = Math.floor(Math.log2(size)) + 1;
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);
  gl.texStorage3D(gl.TEXTURE_2D_ARRAY, levels, gl.RGBA8, size, size, files.length);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  await Promise.all([...usedLayers].filter(layer => !proceduralLayers.has(layer)).map(async layer => {
    const file = files[layer];
    if (!file) throw new Error(`Map texture layer ${layer} is not defined.`);
    const response = await fetch(`/assets/mmapper/pixmaps/${file}`);
    if (!response.ok) throw new Error(`Could not load map texture ${file} (${response.status}).`);
    const bitmap = await createImageBitmap(await response.blob(), { imageOrientation: 'flipY', premultiplyAlpha: 'none' });
    try {
      if (bitmap.width !== size || bitmap.height !== size) throw new Error(`Map texture ${file} must be ${size}×${size}.`);
      // Rendering can run while image decoding is awaited; restore this atlas binding before each upload.
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);
      gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, layer, size, size, 1, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
    } finally {
      bitmap.close();
    }
  }));

  if (createProceduralLayer) {
    for (const layer of proceduralLayers) {
      const pixels = createProceduralLayer(layer, size);
      if (!pixels) continue;
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);
      gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, layer, size, size, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    }
  }

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);
  gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, null);
  return texture;
}

export function createDottedWallTextureArray(gl: WebGL2RenderingContext): WebGLTexture {
  const texture = gl.createTexture();
  if (!texture) throw new Error('WebGL could not allocate the dotted wall texture array.');
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);
  gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 8, gl.RGBA8, 128, 128, 4);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  for (let direction = 0; direction < 4; direction++) {
    const levels = dottedWallImages(direction);
    for (let level = 0; level < levels.length; level++) {
      const size = 1 << (7 - level);
      gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, level, 0, 0, direction, size, size, 1, gl.RGBA, gl.UNSIGNED_BYTE, levels[level]!);
    }
  }
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, null);
  return texture;
}

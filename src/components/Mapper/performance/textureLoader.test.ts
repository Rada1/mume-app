/**
 * @file Tests texture uploads remain bound to their atlas during async decoding.
 */
// --- Logic Section ---

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTextureArray } from './textureLoader';

afterEach(() => vi.unstubAllGlobals());

describe('createTextureArray', () => {
  it('rebinds the atlas after image decoding yields to worker rendering', async () => {
    const atlas = {} as WebGLTexture;
    const competingTexture = {} as WebGLTexture;
    let boundTexture: WebGLTexture | null = null;
    let uploadedTexture: WebGLTexture | null = null;
    let mipmappedTexture: WebGLTexture | null = null;
    const gl = {
      TEXTURE_2D_ARRAY: 1,
      TEXTURE_MIN_FILTER: 2,
      TEXTURE_MAG_FILTER: 3,
      TEXTURE_WRAP_S: 4,
      TEXTURE_WRAP_T: 5,
      RGBA8: 6,
      LINEAR_MIPMAP_LINEAR: 7,
      LINEAR: 8,
      CLAMP_TO_EDGE: 9,
      TEXTURE0: 10,
      RGBA: 11,
      UNSIGNED_BYTE: 12,
      createTexture: () => atlas,
      bindTexture: (_target: number, texture: WebGLTexture | null) => { boundTexture = texture; },
      texStorage3D: () => undefined,
      texParameteri: () => undefined,
      activeTexture: () => undefined,
      texSubImage3D: () => { uploadedTexture = boundTexture; },
      generateMipmap: () => { mipmappedTexture = boundTexture; },
    };
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, blob: async () => new Blob() })));
    vi.stubGlobal('createImageBitmap', vi.fn(async () => {
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, competingTexture);
      return { width: 1, height: 1, close: () => undefined } as ImageBitmap;
    }));

    const result = await createTextureArray(gl as unknown as WebGL2RenderingContext, ['terrain.png'], 1, new Set([0]));

    expect(result).toBe(atlas);
    expect(uploadedTexture).toBe(atlas);
    expect(mipmappedTexture).toBe(atlas);
  });

  it('leaves procedural icon layers unloaded for the renderer to draw itself', async () => {
    const atlas = {} as WebGLTexture;
    const fetchFile = vi.fn(async () => ({ ok: true, blob: async () => new Blob() }));
    const gl = {
      TEXTURE_2D_ARRAY: 1, TEXTURE_MIN_FILTER: 2, TEXTURE_MAG_FILTER: 3, TEXTURE_WRAP_S: 4, TEXTURE_WRAP_T: 5,
      RGBA8: 6, LINEAR_MIPMAP_LINEAR: 7, LINEAR: 8, CLAMP_TO_EDGE: 9, TEXTURE0: 10, RGBA: 11, UNSIGNED_BYTE: 12,
      createTexture: () => atlas, bindTexture: () => undefined, texStorage3D: () => undefined, texParameteri: () => undefined,
      activeTexture: () => undefined, texSubImage3D: () => undefined, generateMipmap: () => undefined,
    };
    vi.stubGlobal('fetch', fetchFile);
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 1, height: 1, close: () => undefined } as ImageBitmap)));

    await createTextureArray(gl as unknown as WebGL2RenderingContext, ['flag.png', 'procedural.png'], 1, new Set([0, 1]), new Set([1]));

    expect(fetchFile).toHaveBeenCalledTimes(1);
    expect(fetchFile).toHaveBeenCalledWith('/assets/mmapper/pixmaps/flag.png');
  });
});

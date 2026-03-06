/**
 * Utility for client-side image processing.
 */

/**
 * Removes a solid color background from an image.
 * Detects the background color from corners with a small tolerance.
 * Returns a base64 encoded PNG.
 */
export const makeBackgroundTransparent = (base64: string, maxDim: number = 256): Promise<string> => {
    return new Promise((resolve) => {
        if (!base64.startsWith('data:image')) {
            resolve(base64);
            return;
        }

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            try {
                // Calculate dimensions to maintain aspect ratio within maxDim
                let width = img.width;
                let height = img.height;

                if (width > maxDim || height > maxDim) {
                    if (width > height) {
                        height = Math.round((height * maxDim) / width);
                        width = maxDim;
                    } else {
                        width = Math.round((width * maxDim) / height);
                        height = maxDim;
                    }
                }

                // Ensure width/height are at least 1 to avoid errors
                width = Math.max(1, width);
                height = Math.max(1, height);

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    resolve(base64);
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);
                const imageData = ctx.getImageData(0, 0, width, height);
                const data = imageData.data;

                if (data.length < 4) {
                    resolve(base64);
                    return;
                }

                // Detect background candidates from all four corners
                // Use safe indexing to avoid crashing on tiny images
                const corners = [
                    { r: data[0], g: data[1], b: data[2], a: data[3] },
                    { r: data[Math.max(0, width - 1) * 4], g: data[Math.max(0, width - 1) * 4 + 1], b: data[Math.max(0, width - 1) * 4 + 2], a: data[Math.max(0, width - 1) * 4 + 3] },
                    { r: data[Math.max(0, data.length - width * 4)], g: data[Math.max(0, data.length - width * 4) + 1], b: data[Math.max(0, data.length - width * 4) + 2], a: data[Math.max(0, data.length - width * 4) + 3] },
                    { r: data[data.length - 4], g: data[data.length - 3], b: data[data.length - 2], a: data[data.length - 1] }
                ];

                // If any corner is already fully transparent, the image likely has transparency already.
                // We only process if all corners are mostly opaque.
                if (corners.some(c => c.a < 128)) {
                    // If we resized, we still want to return the resized version
                    resolve(canvas.toDataURL('image/png'));
                    return;
                }

                // Pick the most common color among corners or top-left as baseline
                const rBase = corners[0].r, gBase = corners[0].g, bBase = corners[0].b;

                // Tolerance and Alpha settings
                const tolerance = 40;

                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i], g = data[i + 1], b = data[i + 2];
                    const diff = Math.sqrt(Math.pow(r - rBase, 2) + Math.pow(g - gBase, 2) + Math.pow(b - bBase, 2));
                    if (diff < tolerance) data[i + 3] = 0; // Set to transparent
                }

                ctx.putImageData(imageData, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            } catch (err) {
                console.error("Error processing image:", err);
                resolve(base64);
            }
        };
        img.onerror = () => resolve(base64);
        img.src = base64;
    });
};

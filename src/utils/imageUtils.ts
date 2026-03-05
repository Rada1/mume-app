/**
 * Utility for client-side image processing.
 */

/**
 * Removes a solid color background from an image.
 * Detects the background color from corners with a small tolerance.
 * Returns a base64 encoded PNG.
 */
export const makeBackgroundTransparent = (base64: string): Promise<string> => {
    return new Promise((resolve) => {
        if (!base64.startsWith('data:image')) {
            resolve(base64);
            return;
        }

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve(base64);
                return;
            }

            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            // Detect background candidates from all four corners
            const corners = [
                { r: data[0], g: data[1], b: data[2], a: data[3] },
                { r: data[(canvas.width - 1) * 4], g: data[(canvas.width - 1) * 4 + 1], b: data[(canvas.width - 1) * 4 + 2], a: data[(canvas.width - 1) * 4 + 3] },
                { r: data[(data.length - canvas.width * 4)], g: data[(data.length - canvas.width * 4) + 1], b: data[(data.length - canvas.width * 4) + 2], a: data[(data.length - canvas.width * 4) + 3] },
                { r: data[data.length - 4], g: data[data.length - 3], b: data[data.length - 2], a: data[data.length - 1] }
            ];

            // If any corner is already fully transparent, the image likely has transparency already.
            // We only process if all corners are mostly opaque.
            if (corners.some(c => c.a < 128)) {
                resolve(base64);
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
        };
        img.onerror = () => resolve(base64);
        img.src = base64;
    });
};

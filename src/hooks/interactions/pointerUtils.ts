/**
 * @file pointerUtils.ts
 * @description Shared utility functions for log pointer interactions.
 */

/**
 * Resolves the glow color for an element, falling back to theme accents.
 */
export const getPressedColor = (targetEl: HTMLElement): string => {
    // Check inline style first (higher specificity)
    const inlineGlow = targetEl.style.getPropertyValue('--glow-color').trim();
    if (inlineGlow) return inlineGlow;
    
    const inlineAccent = targetEl.style.getPropertyValue('--set-accent').trim();
    if (inlineAccent) return inlineAccent;

    const style = getComputedStyle(targetEl);
    return (
        style.getPropertyValue('--glow-color').trim() ||
        style.getPropertyValue('--set-accent').trim() ||
        style.getPropertyValue('--btn-theme-rgb').trim() ||
        style.getPropertyValue('--accent').trim() ||
        style.color || 
        getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() ||
        '#4b6eef'
    );
};

/**
 * Triggers a visual 'ring' ripple animation at the specified coordinates.
 */
export const triggerRingAnimation = (x: number, y: number, color: string) => {
    const sz = 28;
    const ring = document.createElement('div');
    const scrollY = window.scrollY || window.pageYOffset;
    const scrollX = window.scrollX || window.pageXOffset;

    ring.style.cssText = `
        position: absolute;
        left: ${x + scrollX - sz / 2}px;
        top: ${y + scrollY - sz / 2}px;
        width: ${sz}px;
        height: ${sz}px;
        border-radius: 50%;
        border: 2px solid ${color};
        pointer-events: none;
        z-index: 99999;
        box-shadow: 0 0 8px ${color};
    `;
    document.body.appendChild(ring);
    
    const anim = ring.animate([
        { transform: 'scale(1)', opacity: 0.9 },
        { transform: 'scale(3.5)', opacity: 0 }
    ], { 
        duration: 250, 
        easing: 'ease-out', 
        fill: 'forwards' 
    });
    
    anim.addEventListener('finish', () => ring.remove());
};

/**
 * Attempts to find a text selection at a specific point, used for mobile targeting.
 */
export const getCaretSelectionAtPoint = (x: number, y: number): string => {
    let range: Range | null = null;
    const doc = document as any;
    
    if (doc.caretRangeFromPoint) {
        range = doc.caretRangeFromPoint(x, y);
    }
    
    if (!range || range.startContainer.nodeType !== Node.TEXT_NODE) {
        const offsets = [{ dx: -5, dy: -5 }, { dx: 5, dy: -5 }, { dx: -5, dy: 5 }, { dx: 5, dy: 5 }];
        for (const offset of offsets) {
            const r = doc.caretRangeFromPoint(x + offset.dx, y + offset.dy);
            if (r && r.startContainer.nodeType === Node.TEXT_NODE) {
                range = r;
                break;
            }
        }
    }
    
    if (range && range.startContainer.nodeType === Node.TEXT_NODE) {
        const node = range.startContainer;
        const offset = range.startOffset;
        const text = node.textContent || "";
        const beforeStr = text.slice(0, offset);
        const afterStr = text.slice(offset);
        const beforeWord = beforeStr.match(/(\w+)$/)?.[1] || "";
        const afterWord = afterStr.match(/^(\w+)/)?.[1] || "";
        return (beforeWord + afterWord).trim();
    }
    
    return "";
};

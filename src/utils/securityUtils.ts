/**
 * @file securityUtils.ts
 * @description Security utilities for sanitizing and escaping HTML to prevent XSS.
 * @tags security, xss, sanitization
 */

/**
 * Escapes special HTML characters in a string to prevent XSS when rendering as text.
 * @param text The raw text to escape.
 * @returns The escaped HTML string.
 */
export const escapeHtml = (text: string): string => {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

/**
 * Performs a robust DOM-based sanitization of HTML strings.
 * This uses the browser's native DOMParser to clean the HTML,
 * which is significantly safer than regex-based approaches.
 *
 * @param html The HTML string to sanitize.
 * @returns The sanitized HTML string.
 */
export const sanitizeMumeHtml = (html: string): string => {
    if (!html) return '';

    // If we're not in a browser environment (e.g. during SSR or testing without a DOM),
    // we fallback to basic escaping for safety.
    if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
        return escapeHtml(html);
    }

    const ALLOWED_TAGS = ['span', 'div', 'p', 'br', 'strong', 'em', 'b', 'i', 'code', 'a', 'img', 'h1', 'h2', 'li'];
    const ALLOWED_ATTRS = [
        'class', 'style', 'href', 'src', 'alt', 'title', 'draggable',
        'data-id', 'data-mid', 'data-cmd', 'data-context', 'data-action',
        'data-menu-display', 'data-icon', 'data-label', 'data-color',
        'data-spit', 'data-duration', 'data-swipes', 'data-swipe-actions'
    ];

    try {
        const parser = new DOMParser();
        // Wrap in a div to ensure we have a single root for innerHTML extraction
        const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
        const root = doc.body.firstChild;

        if (!root) return '';

        const walk = (node: Node) => {
            if (node.nodeType === 1) { // ELEMENT_NODE
                const el = node as Element;
                const tag = el.tagName.toLowerCase();

                // 1. Check if tag is allowed
                if (!ALLOWED_TAGS.includes(tag)) {
                    // Remove dangerous tags entirely
                    if (['script', 'style', 'iframe', 'object', 'embed', 'base', 'link', 'meta'].includes(tag)) {
                        el.remove();
                        return;
                    }
                    // For other unknown tags, we could unwrap them, but in this MUD context,
                    // we'll just keep them but strip all attributes.
                }

                // 2. Clean attributes
                const attrs = el.attributes;
                for (let i = attrs.length - 1; i >= 0; i--) {
                    const attr = attrs[i];
                    const attrName = attr.name.toLowerCase();

                    // Remove any attribute not in the safe-list or any on* handlers
                    if (!ALLOWED_ATTRS.includes(attrName) || attrName.startsWith('on')) {
                        el.removeAttribute(attr.name);
                        continue;
                    }

                    // 3. Sanitize URIs in href/src
                    if (['href', 'src'].includes(attrName)) {
                        const val = attr.value.toLowerCase().trim();
                        if (val.startsWith('javascript:') || val.startsWith('data:')) {
                            el.setAttribute(attr.name, '#no-js');
                        }
                    }
                }
            }

            // Recursively walk children
            const children = Array.from(node.childNodes);
            children.forEach(walk);
        };

        walk(root);
        return (root as Element).innerHTML;
    } catch (e) {
        console.error('Sanitization failed:', e);
        // Fallback to escaping if anything goes wrong during DOM parsing
        return escapeHtml(html);
    }
};

/**
 * @file inlineSpanRenderer.ts
 * @description Centralized utility for rendering consistent interactive inline buttons (spans).
 */

export interface InlineSpanProps {
  id: string;
  mid: string;
  cmd: string;
  context: string;
  kind?: string;            // e.g. 'npc', 'player', 'object' (T6)
  location?: string;        // e.g. 'room', 'inv', 'worn', 'shop' (T6)
  category?: string;        // e.g. 'npc', 'player', 'object'
  action?: string;          // default 'menu'
  menuDisplay?: 'list' | 'dial';
  extraClasses?: string[];  // e.g. ['auto-occupant', 'pc-highlighter']
  draggable?: boolean;
  selected?: boolean;
  glowColor?: string;
  textColor?: string;
  dataAttrs?: Record<string, string | number | boolean | undefined>; 
  innerHtml: string;        // what goes between the tags
}

/**
 * Escape a value for safe use inside an HTML attribute delimited by double-quotes.
 */
export const esc = (v: string | number | boolean | undefined): string => {
  if (v === undefined || v === null) return '';
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

/**
 * Renders a standard MUME inline button span string.
 * @param p Props for the span
 * @returns HTML string for the span
 */
export const renderInlineSpan = (p: InlineSpanProps): string => {
  const classes = ['inline-btn'];
  if (p.extraClasses) classes.push(...p.extraClasses);
  if (p.selected) classes.push('selected');
  
  const classStr = classes.join(' ');
  const draggable = p.draggable !== false ? ' draggable="true"' : '';
  
  let dataStr = `data-id="${esc(p.id)}" data-mid="${esc(p.mid)}" data-cmd="${esc(p.cmd)}" data-context="${esc(p.context)}"`;
  
  if (p.kind) dataStr += ` data-kind="${esc(p.kind)}"`;
  if (p.location) dataStr += ` data-location="${esc(p.location)}"`;
  if (p.action) dataStr += ` data-action="${esc(p.action)}"`;
  if (p.menuDisplay) dataStr += ` data-menu-display="${esc(p.menuDisplay)}"`;
  if (p.category) dataStr += ` data-category="${esc(p.category)}"`;

  if (p.dataAttrs) {
    for (const [key, value] of Object.entries(p.dataAttrs)) {
      if (value === undefined) continue;
      
      // Special handling for JSON attributes that need single quotes escaped as &apos;
      if (key === 'swipes' || key === 'swipe-actions') {
        const jsonStr = typeof value === 'string' ? value : JSON.stringify(value);
        dataStr += ` data-${key}='${jsonStr.replace(/'/g, "&apos;")}'`;
      } else {
        dataStr += ` data-${key}="${esc(value)}"`;
      }
    }
  }

  let styleStr = '';
  if (p.glowColor || p.textColor) {
    const styles = [];
    if (p.glowColor) styles.push(`--glow-color: ${p.glowColor}`);
    if (p.textColor) styles.push(`color: ${p.textColor}`);
    styleStr = ` style="${styles.join('; ')}"`;
  }

  return `<span class="${classStr}"${draggable} ${dataStr}${styleStr}>${p.innerHtml}</span>`;
};

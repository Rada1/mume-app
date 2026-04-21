/**
 * @file useSpecialLineWrappers.ts
 * @description Hook for applying whole-line interactive wrappers to specialized MUME message types.
 */

import { useCallback } from 'react';
import { MessageType } from '../types';
import { isObjectSelected } from '../utils/selectionUtils';

export const useSpecialLineWrappers = (selectedObjectIds: Set<string> = new Set()) => {
    
    /**
     * Escapes values for safe use inside HTML attributes.
     */
    const esc = useCallback((v: string) => 
        v.replace(/&/g, '&amp;')
         .replace(/"/g, '&quot;')
         .replace(/</g, '&lt;')
         .replace(/>/g, '&gt;'), []);

    /**
     * Checks if a line matches a special message type and returns a wrapped version if so.
     * Returns null if no special wrapping is applicable.
     */
    const wrapSpecialLine = useCallback((originalHtml: string, mid: string, type?: MessageType): string | null => {
        
        // --- 1. Account Selection Buttons ---
        if (type === 'account-selection' || type === 'account-selection-edit') {
            const rawText = originalHtml.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
            const numMatch = rawText.match(/\((\d+)\)/);
            const num = numMatch ? numMatch[1] : '';
            const isEdit = type === 'account-selection-edit' || rawText.includes('Edit');
            const editAttr = isEdit ? 'data-account-stage="stat-editing"' : '';
            
            return `<span class="inline-btn auto-account-cmd" data-mid="${mid}" data-cmd="${esc(num)}" data-action="command" ${editAttr} data-category="account" style="color: inherit; font-weight: 800; cursor: pointer; display: inline-block; width: 100%">${originalHtml}</span>`;
        }

        // --- 2. Account Stat Edit Buttons (+/-) ---
        if (type === 'account-stat-edit') {
            const statRegex = /([a-z]{3}):\s*(?:<[^>]+>)*(\d+)(?:<[^>]+>)*/gi;
            const blocks = originalHtml.replace(statRegex, (m, stat, valStr) => {
                const val = parseInt(valStr);
                const plusCmd = `${stat} ${val + 1}`;
                const minusCmd = `${stat} ${val - 1}`;
                
                return `
                    <div class="stat-block">
                        <div class="stat-label">${stat}:</div>
                        <div class="stat-controls">
                            <span class="inline-btn stat-btn" data-mid="${mid}" data-cmd="${esc(plusCmd)}" data-action="command" data-silent="true" data-category="account">+</span>
                            <span class="stat-value">${valStr}</span>
                            <span class="inline-btn stat-btn" data-mid="${mid}" data-cmd="${esc(minusCmd)}" data-action="command" data-silent="true" data-category="account">-</span>
                        </div>
                    </div>
                `.trim();
            });
            return `<div class="stat-editor-row">${blocks}</div>`;
        }

        // --- 3. Quest List Highlighting ---
        if (type === 'quest-list') {
            const textOnly = originalHtml.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
            if (textOnly.length > 0) {
                const lowerText = textOnly.toLowerCase();
                const isHeader = lowerText.includes('you have') || 
                                 lowerText.includes('you are') || 
                                 lowerText.includes('unfinished') || 
                                 lowerText.startsWith('(*') ||
                                 lowerText.includes('---');
                
                if (!isHeader) {
                    const context = textOnly.startsWith('*') ? textOnly.substring(1).trim().split(/\s*[-:]\s*/)[0].trim() : textOnly;
                    const buttonId = `quest-${context.toLowerCase().replace(/\s+/g, '-')}`;
                    const isSelected = isObjectSelected(selectedObjectIds, buttonId, 'quest');
                    
                    return `<span class="inline-btn auto-quest${isSelected ? ' selected' : ''}" data-id="${esc(buttonId)}" data-mid="${mid}" data-cmd="quest %n" data-context="${esc(context)}" data-action="command" data-from-drawer="true" data-category="quest">${originalHtml}</span>`;
                }
            }
        }

        return null;
    }, [esc, selectedObjectIds]);

    return { wrapSpecialLine };
};

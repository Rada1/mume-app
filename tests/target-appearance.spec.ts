/** @file target-appearance.spec.ts — One entity retains its visual identity in the log, target panel, and input. */
import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';

// --- Real Surface Styles ---
const styles = [
    'src/components/Messages/MessageLog.css',
    'src/components/Popovers/StandardMenu/CommandActionTargetPicker.css',
    'src/components/HUD/LogDockedInput.css',
    'src/components/HUD/TargetArgumentChip.css'
].map(path => readFileSync(path, 'utf8')).join('\n');

// --- Selected NPC Appearance ---
test('the accepted NPC chip matches the selected log and target-panel treatments', async ({ page }) => {
    await page.setContent(`<style>${styles}</style>
        <div style="font: 12px monospace">
            <div class="message-content"><button id="inline" class="inline-btn is-target" data-target-kind="enemy">
                <span style="color:#ababab">Morgundul orc-guard</span>
            </button></div>
            <button id="panel" class="command-action-target-option" data-target-kind="enemy" aria-current="true">
                <span style="color:#ababab">Morgundul orc-guard</span>
            </button>
            <div class="message-log-docked-input"><button id="chip"
                class="docked-target-badge has-target docked-argument-chip" data-target-kind="enemy"
                style="--argument-target-color:#ababab">
                <span class="docked-argument-chip-label">Morgundul orc-guard</span>
            </button></div>
        </div>`);
    const surfaces = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 1;
        const context = canvas.getContext('2d')!;
        const rgba = (color: string) => {
            context.clearRect(0, 0, 1, 1);
            context.fillStyle = color;
            context.fillRect(0, 0, 1, 1);
            return Array.from(context.getImageData(0, 0, 1, 1).data);
        };
        return ['inline', 'panel', 'chip'].map(id => {
            const element = document.getElementById(id)!;
            const style = getComputedStyle(element);
            return {
                text: getComputedStyle(element.querySelector('span')!).color,
                background: rgba(style.backgroundColor),
                edgeWidth: style.borderLeftWidth,
                radius: style.borderRadius
            };
        });
    });
    expect(surfaces[2]).toEqual(surfaces[0]);
    expect(surfaces[2]).toEqual(surfaces[1]);
    expect(surfaces[2].text).toBe('rgb(171, 171, 171)');
    expect(surfaces[2].edgeWidth).toBe('0px');
    const label = page.locator('#chip .docked-argument-chip-label');
    expect(await label.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
});

test('selecting an inline entity does not widen it or shift following log text', async ({ page }) => {
    await page.setContent(`<style>${styles}</style><div class="message-content" style="font:12px monospace">
        A <span id="entity" class="inline-btn" data-target-kind="enemy">Morgundul orc-guard</span>
        <span id="following">is here, preparing the chamber for you.</span>
    </div>`);
    for (const kind of ['enemy', 'ally', 'room']) {
        for (const inlineButton of [true, false]) {
            const results = await page.evaluate(({ kind, inlineButton }) => {
                const entity = document.getElementById('entity')!;
                const following = document.getElementById('following')!;
                entity.dataset.targetKind = kind;
                const baseClass = inlineButton ? 'inline-btn' : '';
                entity.className = baseClass;
                const measure = () => ({ width: entity.getBoundingClientRect().width,
                    left: following.getBoundingClientRect().left, top: following.getBoundingClientRect().top });
                const before = measure();
                const states = inlineButton
                    ? ['selected', 'menu-active', 'is-target', 'target-highlighter', 'active-target']
                    : ['target-highlighter is-target'];
                return states.map(state => {
                    entity.className = `${baseClass} ${state}`;
                    return { before, after: measure() };
                });
            }, { kind, inlineButton });
            for (const result of results) expect(result.after).toEqual(result.before);
        }
    }
});

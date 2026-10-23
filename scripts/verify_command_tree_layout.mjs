/** @file verify_command_tree_layout.mjs - Checks cascade expansion and stable column widths. */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
// --- Logic Section ---
const browser = await chromium.launch({headless:true});
try {
 const page = await browser.newPage({viewport:{width:1440,height:900}});
 const css = ['src/styles/base.css','src/styles/layout.css','src/styles/terminalPanels.css','src/components/HUD/CommandGuidePanel.css','src/components/HUD/UnifiedCommandPanel.css','src/components/css/Popovers.css','src/components/HUD/CommandPanelV2.css'].map(path => readFileSync(path,'utf8')).join('\n');
 await page.setContent(`<style>${css}</style><div class="app-container"><div class="content-layer has-docked-panel-surface"><aside class="docked-panel command-docked-panel" style="right:0"><aside class="command-guide-panel unified-command-panel command-tree-v2"><header class="command-tree-header">Commands</header><section class="unified-command-workspace"><div class="command-tree-branches"><nav class="command-tree-branch">Root</nav></div></section></aside></aside></div></div>`);
 for (const count of [1,3,5,7]) {
  await page.locator('.command-tree-branches').evaluate((node,count) => {node.innerHTML=Array.from({length:count},(_,i)=>`<nav class="command-tree-branch">Menu ${i}</nav>`).join('');},count);
  const geometry = await page.locator('.command-tree-branches').evaluate(node => ({width:node.getBoundingClientRect().width, scroll:node.scrollWidth, left:node.getBoundingClientRect().left,right:node.getBoundingClientRect().right, widths:[...node.children].map(child=>child.getBoundingClientRect().width)}));
  assert(geometry.widths.every(width => Math.abs(width-220)<0.05));
  assert(geometry.left>=0 && geometry.right<=1440);
  assert.equal(geometry.scroll, count*220);
  if(count<=5) assert.equal(geometry.width,count*220);
  console.log(`${count} menus: ${geometry.width}px visible, ${geometry.scroll}px total; stable 220px columns`);
 }
 await page.locator('.command-tree-branches').evaluate(node => {node.innerHTML=`<nav class="command-tree-branch terminal-inline-popover"><section class="command-tree-section"><h3 class="command-tree-section-heading">Use items</h3><button class="command-tree-row"><span class="command-tree-row-label">Drink</span><span class="command-tree-row-chevron">&#8249;</span></button><div><button class="command-tree-row" title="Drink Water / drink water"><span class="command-tree-row-label">Drink Water</span></button></div></section></nav>`;});
 const rows=await page.locator('.command-tree-row').evaluateAll(nodes=>nodes.map(node=>({height:node.getBoundingClientRect().height,width:node.getBoundingClientRect().width,border:getComputedStyle(node).borderWidth,radius:getComputedStyle(node).borderRadius})));
 assert.deepEqual(rows[0],rows[1]);
 assert.equal(rows[0].border,'0px');
 assert.equal(rows[0].radius,'0px');
 assert(await page.locator('.command-tree-section-heading').evaluate(node=>node.getBoundingClientRect().height)>=16);
 console.log('Direct and branching command rows have identical geometry, zero borders, and square corners.');
 await page.locator('.command-tree-branches').evaluate(node=>{node.innerHTML=`<section class="command-tree-branch"><section class="command-tree-section"><h3 class="command-tree-section-heading">Warrior</h3><div class="command-tree-section-commands">${Array.from({length:12},(_,i)=>`<button class="command-tree-row">Ability ${i}</button>`).join('')}</div></section><section class="command-tree-section"><h3 class="command-tree-section-heading">Cleric</h3><div class="command-tree-section-commands"><button class="command-tree-row">Bless</button></div></section></section>`;});
 const sections=await page.locator('.command-tree-section-commands').evaluateAll(nodes=>nodes.map(node=>({height:node.clientHeight,total:node.scrollHeight})));
 assert.equal(sections[0].height,165);
 assert(sections[0].total>=396);
 assert(sections[1].height<=165);
 await page.locator('.command-tree-section-commands').first().evaluate(node=>node.scrollTop=99);
 assert.equal(await page.locator('.command-tree-section-commands').nth(1).evaluate(node=>node.scrollTop),0);
 const bottom=await page.locator('.command-tree-branch').evaluate(node=>node.getBoundingClientRect().bottom);
 assert(bottom<875, `Short menu bottom ${bottom} must stop after its content`);
 const headingStyle=await page.locator('.command-tree-section-heading').first().evaluate(node=>({font:getComputedStyle(node).fontFamily,line:getComputedStyle(node,'::after').borderTopWidth}));
 assert(headingStyle.font.startsWith('Arial'));
 assert.equal(headingStyle.line,'1px');
 console.log('Section labels use a plain Arial font and a thin divider despite the global fantasy heading rule.');
 console.log('Sections show five rows before scrolling independently; short columns stop after their content.');
 await page.locator('.command-tree-branches').evaluate(node => {node.innerHTML='<nav class="command-tree-branch">'+Array.from({length:60},(_,i)=>`<button class="command-tree-row">Target ${i}</button>`).join('')+'</nav><nav class="command-tree-branch"><button class="command-tree-row">Short menu</button></nav>';});
 const columns=await page.locator('.command-tree-branch').evaluateAll(nodes=>nodes.map(node=>({height:node.clientHeight,total:node.scrollHeight,bottom:node.getBoundingClientRect().bottom})));
 assert(columns[0].total>columns[0].height);
 assert(columns[0].bottom>=875 && columns[0].bottom<=900);
 assert(columns[1].height<60);
 console.log('Long columns reach the client bottom and scroll; neighboring short columns retain their own height.');
} finally {await browser.close();}

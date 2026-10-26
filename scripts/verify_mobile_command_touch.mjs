/** @file verify_mobile_command_touch.mjs — Native mobile command swipes and held-pane touch policy. */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

// --- Mobile Browser Fixture Section ---
const browser = await chromium.launch({headless:true});
try {
 const page = await browser.newPage({viewport:{width:575,height:900},isMobile:true,hasTouch:true});
 const css = ['src/components/HUD/CommandPanelV2.css','src/components/HUD/CommandDockMobileFocus.css',
  'src/components/HUD/CommandTreeMovement.css'].map(path=>readFileSync(path,'utf8')).join('\n');
 await page.setContent(`<meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style>
 <div class="app-container is-mobile readability-mode" style="--mobile-readability-menu-top:100px;--mobile-readability-menu-bottom:20px">
 <div class="command-tree-v2 command-tree-mobile-readability-popup"><div class="unified-command-workspace">
 <div class="command-tree-branches" data-has-main-branch="true">
 <section class="command-tree-branch command-tree-main-branch is-ability-class-menu">
 <div class="command-tree-ability-class-area"><div class="command-tree-ability-mode-commands">
 <div class="command-tree-section-commands is-ability-mode-commands">${Array.from({length:10},(_,i)=>
  `<button class="command-tree-row is-touch-hold-enabled">Observe ${i}</button>`).join('')}</div></div></div></section>
 <section class="command-tree-branch is-ability-side-branch command-tree-held-command-targets">
 ${Array.from({length:30},(_,i)=>`<button class="command-tree-row" style="display:block;width:100%;height:48px">Target ${i}</button>`).join('')}
 </section></div></div></div></div>`);
 const strip = page.locator('.command-tree-ability-mode-commands');
 const row = strip.locator('button').first();
 const pane = page.locator('.command-tree-held-command-targets');
 const harness = await build({stdin:{contents:`
  import React from 'react';
  import {createRoot} from 'react-dom/client';
  import {useSecondaryTouchActivation} from './src/hooks/useSecondaryTouchActivation';
  const Targets = () => React.createElement('div',useSecondaryTouchActivation(),
   Array.from({length:30},(_,i)=>React.createElement('button',{
    key:i,className:'command-tree-row',
    style:{display:'block',width:'100%',height:48},onClick:()=>window.targetActivations++
   },'Target '+i)));
  window.targetActivations=0;
  window.mountTouchTargets=node=>createRoot(node).render(React.createElement(Targets));
  window.mountTouchTargets(document.querySelector('.command-tree-held-command-targets'));
 `,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,format:'iife',platform:'browser',
  define:{'process.env.NODE_ENV':'"production"'}});
 await page.addScriptTag({content:harness.outputFiles[0].text});
 await pane.locator('button').first().waitFor();
 assert.equal(await row.evaluate(node=>getComputedStyle(node).touchAction),'pan-x');
 assert.equal(await strip.evaluate(node=>getComputedStyle(node).touchAction),'pan-x');
 assert.equal(await pane.evaluate(node=>getComputedStyle(node).touchAction),'pan-y');

// --- Native Touch Swipe Section ---
 const client = await page.context().newCDPSession(page);
 const bounds = await strip.boundingBox();
 assert(bounds);
 const start = {x:bounds.x+bounds.width-20,y:bounds.y+bounds.height/2};
 await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...start,id:1}]});
 for(let step=1;step<=8;step++) {
  await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start.x-step*20,y:start.y,id:1}]});
  await page.waitForTimeout(20);
 }
 await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await page.waitForTimeout(100);
 assert(await strip.evaluate(node=>node.scrollLeft)>30,'Swiping a command button must scroll its horizontal row.');
 // Keep one contact on the command while another scrolls its targets.
 await page.evaluate(()=>{ window.primaryCancellations=0;
  window.addEventListener('pointercancel',event=>{if(event.isPrimary) window.primaryCancellations++;});
 });
 const paneBounds = await pane.boundingBox();
 assert(paneBounds);
 const held = {x:bounds.x+20,y:start.y,id:1};
 const second = {x:paneBounds.x+paneBounds.width/2,y:paneBounds.y+250,id:2};
 await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[held]});
 await page.waitForTimeout(150);
 await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[held,second]});
 for(let step=1;step<=8;step++) {
  await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[held,{...second,y:second.y-step*15}]});
  await page.waitForTimeout(20);
 }
 assert(await pane.evaluate(node=>node.scrollTop)>60,'The second finger must scroll targets while the first holds a command.');
 assert.equal(await page.evaluate(()=>window.targetActivations),0,'A target drag must not execute a command.');
 assert.equal(await page.evaluate(()=>window.primaryCancellations),0,'Scrolling targets must not cancel the command hold.');
 await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[{...second,y:second.y-120}]});
 const tap = {x:second.x,y:second.y,id:3};
 await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[held,tap]});
 await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[tap]});
 await page.waitForTimeout(100);
 assert.equal(await page.evaluate(()=>window.targetActivations),1,'A second-finger tap must execute exactly once.');
 await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});

// --- Live Third-Column Navigation Section ---
 await strip.evaluate(node=>{node.style.touchAction='pan-y';
  node.querySelectorAll('button').forEach(button=>button.style.touchAction='pan-y');
 });
 const stagedHold={...held,id:11};
 await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[stagedHold]});
 await page.waitForTimeout(150);
 await page.evaluate(()=>{
  document.querySelector('.command-tree-held-command-targets').classList.remove('is-ability-side-branch');
  const stage=document.createElement('section');
  stage.className='command-tree-branch terminal-inline-popover command-tree-held-command-targets';
  stage.setAttribute('aria-label','Stage targets');
  document.querySelector('.command-tree-branches').append(stage);
  window.mountTouchTargets(stage);
 });
 const stage=page.locator('[aria-label="Stage targets"]');
 await stage.locator('button').first().waitFor();
 const columns=await page.locator('.command-tree-branches > .command-tree-branch').evaluateAll(nodes=>
  nodes.map(node=>({left:node.getBoundingClientRect().left,right:node.getBoundingClientRect().right,width:node.getBoundingClientRect().width})));
 assert.equal(columns.length,3);
 assert(columns.every(column=>Math.abs(column.width-columns[0].width)<1),'Three stages must share the viewport width.');
 assert(columns[0].right<=columns[1].left&&columns[1].right<=columns[2].left&&columns[2].right<=575,
  'Navigation must create three adjacent columns without overlapping or clipping.');
 const stageBounds=await stage.boundingBox();
 assert(stageBounds);
 const stageTouch={x:stageBounds.x+stageBounds.width/2,y:stageBounds.y+250,id:12};
 await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[stagedHold,stageTouch]});
 for(let step=1;step<=8;step++) {
  await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[stagedHold,{...stageTouch,y:stageTouch.y-step*15}]});
  await page.waitForTimeout(20);
 }
 assert(await stage.evaluate(node=>node.scrollTop)>60,'The third column must scroll while the command is held.');
 await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[{...stageTouch,y:stageTouch.y-120}]});
 const stageTap={...stageTouch,id:13};
 await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[stagedHold,stageTap]});
 await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[stageTap]});
 await page.waitForTimeout(100);
 assert.equal(await page.evaluate(()=>window.targetActivations),2,'Third-column navigation taps must activate once without activating a drag.');
 assert.equal(await page.evaluate(()=>window.primaryCancellations),0,'Opening or scrolling a third column must preserve the command hold.');
 await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});

// --- Vertical Menus and Horizontal Category Selectors ---
 const main=page.locator('.command-tree-main-branch');
 await stage.evaluate(node=>node.remove());
 await pane.evaluate(node=>node.classList.add('is-ability-side-branch'));
 await main.evaluate(node=>{
  node.classList.remove('is-ability-class-menu');
  node.innerHTML='<div class="command-tree-section-commands">'+Array.from({length:90},(_,i)=>
   '<button class="command-tree-row is-touch-hold-enabled">Observe '+i+'</button>').join('')+'</div>';
 });
 const swipeSurface=async(surface,horizontal)=>{
  const box=await surface.boundingBox();
  assert(box);
  const point={x:horizontal?box.x+box.width-20:box.x+box.width/2,y:box.y+Math.min(180,box.height/2),id:21};
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});
  for(let step=1;step<=8;step++) {
   await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...point,
    x:point.x-(horizontal?step*20:0),y:point.y-(horizontal?0:step*20)}]});
   await page.waitForTimeout(20);
  }
  await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitForTimeout(100);
 };
 await swipeSurface(main,false);
 assert(await main.evaluate(node=>node.scrollTop)>40,'Observation commands must scroll vertically.');
 await main.evaluate(node=>{
  node.scrollTop=0;
  node.classList.add('is-category-section-menu');
  node.innerHTML='<div class="command-tree-category-section-area"><div class="command-tree-category-section-selector">'
   +Array.from({length:8},(_,i)=>'<button>Category section '+i+'</button>').join('')
   +'</div><div class="command-tree-category-section-commands"><div class="command-tree-section-commands">'
   +Array.from({length:90},(_,i)=>'<button class="command-tree-row is-touch-hold-enabled">Action '+i+'</button>').join('')
   +'</div></div></div>';
 });
 const selector=main.locator('.command-tree-category-section-selector');
 await swipeSurface(selector,true);
 assert(await selector.evaluate(node=>node.scrollLeft)>40,'Objects and Social section tabs must scroll horizontally.');
 const selectorTop=(await selector.boundingBox()).y;
 const commands=main.locator('.command-tree-category-section-commands');
 await swipeSurface(commands,false);
 assert(await commands.evaluate(node=>node.scrollTop)>40,'The selected category commands must scroll vertically.');
 assert.equal((await selector.boundingBox()).y,selectorTop,'Category tabs must stay visible while their commands scroll.');

// --- Selector Highlights Stay on Tabs ---
 for(const [areaClass,selectorClass] of [
  ['command-tree-ability-class-area','command-tree-ability-class-selector'],
  ['command-tree-category-section-area','command-tree-category-section-selector'],
  [null,'command-tree-location-selector']
 ]) {
  await main.evaluate((node,{areaClass,selectorClass})=>{
   node.scrollTop=0;
   const tabs='<div class="'+selectorClass+'"><button>First</button><button>Second</button></div>';
   const commands='<div class="command-tree-section-commands"><button class="command-tree-row">Target</button></div>';
   node.innerHTML=areaClass?'<div class="'+areaClass+'">'+tabs+commands+'</div>':tabs+commands;
   node.querySelectorAll('.'+selectorClass+' button').forEach(button=>button.onclick=()=>{
    node.querySelectorAll('.'+selectorClass+' button').forEach(tab=>tab.classList.remove('is-selected'));
    button.classList.add('is-selected');
   });
  },{areaClass,selectorClass});
  const selectedTab=main.locator('.'+selectorClass+' button').nth(1);
  await selectedTab.tap();
  await selectedTab.hover();
  assert(await selectedTab.evaluate(node=>getComputedStyle(node).backgroundColor)!=='rgba(0, 0, 0, 0)',
   'The selected tab must retain its own highlight.');
  for(const containerClass of [areaClass,selectorClass].filter(Boolean)) {
   assert.equal(await main.locator('.'+containerClass).evaluate(node=>getComputedStyle(node).backgroundColor),'rgba(0, 0, 0, 0)',
    containerClass+' must not highlight when one of its tabs is selected or hovered.');
  }
 }
 console.log('Touch gestures, staged columns, vertical command lists, and tab-only highlights pass for class, category, and location selectors.');
} finally { await browser.close(); }

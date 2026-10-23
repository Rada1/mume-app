/** @file verify_vignette_transition.mjs -- Browser pixel checks for complete corner vignette fades. */
import { build } from 'esbuild';
import { chromium } from '@playwright/test';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { verifySolarSky } from './verify_solar_sky.mjs';
import { verifyHorizonSun } from './verify_horizon_sun.mjs';

// --- Actual React components, with a deterministic frame clock ---
const require = createRequire(import.meta.url);
const { PNG } = require(resolve('node_modules/playwright-core/lib/utilsBundle.js'));
const bundle = await build({
    stdin: { resolveDir: process.cwd(), loader: 'jsx', contents: `
        import React from 'react';
        import {createRoot} from 'react-dom/client';
        import {flushSync} from 'react-dom';
        import {useEnvironmentTransitions} from './src/hooks/useEnvironmentTransitions';
        import {EnvironmentVignetteLayers} from './src/components/Atmosphere/EnvironmentVignetteLayers';
        import {EnvironmentTwilight} from './src/components/Atmosphere/EnvironmentTwilight';
        import {EnvironmentWeatherLayers} from './src/components/Atmosphere/EnvironmentWeatherLayers';
        let now=0, sequence=0;
        const frames=new Map();
        Object.defineProperty(performance,'now',{value:()=>now});
        window.requestAnimationFrame=callback=>{frames.set(++sequence,callback);return sequence;};
        window.cancelAnimationFrame=id=>frames.delete(id);
        let options={lighting:'artificial',weather:'clear',isIndoor:true,isOutdoor:false,isNight:false};
        let twilightTime;
        let solarTime;
        function Harness(){
            const {lightingTransition,weatherTransition,starsOpacity}=useEnvironmentTransitions({...options,gameTime:solarTime});
            return <div className={'environment-root front lighting-state-'+options.lighting}>
                <div className="client-star-veil" style={{opacity:starsOpacity,transition:'none'}}/>
                <EnvironmentVignetteLayers {...options} {...lightingTransition} gameTime={solarTime} isEnabled />
                <EnvironmentTwilight time={twilightTime} isOutdoor isEnabled />
                <EnvironmentWeatherLayers transition={weatherTransition} isFoggy={false} lightning={false}
                    isEnabled isPerformanceMode={false} />
            </div>;
        }
        const root=createRoot(document.getElementById('root'));
        window.setVignette=lighting=>{
            options={...options,lighting,isIndoor:lighting==='artificial',isOutdoor:lighting!=='artificial'};
            flushSync(()=>root.render(<Harness/>));
        };
        window.setSky=(lighting,weather,isIndoor=false)=>{
            options={...options,lighting,weather,isIndoor,isOutdoor:!isIndoor};
            flushSync(()=>root.render(<Harness/>));
        };
        window.setSunTime=(hour,minute=0,month='Afteryule')=>{
            solarTime={month,hour,minute,mumeStartEpoch:0,lastSyncRealTime:(hour*60+minute)*1000};
            flushSync(()=>root.render(<Harness/>));
        };
        window.setTwilight=(phase,minute)=>{
            const hour=phase==='dawn'?8:18;
            twilightTime={month:'Afteryule',hour,minute,mumeStartEpoch:0,lastSyncRealTime:(hour*60+minute)*1000};
            flushSync(()=>root.render(<Harness/>));
        };
        window.step=time=>flushSync(()=>{
            now=time;const pending=[...frames.values()];frames.clear();pending.forEach(callback=>callback(now));
        });
        window.setVignette('artificial');
    ` },
    bundle: true, write: false, loader: { '.css': 'empty' },
    define: { 'process.env.NODE_ENV': '"production"' },
});
const css = [
    'src/styles/environment.css', 'src/styles/effects.css',
    'src/components/Atmosphere/SunlightClouds.css', 'src/components/Atmosphere/Moonlight.css',
    'src/components/Atmosphere/EnvironmentTransitions.css',
    'src/components/Atmosphere/EnvironmentVignetteLayers.css',
    'src/components/Atmosphere/TwilightTransition.css',
    'src/components/Atmosphere/CornerWeather.css', 'src/components/Atmosphere/Stars.css',
].map(path => readFileSync(path, 'utf8')).join('\n');

// --- Browser compositing checks, including Performance Mode ---
let browser;
try { browser = await chromium.launch({ headless: true }); }
catch { browser = await chromium.launch({ headless: true, channel: 'msedge' }); }
try {
    for (const performanceMode of [false, true]) {
        const page = await browser.newPage({ viewport: { width: 1000, height: 800 }, deviceScaleFactor: 1 });
        await page.route('http://vignette.test/assets/atmosphere/*', async route => {
            const file=new URL(route.request().url()).pathname.split('/').pop();
            await route.fulfill({contentType:'image/svg+xml',body:readFileSync(resolve('public/assets/atmosphere',file))});
        });
        await page.setContent(`<base href="http://vignette.test/"><div id="root" class="app-container immersion-mode ${performanceMode ? 'performance-mode' : ''}"></div>`);
        await page.addStyleTag({ content: css + '\nbody{background:rgb(48,48,48);margin:0}*{animation:none!important}' });
        await page.addScriptTag({ content: bundle.outputFiles[0].text });
        await page.evaluate(() => Promise.all(['clear-sky-wisps.svg','drifting-clouds.svg','veiled-cloud-wisps.svg','rain-cloud-ceiling.svg'].map(file =>
            new Promise(resolve => {const image=new Image();image.onload=resolve;image.src='/assets/atmosphere/'+file;}))));
        await page.waitForTimeout(50);
        const cdp = await page.context().newCDPSession(page);
        const sample = async () => {
            const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
            const png = PNG.sync.read(Buffer.from(data, 'base64'));
            return [[940,64],[990,10],[980,780],[700,600]].flatMap(([x,y]) => {
                const offset=(y*png.width+x)*4;
                return [...png.data.subarray(offset,offset+3)];
            });
        };
        let clock = 0;
        for (const target of ['sun', 'artificial', 'moon', 'sun']) {
            const start = await sample();
            await page.evaluate(light => window.setVignette(light), target);
            const first = await sample();
            assert.deepEqual(first, start, `${target}: entry must retain the previous pixels`);
            const samples = [];
            for (const elapsed of [250,500,750,1000]) {
                await page.evaluate(time => window.step(time), clock+elapsed);
                samples.push(await sample());
            }
            const end = samples[3];
            for (let index=0;index<3;index++) {
                const fraction=(index+1)/4;
                const eased=fraction*fraction*(3-2*fraction);
                samples[index].forEach((value,channel) => {
                    const expected=start[channel]*(1-eased)+end[channel]*eased;
                    assert.ok(Math.abs(value-expected)<=3,
                        `${target}, ${fraction}, channel ${channel}: pixel ${value}, expected ${expected}`);
                });
            }
            clock+=1000;
            await page.evaluate(light => window.setVignette(light), target);
            await page.evaluate(time => window.step(time), clock+1000);
            assert.deepEqual(await sample(), end, `${target}: settled/same-source pixels must remain identical`);
            await page.evaluate(() => document.body.classList.add('ui-scrolling'));
            assert.deepEqual(await sample(), end, `${target}: log scrolling must not hide the vignette`);
            await page.evaluate(() => document.body.classList.remove('ui-scrolling'));
            clock+=1000;
        }
        console.log(`Vignette pixel interpolation and settled brightness passed (Performance Mode: ${performanceMode}).`);
        for (const target of ['dark','sun','dark','sun','artificial','sun','artificial','dark']) {
            const before=await sample();
            const oldWeights=await page.locator('.environment-vignette-scene').evaluateAll(elements=>
                elements.map(element=>({source:[...element.classList].find(name=>name.startsWith('vignette-state-')),opacity:Number(element.style.opacity)})));
            await page.evaluate(light=>window.setVignette(light),target);
            assert.deepEqual(await sample(),before,`${target}: rapid room changes must preserve the visible pixels`);
            await page.evaluate(time=>window.step(time),clock+100);
            const weights=await page.locator('.environment-vignette-scene').evaluateAll(elements=>
                Object.fromEntries(elements.map(element=>[[...element.classList].find(name=>name.startsWith('vignette-state-')),Number(element.style.opacity)])));
            for(const source of new Set([...oldWeights.map(layer=>layer.source),'vignette-state-'+target])) {
                const start=oldWeights.find(layer=>layer.source===source)?.opacity??0;
                const expected=start*(1-0.028)+(source==='vignette-state-'+target?0.028:0);
                assert.ok(Math.abs((weights[source]??0)-expected)<0.00001,'Every reversal must start a fresh one-second fade from the current mix');
            }
            clock+=100;
        }
        await page.evaluate(time=>window.step(time),clock+1000);
        clock+=1000;
        assert.equal(await page.locator('.environment-vignette-scene').count(),1);
        await page.evaluate(()=>window.setVignette('sun'));
        await page.evaluate(time=>window.step(time),clock+1000);
        clock+=1000;
        console.log(`Rapid room reversal pixel continuity passed (Performance Mode: ${performanceMode}).`);
        for (const phase of ['dawn', 'dusk']) {
            await page.evaluate(phase => window.setTwilight(phase,20), phase);
            await page.waitForTimeout(1100);
            const readTint = () => page.evaluate(() => {
                const element=document.querySelector('.environment-twilight-vignette');
                const computed=getComputedStyle(element);
                return { color: computed.backgroundColor, target: element.style.backgroundColor,
                    mask: computed.maskImage, opacity: computed.opacity };
            });
            const before=await readTint();
            await page.evaluate(phase => window.setTwilight(phase,40), phase);
            await page.waitForTimeout(450);
            const halfway=await readTint();
            assert.notEqual(halfway.color,before.color,`${phase}: browser must interpolate the tint`);
            assert.notEqual(halfway.color,halfway.target,`${phase}: tint must not snap to the next color`);
            assert.equal(halfway.mask,before.mask,`${phase}: vignette geometry must remain fixed`);
            await page.waitForTimeout(700);
            const finished=await readTint();
            assert.equal(finished.color,finished.target);
            await page.evaluate(phase => window.setTwilight(phase,60), phase);
            await page.waitForTimeout(1100);
            assert.equal((await readTint()).opacity,'0.48',`${phase}: twilight must peak at the cutoff`);
            await page.evaluate(phase => window.setTwilight(phase,120), phase);
            await page.waitForTimeout(1100);
            assert.equal((await readTint()).opacity,'0',`${phase}: twilight must end at its clock boundary`);
        }
        console.log(`Clock-driven dawn/dusk tint interpolation passed (Performance Mode: ${performanceMode}).`);
        const readSun = () => page.evaluate(() => {
            const sun=document.querySelector('.client-sun-disc');
            return { y: parseFloat(getComputedStyle(sun).top), opacity: getComputedStyle(sun).opacity,
                scenes: document.querySelectorAll('.environment-vignette-scene').length };
        });
        const settleSun = y => page.waitForFunction(expected =>
            Math.abs(parseFloat(getComputedStyle(document.querySelector('.client-sun-disc')).top)-expected)<0.001,
            y, {polling:50,timeout:5000});
        await page.evaluate(() => window.setSunTime(9));
        await page.waitForTimeout(1100);
        await settleSun(432);
        assert.equal((await readSun()).y,432);
        await page.evaluate(() => window.setSunTime(9,30));
        await page.waitForTimeout(450);
        const rising=await readSun();
        assert.ok(rising.y>312 && rising.y<432,'Sun must move smoothly upward from the gradient horizon');
        assert.equal(rising.scenes,2,'Dawn must retain its clock-weighted day and night skies');
        await page.waitForTimeout(700);
        await settleSun(312);
        assert.equal((await readSun()).y,312);
        await page.evaluate(() => window.setSunTime(14));
        await page.waitForTimeout(1100);
        await settleSun(64);
        assert.equal((await readSun()).y,64);
        await page.evaluate(() => window.setSunTime(19));
        await page.waitForTimeout(1100);
        await settleSun(432);
        assert.equal((await readSun()).y,432);
        assert.equal((await readSun()).opacity,'0');
        console.log(`Clock-driven sun rise, midday height, and sunset passed (Performance Mode: ${performanceMode}).`);
        await page.evaluate(() => window.setSunTime(14));
        await page.waitForTimeout(1100);
        await page.addStyleTag({content:'.corner-weather-clouds{animation:veiled-cloud-drift 140s linear infinite!important}'});
        for (const [lighting,weather] of [['dark','cloud'],['sun','cloud'],['sun','rain']]) {
            const before=await sample();
            await page.evaluate(([light,cover])=>window.setSky(light,cover),[lighting,weather]);
            assert.deepEqual(await sample(),before,`${lighting}/${weather}: entering clouds must not snap the visible sky`);
            let incomingCloud;
            for(const elapsed of [250,500,750,1000]) {
                await page.evaluate(time=>window.step(time),clock+elapsed);
                const snapshot=await page.evaluate(({lighting,weather})=>{
                    const scene=[...document.querySelectorAll('.environment-weather-scene')].find(element=>
                        element.classList.contains('lighting-state-'+lighting)&&element.querySelector('.weather-'+weather));
                    const vignette=document.querySelector('.vignette-state-'+lighting+'.weather-state-'+(weather==='rain'?'rain':lighting==='sun'?'cloud':'clear'));
                    const motion=scene.querySelector('.corner-weather-cloud-motion');
                    return {opacity:Number(getComputedStyle(scene).opacity),lightOpacity:Number(getComputedStyle(vignette).opacity),
                        translation:new DOMMatrix(getComputedStyle(motion).transform).m41};
                },{lighting,weather});
                const fraction=elapsed/1000,progress=fraction*fraction*(3-2*fraction);
                assert.ok(Math.abs(snapshot.opacity-progress)<0.0001,'Cloud opacity must follow the one-second frame clock');
                assert.ok(Math.abs(snapshot.lightOpacity-progress)<0.0001,'Sky darkening must use the same progress');
                assert.ok(Math.abs(snapshot.translation-(1-progress)*252)<0.01,'Clouds must sweep quickly into position');
                if(elapsed===750)incomingCloud=await page.locator('.environment-weather-scene.lighting-state-'+lighting+' .weather-'+weather+' .corner-weather-clouds').elementHandle();
            }
            clock+=1000;
            const retained=await incomingCloud.evaluate(element=>element.isConnected&&getComputedStyle(element).animationName==='veiled-cloud-drift');
            assert.ok(retained,'Settling clouds must retain their DOM and normal slow drift');
            await page.evaluate(() => document.body.classList.add('ui-scrolling'));
            assert.equal(await page.locator('.environment-weather-layers').evaluate(element=>getComputedStyle(element).opacity),'1');
            await page.evaluate(() => document.body.classList.remove('ui-scrolling'));
            await page.evaluate(()=>window.setSky('sun','clear'));
            await page.evaluate(time=>window.step(time),clock+1000);
            clock+=1000;
        }
        console.log(`Synchronized one-second weather entry and normal cloud drift passed (Performance Mode: ${performanceMode}).`);
        await page.evaluate(()=>window.setSky('dark','clear'));
        await page.evaluate(time=>window.step(time),clock+500);
        const interrupted=await sample();
        await page.evaluate(()=>window.setSky('dark','cloud'));
        assert.deepEqual(await sample(),interrupted,'A later weather packet must preserve the partially faded sky pixels');
        await page.evaluate(time=>window.step(time),clock+1500);
        assert.equal(await page.locator('.environment-weather-scene').count(),1);
        console.log(`Interrupted light/weather packet continuity passed (Performance Mode: ${performanceMode}).`);
        clock+=1500;
        clock=await verifySolarSky(page,sample,clock);
        console.log(`Full twilight sky endpoints and cutoff pixel continuity passed (Performance Mode: ${performanceMode}).`);
        await page.setViewportSize({width:2048,height:840});
        await page.evaluate(()=>window.setSky('artificial','none',true));
        await page.evaluate(time=>window.step(time),clock+1000);
        clock+=1000;
        await page.evaluate(()=>window.setSunTime(8,9,'Wedmath'));
        await page.evaluate(()=>window.setSky('sun','none',true));
        await page.evaluate(time=>window.step(time),clock+1000);
        await page.waitForTimeout(1100);
        const sunCenter=await page.locator('.vignette-state-sun.is-indoor .client-sun-disc').evaluate(element=>{
            const rect=element.getBoundingClientRect();
            return {x:Math.round(rect.x+rect.width/2),y:Math.round(rect.y+rect.height/2),opacity:getComputedStyle(element).opacity};
        });
        assert.equal(sunCenter.opacity,'1');
        assert.ok(sunCenter.y>0 && sunCenter.y<840*0.24,'Summer 8:09 sun must be inside the visible sky');
        const {data}=await cdp.send('Page.captureScreenshot',{format:'png'});
        const screenshot=Buffer.from(data,'base64'),pixels=PNG.sync.read(screenshot);
        const brightness=(x,y)=>{
            const offset=(y*pixels.width+x)*4;
            return (pixels.data[offset]+pixels.data[offset+1]+pixels.data[offset+2])/3;
        };
        assert.ok(brightness(sunCenter.x,sunCenter.y)>brightness(sunCenter.x-80,sunCenter.y)+15,
            'The actual sun disc must be visibly brighter than the surrounding sky');
        mkdirSync('test-results',{recursive:true});
        writeFileSync(`test-results/sunlight-8am-${performanceMode?'performance':'normal'}.png`,screenshot);
        console.log(`Sunlit indoor-terrain room at Wedmath 8:09 visibly renders the sun (Performance Mode: ${performanceMode}).`);
        clock=await verifyHorizonSun(page,cdp,PNG,clock,performanceMode);
        console.log(`Visible 5:00 and 5:19 horizon sun in sunlight and outdoor artificial light passed (Performance Mode: ${performanceMode}).`);
        await page.close();
    }
} finally { await browser.close(); }

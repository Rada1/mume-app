/** @file useCommandTreeShopTargets.test.tsx - Checks command-first shop routing through shared handlers. */
// @vitest-environment jsdom
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {useCommandTreeShopTargets} from './useCommandTreeShopTargets';
import type {useCommandTreeController} from './useCommandTreeController';
import {COMMAND_TREE_SHOP_BUTTONS} from '../utils/commandTreeShop';
// --- Routing Checks ---
it('routes shop actions on target taps and keeps List free of item commands',async()=>{
 const shop={browsing:false,stockPending:false,pendingCommand:null,compareFirst:null,
  browse:vi.fn(),refreshBalance:vi.fn(),setCompareFirst:vi.fn(),selectStock:vi.fn(),runShow:vi.fn(),tryCompare:vi.fn(),runInventoryAction:vi.fn(),runStockAction:vi.fn()};
 const controller={shop,entries:[{id:'coat',group:'inventory',context:'coat',label:'Coat'},{id:'boots',group:'worn',context:'boots',label:'Boots'}],previewEntity:vi.fn(),isHelpMode:false} as unknown as ReturnType<typeof useCommandTreeController>;
 const stock={num:1,name:'Sword'} as NonNullable<typeof controller.shop.selectedStock>;
 let targets:ReturnType<typeof useCommandTreeShopTargets>;
 const root=createRoot(document.createElement('div'));
 function Harness({index}:{index:number}){targets=useCommandTreeShopTargets(controller,COMMAND_TREE_SHOP_BUTTONS[index]);return null;}
 try{
  await act(async()=>root.render(<Harness index={0}/>));
  expect(shop.browse).toHaveBeenCalledOnce();
  shop.browsing=true;
  targets.selectStock(stock);
  expect(shop.selectStock).not.toHaveBeenCalled();
  expect(shop.runStockAction).toHaveBeenCalledWith('buy',stock);
  await act(async()=>root.render(<Harness index={1}/>));
  expect(targets.inventory.map(entry=>entry.id)).toEqual(['coat']);
  targets.selectInventory(controller.entries[0]);
  expect(shop.runInventoryAction).toHaveBeenLastCalledWith('sell','coat','Coat');
  await act(async()=>root.render(<Harness index={2}/>));
  targets.selectInventory(controller.entries[0]);
  expect(shop.runInventoryAction).toHaveBeenLastCalledWith('value','coat','Coat');
  await act(async()=>root.render(<Harness index={3}/>));
  targets.selectStock(stock);
  expect(shop.setCompareFirst).toHaveBeenLastCalledWith(stock);
  controller.shop.compareFirst=stock;
  await act(async()=>root.render(<Harness index={3}/>));
  expect(targets.showInventory).toBe(true);
  expect(targets.inventory.map(entry=>entry.id)).toEqual(['coat','boots']);
  targets.selectInventory(controller.entries[0]);
  expect(shop.tryCompare).toHaveBeenCalledWith(controller.entries[0]);
  await act(async()=>root.render(<Harness index={4}/>));
  targets.selectStock(stock);
  expect(shop.runShow).toHaveBeenCalledWith(1);
  await act(async()=>root.render(<Harness index={5}/>));
  expect(targets.showStock).toBe(true);
  expect(targets.showInventory).toBe(false);
  vi.clearAllMocks();
  targets.selectStock(stock);
  expect(shop.selectStock).not.toHaveBeenCalled();
  expect(shop.runShow).not.toHaveBeenCalled();
  expect(shop.runStockAction).not.toHaveBeenCalled();
  expect(shop.setCompareFirst).not.toHaveBeenCalled();
  await act(async()=>root.render(<Harness index={6}/>));
  expect(targets.showInventory).toBe(true);
  expect(targets.showStock).toBe(false);
  targets.selectInventory(controller.entries[0]);
  expect(shop.runInventoryAction).toHaveBeenLastCalledWith('mend','coat','Coat');
 }finally{await act(async()=>root.unmount());}
});

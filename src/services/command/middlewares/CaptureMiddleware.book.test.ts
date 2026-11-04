/** @file CaptureMiddleware.book.test.ts — Route book reads to Details. */
import { afterEach, expect, it, vi } from 'vitest';
import type { CommandContext } from '../types';
import { useUIStore } from '../../../stores/useUIStore';
import { useClientPanelStackStore } from '../../../stores/useClientPanelStackStore';
import { CaptureMiddleware } from './CaptureMiddleware';
import { useArchiveStore } from '../../../stores/useArchiveStore';

// --- Book capture section ---
afterEach(() => { useUIStore.getState().setPopoverState(null); useClientPanelStackStore.getState().setDetailsEnabled(false); });
it('opens Details without silencing a typed book read', () => {
 const executeCommand = vi.fn();
 const captureStage = { current: 'none' } as CommandContext['captureStage'];
 const context = {captureStage, executeCommand, setPendingFlags:vi.fn()} as unknown as CommandContext;
 expect(CaptureMiddleware('read 2.book', context, {silent:false, isSystem:false, fromDrawer:false})).toBeUndefined();
 expect(captureStage.current).toBe('book_read');
 expect(executeCommand).not.toHaveBeenCalled();
 expect(useClientPanelStackStore.getState().detailsEnabled).toBe(true);
 expect(useUIStore.getState().popoverState).toMatchObject({commandPanelCapture:true,
  commandReportCommand:'read 2.book', commandReportLabel:'2.book', isCapturingCommandReport:true});
});
it('routes board lists and messages to Details', () => {
 const executeCommand = vi.fn();
 const captureStage = {current:'none'} as CommandContext['captureStage'];
 const context = {captureStage, executeCommand, setPendingFlags:vi.fn()} as unknown as CommandContext;
 for (const [command, stage] of [['look board', 'board_list'], ['read 12', 'board_read']] as const) {
  expect(CaptureMiddleware(command, context, {silent:false, isSystem:false, fromDrawer:false})).toBeUndefined();
  expect(captureStage.current).toBe(stage);
  expect(useUIStore.getState().popoverState).toMatchObject({commandReportCommand:command, isCapturingCommandReport:true});
 }
});
it('preserves a board capture during the silent dispatch instead of finalizing it', () => {
 const finalizeCapture = vi.fn();
 const captureStage = {current:'none'} as CommandContext['captureStage'];
 const context = {captureStage, finalizeCapture, setPendingFlags:vi.fn()} as unknown as CommandContext;
 useUIStore.getState().setPopoverState({x:0,y:0,setId:'board',commandPanelCapture:true,
  commandReportCommand:'read 1103',isCapturingCommandReport:true});
 CaptureMiddleware('read 1103', context, {silent:true,isSystem:true,fromDrawer:true});
 expect(captureStage.current).toBe('board_read');
 expect(finalizeCapture).not.toHaveBeenCalled();
});
it.each(['look mail', 'l mail', 'l mailbox', 'l seen mail'])('routes %s and selected messages through Details', command => {
 const context = {captureStage:{current:'none'},setPendingFlags:vi.fn(),executeCommand:vi.fn()} as unknown as CommandContext;
 CaptureMiddleware(command,context,{silent:true,isSystem:true,fromDrawer:true});
 expect(context.captureStage.current).toBe('mail_list');
 expect(useArchiveStore.getState().activeView).toBe('mail-inbox');
 expect(useUIStore.getState().popoverState).toMatchObject({setId:'mail',commandReportLabel:'Mail'});
 CaptureMiddleware('read 12',context,{silent:true,isSystem:true,fromDrawer:true});
 expect(context.captureStage.current).toBe('mail_read');
 expect(useUIStore.getState().popoverState).toMatchObject({setId:'mail',commandReportCommand:'read 12'});
});

/** @file CommandTreeHeldDirectionActions.test.tsx — Door-specific held direction commands. */
// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { CommandTreeHeldDirectionActions } from './CommandTreeHeldDirectionActions';
import type { useCommandTreeController } from '../../hooks/useCommandTreeController';
import type { useCommandTree } from '../../hooks/useCommandTree';

afterEach(cleanup);
// --- Door action behavior ---
it('offers say open only for a door in the held direction and sends it once', () => {
 const executeCommand = vi.fn();
 const controller = {game:{gameState:'playing',executeCommand,setCommandPreview:vi.fn()},entries:[
  {category:'cat-exit',keyword:'n',context:'exit n',hasDoor:true}
 ]} as unknown as ReturnType<typeof useCommandTreeController>;
 const tree = {grouped:[{}, {buttons:[]}],sectionFor:() => 'Doors',targetsFor:() => []} as unknown as ReturnType<typeof useCommandTree>;
 const {rerender} = render(<CommandTreeHeldDirectionActions controller={controller} tree={tree} direction="n"/>);
 fireEvent.click(screen.getByRole('button',{name:'Say open'}));
 expect(executeCommand).toHaveBeenCalledExactlyOnceWith('say open');
 rerender(<CommandTreeHeldDirectionActions controller={controller} tree={tree} direction="s"/>);
 expect(screen.queryByRole('button',{name:'Say open'})).toBeNull();
});

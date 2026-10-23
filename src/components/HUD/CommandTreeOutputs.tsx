/** @file CommandTreeOutputs.tsx — Shared reports, shop results and training results. */
import React from 'react';
import { useCommandTreeController } from '../../hooks/useCommandTreeController';
import { CapturedDetailsSidePanel } from '../Popovers/StandardMenu/CapturedDetailsSidePanel';
import { CommandShopOutputPanel } from './CommandShopOutputPanel';
import { CommandPracticeOutputPanel } from './CommandPracticeOutputPanel';
// --- Render Section ---
export const CommandTreeOutputs = ({controller}: {controller: ReturnType<typeof useCommandTreeController>}) => {
const { hasCapturedDetails, capture, closeDetails, shop, practice } = controller;
return <>            {hasCapturedDetails && <CapturedDetailsSidePanel
                examineLines={capture?.capturedExamineLines}
                examineMode={capture?.examineMode}
                considerLines={capture?.capturedConsiderLines}
                helpLines={capture?.capturedHelpLines}
                helpTopic={capture?.helpTopic}
                isCapturingExamine={capture?.isCapturingExamine}
                isCapturingConsider={capture?.isCapturingConsider}
                isCapturingHelp={capture?.isCapturingHelp}
                whoisLines={capture?.capturedWhoisLines}
                isCapturingWhois={capture?.isCapturingWhois}
                whoLines={capture?.capturedWhoLines}
                isCapturingWho={capture?.isCapturingWho}
                whereLines={capture?.capturedWhereLines}
                isCapturingWhere={capture?.isCapturingWhere}
                roomActionLines={capture?.capturedRoomActionLines}
                roomActionKind={capture?.roomActionKind}
                isCapturingRoomAction={capture?.isCapturingRoomAction}
                personalActionLines={capture?.capturedPersonalActionLines}
                personalActionKind={capture?.personalActionKind}
                isCapturingPersonalAction={capture?.isCapturingPersonalAction}
                onClose={closeDetails}
            />}
            <CommandShopOutputPanel shop={shop} />
            <CommandPracticeOutputPanel practice={practice} />
</>;
};

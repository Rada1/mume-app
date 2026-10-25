/** @file CommandTreeOutputs.tsx - Shared reports, shop results and training results. */
import React from 'react';
import { useCommandTreeController } from '../../hooks/useCommandTreeController';
import { CapturedDetailsSidePanel } from '../Popovers/StandardMenu/CapturedDetailsSidePanel';
import { CommandShopOutputPanel } from './CommandShopOutputPanel';
import { CommandPracticeOutputPanel } from './CommandPracticeOutputPanel';
import { isInlineActionPopover } from '../../utils/popoverPanelUtils';

// --- Render Section ---
export const CommandTreeOutputs = ({controller}: {controller: ReturnType<typeof useCommandTreeController>}) => {
    const { hasCapturedDetails, capture, closeDetails, shop, practice } = controller;
    if (shop.outputVisible) return <CommandShopOutputPanel shop={shop} />;
    if (practice.outputVisible) return <CommandPracticeOutputPanel practice={practice} />;
    const showCapturedDetails = hasCapturedDetails && !isInlineActionPopover(capture);
    return <>
        {showCapturedDetails && <CapturedDetailsSidePanel
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
            commandReportLines={capture?.capturedCommandReportLines}
            commandReportLabel={capture?.commandReportLabel}
            isCapturingCommandReport={capture?.isCapturingCommandReport}
            onClose={closeDetails}
        />}
    </>;
};

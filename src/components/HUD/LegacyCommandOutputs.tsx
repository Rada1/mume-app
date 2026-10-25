/** @file LegacyCommandOutputs.tsx - Original report and transaction outputs for the archived workspace. */
import React from 'react';
import { CapturedDetailsSidePanel } from '../Popovers/StandardMenu/CapturedDetailsSidePanel';
import { CommandShopOutputPanel } from './CommandShopOutputPanel';
import { CommandPracticeOutputPanel } from './CommandPracticeOutputPanel';
import { useCommandTreeController } from '../../hooks/useCommandTreeController';
import { isInlineActionPopover } from '../../utils/popoverPanelUtils';

// --- Render Section ---
export const LegacyCommandOutputs = ({hasCapturedDetails, capture, closeDetails, shop, practice}: Pick<ReturnType<typeof useCommandTreeController>, 'hasCapturedDetails' | 'capture' | 'closeDetails' | 'shop' | 'practice'>) => {
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

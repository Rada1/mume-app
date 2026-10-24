/**
 * @file InlineActionDeck.tsx
 * @description Presents every available inline action in its trait groups.
 */

import React from 'react';
import type { CustomButton } from '../../../types';
import type { InlineActionDeckGroup } from '../../../utils/inlineActionDeckModel';
import { InlineTraitActionGroup } from './InlineTraitActionGroup';

// --- Logic Section ---

interface InlineActionDeckProps {
    groups: InlineActionDeckGroup[];
    requestInspection: (kind: 'look' | 'consider') => void;
    renderButton: (button: CustomButton) => React.ReactNode;
}

export const InlineActionDeck: React.FC<InlineActionDeckProps> = ({
    groups,
    requestInspection,
    renderButton
}) => {
    const renderGroups = () => groups.map(group => (
        <InlineTraitActionGroup
            key={group.section.key}
            section={group.section}
            buttons={group.buttons}
            inspectionCommands={group.inspectionCommands}
            requestInspection={requestInspection}
            renderButton={renderButton}
        />
    ));

    return (
        <div className="inline-action-deck" aria-label="Available actions">
            <div className="inline-action-desktop-deck">
                <div className="inline-action-groups-content inline-action-groups" aria-label="Available actions">
                    {renderGroups()}
                </div>
            </div>
            <div className="inline-action-mobile-groups inline-action-groups" aria-label="Available actions">
                {renderGroups()}
            </div>
        </div>
    );
};

import React from 'react';
import { DrawerLine, PopoverState } from '../../types';

interface ContainerPopoverProps {
    popoverState: PopoverState;
    setPopoverState: (val: PopoverState | null) => void;
    handleButtonClick: (b: any, e: any, context?: string) => void;
    addMessage: (type: any, content: string) => void;
    themeColor?: string;
}

export const ContainerPopover: React.FC<ContainerPopoverProps> = ({
    popoverState, setPopoverState, handleButtonClick, addMessage, themeColor
}) => {
    const items = popoverState.containerItems || [];
    const containerName = popoverState.context || 'Container';

    return (
        <>
            <div className="popover-header"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
                    marginBottom: '4px',
                    paddingBottom: '4px',
                    color: 'var(--accent)',
                    fontWeight: 'bold'
                }}>
                {containerName.toUpperCase()}
            </div>

            {items.length === 0 ? (
                <div className="popover-empty">Nothing inside...</div>
            ) : (
                items.map(item => (
                    <div
                        key={item.id}
                        className="popover-item"
                        data-menu-item="true"
                        onPointerDown={(e) => { e.stopPropagation(); }}
                        onClick={(e) => {
                            const noun = item.context || item.text;
                            handleButtonClick({
                                id: `container-item-${item.id}`,
                                command: `get ${noun} ${containerName}`,
                                label: `Get ${item.text}`,
                                actionType: 'command'
                            } as any, e, item.context);
                        }}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden' }}
                    >
                        <span dangerouslySetInnerHTML={{ __html: item.html }} />
                    </div>
                ))
            )}
            
            <div 
                className="popover-item" 
                style={{ color: 'var(--accent)', borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '4px' }}
                onClick={(e) => {
                    handleButtonClick({
                        id: 'container-get-all',
                        command: `get all ${containerName}`,
                        label: 'Get All',
                        actionType: 'command'
                    } as any, e, containerName);
                }}
            >
                Get All
            </div>
        </>
    );
};

import { useEffect, Dispatch, SetStateAction } from 'react';
import { CustomButton } from '../../../types';

interface UseKeyboardVisibilityProps {
    isKeyboardOpen: boolean;
    rawButtons: CustomButton[];
    setButtons: Dispatch<SetStateAction<CustomButton[]>>;
    triggerSpitManual: (b: CustomButton) => void;
}

export const useKeyboardVisibility = ({
    isKeyboardOpen,
    rawButtons,
    setButtons,
    triggerSpitManual
}: UseKeyboardVisibilityProps) => {
    useEffect(() => {
        if (isKeyboardOpen) {
            rawButtons.forEach(b => {
                if (b.trigger?.enabled && b.trigger.onKeyboard && b.trigger.spit) {
                    triggerSpitManual(b);
                }
            });
        }

        setButtons(prev => {
            let changed = false;
            const next = prev.map(b => {
                if (b.trigger?.enabled && (b.trigger.onKeyboard || b.trigger.offKeyboard) && !b.trigger.spit) {
                    const shouldBeVisible = isKeyboardOpen;
                    if (b.isVisible !== shouldBeVisible) {
                        changed = true;
                        return { ...b, isVisible: shouldBeVisible };
                    }
                }
                return b;
            });
            return changed ? next : prev;
        });
    }, [isKeyboardOpen, setButtons, rawButtons, triggerSpitManual]);
};

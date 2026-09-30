/**
 * @file equipmentCaptureOutput.ts
 * @description Identifies worn-item rows returned by a silent equipment capture.
 */

// --- Logic Section ---

export interface EquipmentCaptureProgress {
    active: boolean;
}

export const isSilentEquipmentCaptureResponseLine = (
    text: string,
    rawLine: string,
    isSilentCapture: boolean,
    progressRef: { current: EquipmentCaptureProgress }
): boolean => {
    if (!isSilentCapture) {
        progressRef.current.active = false;
        return false;
    }

    const clean = text.replace(/\x1b\[[0-9;]*m/g, '').replace(/<[^>]*>/g, '').trim();
    if (/^you are using:\s*$/i.test(clean)) {
        progressRef.current.active = true;
        return true;
    }

    if (!progressRef.current.active) return false;

    const source = rawLine.replace(/\x1b\[[0-9;]*m/g, '').trimStart();
    if (/^(?:<|&lt;)(?:wielded|held|worn(?:\s+[^>&]+)?)(?:>|&gt;)/i.test(source)) return true;

    progressRef.current.active = false;
    return false;
};

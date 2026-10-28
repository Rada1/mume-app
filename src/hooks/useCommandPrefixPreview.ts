/** @file useCommandPrefixPreview.ts — Pending follower orders remain visible between button choices. */
import { formatCommandPrefixPreview, useTacticalCommandPrefixStore } from '../stores/useTacticalCommandPrefixStore';

// --- Non-consuming preview ---
export const useCommandPrefixPreview = (preview?: string | null) => {
    const prefix = useTacticalCommandPrefixStore(state => state.prefix);
    return formatCommandPrefixPreview(prefix, preview);
};

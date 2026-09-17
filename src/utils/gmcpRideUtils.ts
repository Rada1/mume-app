/** Normalizes MUME's boolean, string, and object-shaped Char.Ride GMCP payloads. */
export const isRidingFromGmcpRide = (data: unknown): boolean => {
    if (typeof data === 'boolean') return data;
    if (typeof data === 'number') return data !== 0;
    if (typeof data === 'string') return !['', '0', 'false', 'off', 'none'].includes(data.trim().toLowerCase());
    if (!data || typeof data !== 'object') return false;

    const payload = data as Record<string, unknown>;
    return isRidingFromGmcpRide(
        payload.riding ?? payload.ride ?? payload.mounted ?? payload.mount ?? payload.mount_name
    );
};

/**
 * @file StatDelta.tsx
 * @description Signed inline change shown beside a character stat.
 */

import React, { FC } from 'react';

// --- Render Section ---
export const StatDelta: FC<{ delta?: { amount: number; id: number } }> = ({ delta }) => (
    delta && delta.amount !== 0 ? (
        <span key={delta.id} className={`this-is-you-delta ${delta.amount > 0 ? 'is-gain' : 'is-loss'}`}>
            {delta.amount > 0 ? '+' : '−'}{Math.abs(delta.amount).toLocaleString()}
        </span>
    ) : null
);

/**
 * @file EquipmentSlotIcons.tsx
 * @description Small pictogram icons for worn-equipment slots (head, arms, feet, etc.)
 * that lucide-react doesn't cover. Matches the hand-drawn style of ArmourIcon in
 * CharacterCardPrimitives.tsx (24x24 viewBox, stroke-only, round joins).
 */

import React from 'react';

export interface SlotIconProps {
    size?: number;
    strokeWidth?: number;
    className?: string;
}

const base = (size: number, strokeWidth: number, className: string | undefined, children: React.ReactNode) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        {children}
    </svg>
);

/** Head slot — helmet-like head silhouette with a brow line. */
export const HeadSlotIcon: React.FC<SlotIconProps> = ({ size = 12, strokeWidth = 2.5, className }) => base(size, strokeWidth, className, (
    <>
        <path d="M7 11a5 5 0 0 1 10 0v2a5 5 0 0 1-10 0z" />
        <path d="M7 10.5c1.6-1 8.4-1 10 0" />
        <path d="M9 20v-2M15 20v-2" />
    </>
));

/** Arms slot — bent sleeve (shoulder to elbow to fist) with a bicep bulge. */
export const ArmsSlotIcon: React.FC<SlotIconProps> = ({ size = 12, strokeWidth = 2.5, className }) => base(size, strokeWidth, className, (
    <>
        <path d="M6 4c1 3 1 6 2.5 8s4 2.5 5 5" />
        <path d="M8 6c2.2.4 3.6 2 3 4.3" />
        <circle cx="15.3" cy="18.8" r="2.4" />
    </>
));

/** About-body slot — draped cloak/cape with a collar. */
export const CloakSlotIcon: React.FC<SlotIconProps> = ({ size = 12, strokeWidth = 2.5, className }) => base(size, strokeWidth, className, (
    <>
        <path d="M9 4.5a3 3 0 0 1 6 0" />
        <path d="M7 5l-3 15h16L17 5" />
    </>
));

/** Legs slot — waistband with two leg lines. */
export const LegsSlotIcon: React.FC<SlotIconProps> = ({ size = 12, strokeWidth = 2.5, className }) => base(size, strokeWidth, className, (
    <path d="M7 3h10l1 5-2 13h-2l-2-11-2 11H8L6 8z" />
));

/** On-belt slot — a pouch hanging from a loop. */
export const PouchSlotIcon: React.FC<SlotIconProps> = ({ size = 12, strokeWidth = 2.5, className }) => base(size, strokeWidth, className, (
    <>
        <path d="M9 9V7a3 3 0 0 1 6 0v2" />
        <path d="M7 9h10l1 10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z" />
    </>
));

/** Belt slot — a strap with a buckle. */
export const BeltSlotIcon: React.FC<SlotIconProps> = ({ size = 12, strokeWidth = 2.5, className }) => base(size, strokeWidth, className, (
    <>
        <path d="M2 12h6M16 12h6" />
        <rect x="8" y="8" width="8" height="8" rx="1.5" />
    </>
));

/** X-back slot — a bandolier strap diagonal across the torso. */
export const BandolierSlotIcon: React.FC<SlotIconProps> = ({ size = 12, strokeWidth = 2.5, className }) => base(size, strokeWidth, className, (
    <>
        <rect x="7" y="3" width="10" height="18" rx="5" />
        <path d="M6 5l12 14" />
    </>
));

/** Wrists slot — a cuff/bracer band around the forearm. */
export const WristSlotIcon: React.FC<SlotIconProps> = ({ size = 12, strokeWidth = 2.5, className }) => base(size, strokeWidth, className, (
    <>
        <path d="M12 3v6M12 15v6" />
        <rect x="7" y="9" width="10" height="6" rx="3" />
    </>
));

/** Neck slot — a draped necklace chain with a pendant. */
export const NeckSlotIcon: React.FC<SlotIconProps> = ({ size = 12, strokeWidth = 2.5, className }) => base(size, strokeWidth, className, (
    <>
        <path d="M7 5c0 4.5 2.2 7 5 7s5-2.5 5-7" />
        <circle cx="12" cy="16" r="2.5" />
    </>
));

/** Finger slot — a ring with a faceted gem. */
export const RingSlotIcon: React.FC<SlotIconProps> = ({ size = 12, strokeWidth = 2.5, className }) => base(size, strokeWidth, className, (
    <>
        <circle cx="12" cy="15.5" r="5.5" />
        <path d="M9 9.5 12 4l3 5.5-3 2z" />
    </>
));

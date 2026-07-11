/**
 * @file skillIcons.ts
 * @description Maps a MUME skill/spell name to a lucide icon for the SkillsDeck,
 * so class skill buttons carry icons like the CommandDeck ability bar. Falls back
 * by category (passive / spell / targeted) so the long tail still gets an icon.
 */

import type React from 'react';
import {
    Sword, Swords, Shield, ShieldPlus, Zap, HeartPulse, Heart, Footprints,
    Target, Eye, EyeOff, Search, Mountain, Waves, Trees, Flame, Snowflake,
    Moon, Sparkles, Hand, Droplet, LogOut, Skull, Crown, MapPin, Sun, Wind,
    Bandage, Star
} from 'lucide-react';

export type SkillIcon = React.ComponentType<{ size?: number; strokeWidth?: number }>;

interface SkillIconOptions {
    isSpell?: boolean;
    isPassive?: boolean;
    isTargeted?: boolean;
}

// Per-skill overrides, keyed on the lowercased skill/spell name.
const SKILL_ICONS: Record<string, SkillIcon> = {
    // ranger
    awareness: Eye, bandage: Bandage, climb: Mountain, command: Crown,
    'dark oath': Skull, leadership: Crown, ride: Footprints, swim: Waves,
    track: Footprints, wilderness: Trees,
    // thief
    attack: Sword, backstab: Sword, dodge: Wind, envenom: Droplet, escape: LogOut,
    hide: EyeOff, missile: Target, pick: Hand, search: Search, sneak: Footprints,
    steal: Hand, 'piercing weapons': Sword,
    // warrior
    bash: ShieldPlus, charge: Swords, kick: Zap, parry: ShieldPlus, rescue: HeartPulse,
    endurance: Heart, 'cleaving weapons': Sword, 'concussion weapons': Sword,
    'slashing weapons': Sword, 'stabbing weapons': Sword, 'two-handed weapons': Swords,
    'unarmed combat': Hand,
    // mage
    'magic missile': Sparkles, 'magic blast': Sparkles, fireball: Flame,
    'burning hands': Flame, 'lightning bolt': Zap, 'call lightning': Zap,
    'shocking grasp': Zap, 'chill touch': Snowflake, 'colour spray': Sparkles,
    sleep: Moon, charm: Heart, shield: Shield, armour: Shield, 'night vision': Eye,
    teleport: MapPin, portal: MapPin, scry: Eye, locate: MapPin, 'locate life': MapPin,
    'locate magic': MapPin, 'find the path': MapPin, identify: Search,
    'detect magic': Search, 'detect invisibility': Eye, 'create light': Sun,
    'watch room': Eye, earthquake: Mountain, silence: EyeOff, enchant: Sparkles,
    // cleric
    heal: HeartPulse, 'cure light': HeartPulse, 'cure serious': HeartPulse,
    'cure critic': HeartPulse, 'cure critical': HeartPulse, 'cure disease': HeartPulse,
    'cure blindness': HeartPulse, bless: Sparkles, curse: Skull, poison: Droplet,
    'remove poison': Droplet, 'remove curse': Sparkles, summon: Sparkles,
    'raise dead': Skull, sanctuary: Shield, 'word of recall': MapPin,
    'create water': Droplet, 'create food': Star, darkness: Moon, fear: Skull,
    harm: Sword, hold: Hand, 'dispel evil': Sparkles, 'dispel magic': Sparkles,
    strength: HeartPulse, 'detect evil': Eye, 'sense life': Eye,
    'black breath': Skull, 'energy drain': Skull, 'protection from evil': Shield,
    blindness: EyeOff, smother: Wind, transfer: Sparkles
};

/**
 * Resolve a lucide icon for a skill button — per-skill override first, then a
 * category fallback (passive → Shield, spell → Sparkles, targeted → Sword), so
 * every skill still shows an icon.
 */
export const resolveSkillIcon = (name: string, opts: SkillIconOptions = {}): SkillIcon => {
    const key = (name || '').trim().toLowerCase();
    if (SKILL_ICONS[key]) return SKILL_ICONS[key];
    if (opts.isPassive) return Shield;
    if (opts.isSpell) return Sparkles;
    if (opts.isTargeted) return Sword;
    return Star;
};

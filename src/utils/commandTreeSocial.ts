/** @file commandTreeSocial.ts — One Social command whose themed socials replace the long alphabetical list. */
import type { CustomButton } from '../types';
import { createButton } from './buttonFactory';

// --- Social Command Section ---
export const COMMAND_TREE_SOCIAL_BUTTON = createButton({
    id: 'v2-social', label: 'Social', command: 'social', setId: 'social list', color: '#06b6d4'
});
export const isCommandTreeSocial = (button: CustomButton | null | undefined): boolean => button?.id === COMMAND_TREE_SOCIAL_BUTTON.id;
// Individual socials are reached through the Social command; the flat per-social buttons stay out of the tree.
export const isLegacyCommandTreeSocialEmote = (button: CustomButton): boolean => button.id.startsWith('soc-');

// --- Theme Catalog Section ---
export interface CommandTreeSocialEntry { command: string; label: string; targeted: boolean; targetOptions?: readonly string[] }
export interface CommandTreeSocialTheme { id: string; label: string; socials: CommandTreeSocialEntry[] }

// Socials that read as a self-contained sound or gesture execute immediately without a target column.
const BARE_ONLY = new Set([
    'blush', 'bounce', 'burp', 'cackle', 'chuckle', 'cough', 'fart', 'gasp', 'giggle', 'hiccup', 'hum', 'laugh', 'moan',
    'mutter', 'ponder', 'pout', 'purr', 'shiver', 'shrug', 'sigh', 'snap', 'sneeze', 'snicker', 'snigger', 'sniff', 'snore',
    'strut', 'think', 'yawn', 'sob', 'cry', 'weep', 'whine', 'sulk', 'puke', 'hop', 'puzzled', 'daydream', 'twiddle', 'faint',
    'stagger', 'relieve', 'groan', 'cringe', 'babble', 'wiggle', 'whistle', 'yodel', 'flex', 'duck', 'innocent', 'boggle',
    'fume', 'grumble', 'growl', 'snarl', 'roar', 'stomp', 'blink', 'pace', 'comb', 'flip', 'howl', 'choke', 'bleed', 'roll'
]);
const toEntries = (commands: string): CommandTreeSocialEntry[] => commands.split(' ').map(command => ({
    command, label: command[0].toUpperCase() + command.slice(1), targeted: !BARE_ONLY.has(command)
}));

export const COMMAND_TREE_SOCIAL_THEMES: CommandTreeSocialTheme[] = [
    {id: 'signals', label: 'Signals', socials: toEntries('raise beckon nod shake point agree disagree thumbs thank apologise salute bow curtsey tip wave poke tap peer blink gesture pace tilt').map(entry =>
        entry.command === 'raise' ? { ...entry, targetOptions: ['hand', 'eyebrow'] }
            : entry.command === 'thumbs' ? { ...entry, targetOptions: ['up', 'down'] } : entry
    )},
    {id: 'happy', label: 'Happy', socials: toEntries('smile grin chuckle giggle laugh cackle snicker snigger smirk cheer applaud clap bounce dance hop flex strut whistle sing yodel').map(entry => ({ ...entry, targeted: true }))},
    {id: 'sad', label: 'Sad', socials: toEntries('sniff cry sob whine pout sulk sigh yawn moan groan snore stagger faint relieve').map(entry => ({ ...entry, targeted: true }))},
    {id: 'ponder', label: 'Ponder', socials: toEntries('shrug think ponder puzzled boggle daydream twiddle innocent duck bleed')},
    {id: 'angry', label: 'Angry', socials: toEntries('frown glare stare fume grumble growl snarl roar stomp slap punch bonk tackle spit bite curse accuse admonish blame taunt tease threaten insult demand')},
    {id: 'affection', label: 'Affection', socials: toEntries('hug comfort sympathize pity forgive pat cuddle snuggle embrace kiss hkiss french love adore worship wink blush nuzzle nibble lick ruffle tickle pinch squeeze massage drool frolic')},
    {id: 'silly', label: 'Silly', socials: toEntries('burp fart cough sneeze hiccup puke babble mutter cringe grovel beg wiggle snowball flip comb badger choke gasp howl roll')}
];

// --- Command Construction Section ---
export const createSocialEmoteButton = (entry: CommandTreeSocialEntry, withTarget: boolean): CustomButton => createButton({
    id: `v2-social-${entry.command}${withTarget ? '-target' : ''}`, label: entry.label,
    command: withTarget ? `${entry.command} %n` : entry.command, setId: 'social list', color: '#06b6d4'
});

// --- Mobile Shortcut Catalog Section ---
const DEFAULT_SOCIAL_SHORTCUTS = ['smile', 'wave', 'nod', 'laugh', 'bow', 'thank', 'hug', 'grin', 'shrug'];
const socialShortcuts = new Map<string, CustomButton>();
COMMAND_TREE_SOCIAL_THEMES.flatMap(theme => theme.socials).forEach(entry => {
    const choices = entry.targetOptions?.map(option => ({ ...entry, command: `${entry.command} ${option}`, label: `${entry.label} ${option}` })) || [entry];
    choices.forEach(choice => { if (!socialShortcuts.has(choice.command)) socialShortcuts.set(choice.command, createSocialEmoteButton(choice, false)); });
});
export const MOBILE_SOCIAL_SHORTCUTS = [
    ...DEFAULT_SOCIAL_SHORTCUTS.flatMap(command => socialShortcuts.get(command) || []),
    ...Array.from(socialShortcuts.values()).filter(button => !DEFAULT_SOCIAL_SHORTCUTS.includes(button.command))
];

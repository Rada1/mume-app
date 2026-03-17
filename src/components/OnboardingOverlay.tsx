import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { ChevronRight, ChevronLeft, X } from 'lucide-react';
import './OnboardingOverlay.css';

const STEPS = [
    {
        id: 'welcome',
        title: 'Middle-earth Awaits',
        description: 'Welcome to MUME! This walkthrough covers every feature of the interface—tap Next to explore, or skip if you\'ve done this before.',
        spotlight: null,
    },
    {
        id: 'mapper',
        title: 'The Automated Mapper',
        description: 'Your position is tracked in real-time via GMCP. The map reveals the world as you explore with animated fog of war. Tap the trackpad area to look at your current room.',
        spotlight: '.mapper-cluster',
    },
    {
        id: 'map-look',
        title: 'Looking Around',
        description: 'Long-press the trackpad to activate Look Mode (you\'ll feel it lock), then tap any name in the message log to examine it. Tap the map directly to look at your surroundings.',
        spotlight: '.mapper-cluster',
    },
    {
        id: 'movement',
        title: 'Moving & Navigating',
        description: 'Swipe the trackpad to step one room. Hold your swipe past the threshold to move continuously—a haptic confirms the lock-in. While holding, redirect your swipe to turn without lifting your finger.',
        spotlight: '.mapper-cluster',
    },
    {
        id: 'targeting',
        title: 'Targeting System',
        description: 'Double-tap or double-click any name in the message log to lock it as your @Target. Your target appears in the command bar. Most combat actions will automatically fire at it.',
        spotlight: null,
    },
    {
        id: 'inline-buttons',
        title: 'Inline Log Buttons',
        description: 'Items, NPCs, and exits appear as tappable buttons inline in the log. Tap to open a context menu with relevant actions. Drag a button onto an NPC to give them the item, onto the drawer to stow it, or onto the command bar to insert its name.',
        spotlight: null,
    },
    {
        id: 'combat',
        title: 'Combat Mode',
        description: 'When you engage in combat, a VS overlay shows tiered health bars for you and your enemy. Each segment represents a status tier—Awful through Fine. Watch them deplete in real time.',
        spotlight: '.hud-clusters-absolute-layer',
    },
    {
        id: 'tactical-buttons',
        title: 'Tactical Button Clusters',
        description: 'The HUD clusters handle complex actions. Each button supports four swipe directions (for variants), a tap, and a long-press hold. That\'s up to six actions per button.',
        spotlight: '.hud-clusters-absolute-layer',
    },
    {
        id: 'combos',
        title: 'Button Combos',
        description: 'Hold any tactical button, then swipe the trackpad to fire that action in a direction. Or hold the button and tap the trackpad for its special combo—like casting a spell at your locked target or triggering a stance ability.',
        spotlight: '.hud-clusters-absolute-layer',
    },
    {
        id: 'hotswap',
        title: 'Hot-Swapping Button Sets',
        description: 'Long-swipe past the haptic threshold on any button, then tap the trackpad to cycle through alternate button sets. Switch between a combat layout and a utility layout on the fly.',
        spotlight: '.hud-clusters-absolute-layer',
    },
    {
        id: 'vitals',
        title: 'Vitals Dock',
        description: 'Tap the right side of the vitals dock (the numbers) to send a score command and refresh your stats. Drag the white tick on the HP bar left or right to set your wimpy threshold.',
        spotlight: '.input-vitals-dock',
    },
    {
        id: 'drawers',
        title: 'Side Drawers',
        description: 'Swipe from the right edge (or tap the edge tab) to open your drawers: Inventory, Equipment, Stats, and Quests. Each is live-synced with the game as it responds.',
        spotlight: '.desktop-edge-tab',
    },
    {
        id: 'inventory',
        title: 'Inventory & Equipment',
        description: 'In the Inventory and Equipment drawers, drag items between slots or drop zones. Tap a container to open it inline and browse its contents. Worn equipment can be managed directly without typing.',
        spotlight: '.desktop-edge-tab',
    },
    {
        id: 'stats-drawer',
        title: 'Stats & Character Sheet',
        description: 'The Stats drawer shows your full character sheet. Use the interactive menus there to change your combat mood, position (standing/sitting/resting), and other stances without typing commands.',
        spotlight: '.desktop-edge-tab',
    },
    {
        id: 'parley',
        title: 'Parley & Communication',
        description: 'Tap the chat icon (appears near the command bar) to open Parley. Choose your communication channel—say, tell, group, and more—and set a named target. Star your favourite contacts for one-tap access.',
        spotlight: '.input-area',
    },
    {
        id: 'shopping',
        title: 'Shopping & Browsing',
        description: 'Approach a merchant and use the Browse action to see their stock as a visual shop interface—tap to buy. At a guild, the Practice panel shows your trainable skills with costs so you can improve them directly.',
        spotlight: null,
    },
    {
        id: 'finish',
        title: 'You\'re Ready!',
        description: 'That covers the essentials. Every button, every gesture has depth—experiment freely. The interface is built around you. Good luck out there, adventurer.',
        spotlight: null,
    },
];

export const OnboardingOverlay: React.FC = () => {
    const { setHasSeenOnboarding } = useGame();
    const [currentStep, setCurrentStep] = useState(0);
    const [spotlightStyle, setSpotlightStyle] = useState<React.CSSProperties>({});

    const step = STEPS[currentStep];

    useEffect(() => {
        if (step.spotlight) {
            const el = document.querySelector(step.spotlight);
            if (el) {
                const rect = el.getBoundingClientRect();
                setSpotlightStyle({
                    top: rect.top - 10,
                    left: rect.left - 10,
                    width: rect.width + 20,
                    height: rect.height + 20,
                    borderRadius: '12px',
                    opacity: 1
                });
            } else {
                setSpotlightStyle({ top: '50%', left: '50%', width: 0, height: 0, opacity: 0 });
            }
        } else {
            setSpotlightStyle({ top: '50%', left: '50%', width: 0, height: 0, opacity: 0 });
        }
    }, [currentStep, step.spotlight]);

    const handleNext = () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            setHasSeenOnboarding(true);
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleSkip = () => {
        setHasSeenOnboarding(true);
    };

    const hasSpotlight = !!step.spotlight;

    return (
        <div className={`onboarding-overlay ${hasSpotlight ? 'has-spotlight' : ''}`}>
            <div className="onboarding-spotlight" style={spotlightStyle} />

            <div className={`onboarding-card ${hasSpotlight ? 'with-spotlight' : 'center'}`}>
                <button className="onboarding-close" onClick={handleSkip}>
                    <X size={20} />
                </button>

                <div className="onboarding-content">
                    <h2 className="onboarding-title">{step.title}</h2>
                    <p className="onboarding-desc">{step.description}</p>
                </div>

                <div className="onboarding-footer">
                    <div className="onboarding-dots">
                        {STEPS.map((_, i) => (
                            <div key={i} className={`onboarding-dot ${i === currentStep ? 'active' : ''}`} />
                        ))}
                    </div>

                    <div className="onboarding-actions">
                        {currentStep > 0 && (
                            <button className="onboarding-btn secondary" onClick={handlePrev} style={{ marginRight: '4px' }}>
                                <ChevronLeft size={16} />
                            </button>
                        )}
                        <button className="onboarding-btn primary" onClick={handleNext}>
                            {currentStep === STEPS.length - 1 ? 'Finish' : 'Next'} <ChevronRight size={16} />
                        </button>
                    </div>
                </div>

                <div className="onboarding-step-count">
                    {currentStep + 1} / {STEPS.length}
                </div>
            </div>
        </div>
    );
};

import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { ChevronRight, ChevronLeft, X } from 'lucide-react';
import './OnboardingOverlay.css';

const STEPS = [
    {
        id: 'welcome',
        title: 'Middle-earth Awaits',
        description: 'Welcome to MUME! This walkthrough covers some of the important features of this client.',
        spotlight: null,
    },
    {
        id: 'map-look',
        title: 'Looking Around',
        description: '(Mobile) Tap anywhere on the map to look at your surroundings. Hold the tap and then tap with your other finger on a highlighted thing to look at it.',
        spotlight: '.mapper-cluster, .mobile-mapper-touch-surface',
    },
    {
        id: 'movement',
        title: 'Moving & Navigating',
        description: '(Mobile) Swipe anywhere on the map in the direction you want to move to move one room. Hold your swipe past the threshold to move at a steady pace. You can steer by sliding your finger around the map.',
        spotlight: '.mapper-cluster, .mobile-mapper-touch-surface',
    },
    {
        id: 'targeting',
        title: 'Targeting System',
        description: 'Double-tap or double-click any text in the log to "point at it" and set it as your @Target. Setting something as your @target primes most of your combat abilities to point at it if they are fired, and creates a clickable/draggable button you can interact with for that string of text.',
        spotlight: '.message-log',
        position: 'bottom'
    },
    {
        id: 'tactical-buttons',
        title: 'Tactical Button Clusters',
        description: 'Your tactical buttons are your go-to abilities. Tap the button or swipe in any direction on the button to start an action. If you hold the swipe you can see the swipe button options available to you. Tactical buttons will become activatable when you learn an applicable skill.',
        spotlight: '.line-cluster',
    },
    {
        id: 'combos',
        title: 'Button Combos',
        description: 'Hold any tactical button, then swipe the trackpad to fire that action in a direction. You can also tap on a highlighted string in the log to fire the action at it',
        spotlight: '.line-cluster, .mobile-mapper-touch-surface, .message-log',
        position: 'top'
    },
    {
        id: 'hotswap',
        title: 'Hot-Swapping Button Sets',
        description: 'Long-swipe on any tactical button, then while holding the swipe, tap the map to fire a combo which will open a menu to hot swap a new action for that swipe.',
        spotlight: '.line-cluster',
    },
    {
        id: 'drawers',
        title: 'Side Drawers',
        description: 'Swipe your command bar to open your drawers: Inventory/Equipment, Stats, Character, and Players. On desktop, you can also use the edge tabs.',
        spotlight: '.input-area',
        position: 'top'
    },
    {
        id: 'interactions-inventory',
        title: 'Interactions & Inventory',
        description: 'In some drawers like your EQ/Inventory drawer you can manipulate items by dragging and dropping them. For example, drag an item onto an NPC to give it to them or tap a container to open it inline and browse its contents etc.',
        spotlight: null,
    },
    {
        id: 'finish',
        title: 'You\'re Ready!',
        description: 'That covers the basics. Good luck out there, adventurer.',
        spotlight: null,
    },
];

export const OnboardingOverlay: React.FC = () => {
    const { setHasSeenOnboarding } = useGame();
    const [currentStep, setCurrentStep] = useState(0);
    const [spotlightStyle, setSpotlightStyle] = useState<React.CSSProperties>({});

    const step = STEPS[currentStep] as any;

    useEffect(() => {
        const spotlightSelector = step.spotlight;
        if (spotlightSelector) {
            const selectors = spotlightSelector.split(',').map((s: string) => s.trim());
            let el = null;
            for (const selector of selectors) {
                el = document.querySelector(selector);
                if (el) break;
            }

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
        <div className={`onboarding-overlay ${hasSpotlight ? 'has-spotlight' : ''} ${step.position === 'bottom' ? 'pos-bottom' : 'pos-top'}`}>
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

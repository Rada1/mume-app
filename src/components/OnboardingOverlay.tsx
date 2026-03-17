import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { ChevronRight, ChevronLeft, X } from 'lucide-react';
import './OnboardingOverlay.css';

const STEPS = [
    {
        id: 'welcome',
        title: 'Middle-earth Awaits',
        description: 'Welcome to MUME! This interactive tutorial will guide you through our AI-powered interface designed for seamless play.',
        spotlight: null,
    },
    {
        id: 'mapper',
        title: 'The Automated Mapper',
        description: 'Your location is tracked in real-time. The map reveals the world as you explore, featuring organic terrain animations and fog of war.',
        spotlight: '.mapper-cluster',
    },
    {
        id: 'vitals',
        title: 'Vitals & Environment',
        description: 'Your HP, Mana, and Moves are pinned here. Look for environmental indicators—Weather and Lighting shift dynamically and affect the UI.',
        spotlight: '.modern-vitals-container',
    },
    {
        id: 'hud',
        title: 'Tactical Control Clusters',
        description: 'These buttons handle complex actions. Swipe them for variants, or use the drag-and-drop system to manage items directly from the log.',
        spotlight: '.hud-clusters-absolute-layer',
    },
    {
        id: 'input',
        title: 'Interactive Command Bar',
        description: 'Type commands or use swipe gestures to cycle history. Tap the @Target badge to quickly insert your current focus into any command.',
        spotlight: '.input-container',
    },
    {
        id: 'drawers',
        title: 'Immersive Side Drawers',
        description: 'Swipe from the right edge or tap vitals to access your Inventory, Stats, and Quests. Everything is context-aware and state-synced.',
        spotlight: '.desktop-edge-tab',
    }
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
            }
        } else {
            setSpotlightStyle({
                top: '50%',
                left: '50%',
                width: 0,
                height: 0,
                opacity: 0
            });
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

    return (
        <div className="onboarding-overlay">
            <div className="onboarding-spotlight" style={spotlightStyle} />

            <div className={`onboarding-card ${step.spotlight ? 'with-spotlight' : 'center'}`}>
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
                            <button className="onboarding-btn secondary" onClick={handlePrev} style={{ marginRight: '10px' }}>
                                <ChevronLeft size={16} /> Back
                            </button>
                        )}
                        <button className="onboarding-btn primary" onClick={handleNext}>
                            {currentStep === STEPS.length - 1 ? 'Finish' : 'Next'} <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

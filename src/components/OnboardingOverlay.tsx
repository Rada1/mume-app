import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { ChevronRight, ChevronLeft, X } from 'lucide-react';
import './OnboardingOverlay.css';

const STEPS = [
    {
        id: 'welcome',
        title: 'Welcome to MUME!',
        description: 'This interactive tutorial will quickly show you how to navigate the world of Middle-earth.',
        spotlight: null,
    },
    {
        id: 'mapper',
        title: 'The Mapper',
        description: 'At the top right, you have your automated map. It tracks your movement and reveals the world as you explore.',
        spotlight: '.mapper-container',
    },
    {
        id: 'vitals',
        title: 'Vitals & Status',
        description: 'Your health, mana, and moves are displayed at the top. Keep a close eye on these during combat!',
        spotlight: '.vitals-container',
    },
    {
        id: 'hud',
        title: 'Tactical Controls',
        description: 'Default action sets are located here. You can swipe these buttons to perform different actions or click to execute.',
        spotlight: '.hud-clusters',
    },
    {
        id: 'input',
        title: 'Command Input',
        description: 'Type commands here. You can also swipe the input bar left or right to cycle through your history.',
        spotlight: '.input-container',
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
                            <button className="onboarding-btn secondary" onClick={handlePrev}>
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

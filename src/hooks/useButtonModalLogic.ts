import { useState, useCallback } from 'react';
import { CustomButton, ActionType, SwipeDirection } from '../types';
import { makeBackgroundTransparent } from '../utils/imageUtils';

interface UseButtonModalLogicProps {
    editingButton: CustomButton;
    setEditingButtonId: (id: string | null) => void;
    setButtons: React.Dispatch<React.SetStateAction<CustomButton[]>>;
    selectedButtonIds: Set<string>;
}

export const useButtonModalLogic = ({
    editingButton,
    setEditingButtonId,
    setButtons,
    selectedButtonIds
}: UseButtonModalLogicProps) => {
    const [activeTab, setActiveTab] = useState<'main' | 'gestures' | 'style' | 'triggers' | 'requirements'>('main');

    const handleDuplicate = useCallback(() => {
        const newId = typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : Date.now().toString(36) + Math.random().toString(36).substr(2);

        const newBtn: CustomButton = {
            ...editingButton,
            id: newId,
            label: editingButton.label + ' (Copy)',
            style: {
                ...editingButton.style,
                x: (editingButton.style.x || 50) + 2,
                y: (editingButton.style.y || 50) + 2
            }
        };
        setButtons(prev => [...prev, newBtn]);
        setEditingButtonId(newId);
    }, [editingButton, setButtons, setEditingButtonId]);

    const updateButton = useCallback((id: string, updates: Partial<CustomButton>) => {
        setButtons(prev => prev.map(b => {
            if (selectedButtonIds.has(b.id) || b.id === id) {
                const merged = { ...b, ...updates };
                // Deep merge style if present
                if (updates.style) merged.style = { ...b.style, ...updates.style };
                // Deep merge trigger if present
                if (updates.trigger) merged.trigger = { ...b.trigger, ...updates.trigger };
                return merged;
            }
            return b;
        }));
    }, [selectedButtonIds, setButtons]);

    const handleImageUpload = useCallback((file: File) => {
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const base64 = ev.target?.result as string;
            // Automatically clean backgrounds for uploaded icons
            const cleaned = await makeBackgroundTransparent(base64);
            updateButton(editingButton.id, { icon: cleaned });
        };
        reader.onerror = () => {
            console.error("Failed to read file");
        };
        reader.readAsDataURL(file);
    }, [editingButton.id, updateButton]);

    return {
        activeTab,
        setActiveTab,
        handleDuplicate,
        updateButton,
        handleImageUpload
    };
};

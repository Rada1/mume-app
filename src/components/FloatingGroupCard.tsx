import React, { useState } from 'react';
import { ShopItem, PracticeData } from '../types';
import ShopItemCard from './ShopItemCard';
import { X, Search, Plus } from 'lucide-react';

interface FloatingGroupCardProps {
    type: 'shop' | 'practice';
    shopItems?: ShopItem[];
    practiceData?: PracticeData;
    onClose: () => void;
    executeCommand: (cmd: string, silent?: boolean) => void;
    practice?: any;
    setPopoverState?: (state: any) => void;
    popoverRef?: React.RefObject<HTMLDivElement>;
}

export const FloatingGroupCard: React.FC<FloatingGroupCardProps> = ({ 
    type, shopItems, practiceData, onClose, executeCommand, practice, setPopoverState, popoverRef 
}) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredShopItems = shopItems?.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.id.toString() === searchTerm
    );

    const filteredSkills = practiceData?.skills.filter(skill => 
        skill.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleShopItemClick = (e: React.MouseEvent, item: ShopItem) => {
        if (setPopoverState) {
            setPopoverState({
                x: e.clientX,
                y: e.clientY,
                setId: 'inline-shopitem',
                context: item.id,
                menuDisplay: 'list'
            });
        } else {
            executeCommand(`buy ${item.id}`);
        }
    };

    return (
        <div className="floating-group-card-overlay" onClick={onClose} style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 30000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(4px)'
        }}>
            <div className="floating-group-card" ref={popoverRef} onClick={(e) => e.stopPropagation()} style={{
                width: '90%',
                maxWidth: '600px',
                maxHeight: '80vh',
                background: 'rgba(20, 20, 25, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
                borderRadius: '20px',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                position: 'relative',
                backdropFilter: 'blur(20px)'
            }}>
                <div className="card-header" style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(255, 255, 255, 0.02)'
                }}>
                    <h3 style={{ margin: 0, color: 'var(--accent)', fontSize: '1.1rem', letterSpacing: '1px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        {type === 'shop' ? 'Shop' : 'Practice'}
                    </h3>

                    <div className="search-filter-wrapper" style={{
                        flex: 1,
                        margin: '0 15px',
                        position: 'relative',
                        maxWidth: '220px'
                    }}>
                        <Search size={14} style={{
                            position: 'absolute',
                            left: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            opacity: 0.4
                        }} />
                        <input
                            type="text"
                            placeholder={type === 'shop' ? "Filter items..." : "Filter skills..."}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                borderRadius: '14px',
                                padding: '6px 10px 6px 30px',
                                color: '#fff',
                                fontSize: '0.85rem',
                                outline: 'none',
                                transition: 'all 0.2s ease'
                            }}
                            onFocus={(e) => {
                                e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                                e.target.style.borderColor = 'var(--accent)';
                            }}
                            onBlur={(e) => {
                                e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                                e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {type === 'practice' && practiceData && (
                            <span style={{ fontSize: '0.85rem', opacity: 0.5, whiteSpace: 'nowrap' }}>
                                {practiceData.sessionsLeft} left
                            </span>
                        )}
                        <button onClick={onClose} style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: 'none',
                            color: '#fff',
                            width: '32px',
                            height: '32px',
                            borderRadius: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                        }}>
                            <X size={18} />
                        </button>
                    </div>
                </div>
                
                <div className="card-content" style={{
                    padding: '20px',
                    overflowY: 'auto',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                }}>
                    {type === 'shop' && filteredShopItems?.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '40px 20px', opacity: 0.4 }}>
                            No items matching "{searchTerm}"
                        </div>
                    )}
                    
                    {type === 'shop' && filteredShopItems?.map(item => (
                        <div key={item.id} className="floating-card-item" onClick={(e) => handleShopItemClick(e, item)} style={{ cursor: 'pointer' }}>
                            <ShopItemCard item={item} executeCommand={executeCommand} />
                        </div>
                    ))}
                    
                    {type === 'practice' && filteredSkills?.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '40px 20px', opacity: 0.4 }}>
                            No skills matching "{searchTerm}"
                        </div>
                    )}

                    {type === 'practice' && filteredSkills?.map((skill, idx) => {
                        const isAtGuildmaster = practiceData?.isAtGuildmaster;
                        const classColor = skill.skillClass ? {
                            'Warrior': 'rgba(255, 100, 100, 1)',
                            'Cleric': 'rgba(255, 255, 100, 1)',
                            'Mage': 'rgba(100, 100, 255, 1)',
                            'Thief': 'rgba(200, 200, 200, 1)',
                            'Ranger': 'rgba(100, 255, 100, 1)'
                        }[skill.skillClass] || 'var(--accent)' : 'var(--accent)';

                        return (
                            <div key={idx} className="floating-card-item practice-skill-entry" style={{
                                padding: '12px 15px',
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '15px'
                            }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <span style={{ fontWeight: 'bold', color: classColor, fontSize: '1rem' }}>{skill.name}</span>
                                        <span style={{ opacity: 0.8, fontWeight: 'bold' }}>
                                            {isAtGuildmaster ? (skill.knowledge.includes('%') ? skill.knowledge : skill.knowledge + '%') : skill.knowledge}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '0.8rem', opacity: 0.4, display: 'flex', gap: '10px' }}>
                                        {skill.sessions && <span>{skill.sessions} {isAtGuildmaster ? 'sessions' : ''}</span>}
                                        {skill.sessions && <span>•</span>}
                                        <span>{skill.difficulty}</span>
                                        <span>•</span>
                                        <span style={{ color: classColor, opacity: 0.8 }}>{skill.skillClass}</span>
                                    </div>
                                </div>

                                {isAtGuildmaster && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (practice) {
                                                practice.setLastPracticedSkill?.(skill.name);
                                                executeCommand(`practice ${skill.name}`);
                                                practice.setSilentSyncPending?.(true);
                                                executeCommand('practice', true);
                                            } else {
                                                executeCommand(`practice ${skill.name}`);
                                            }
                                        }}
                                        style={{
                                            background: classColor !== 'var(--accent)' ? classColor : 'var(--accent)',
                                            border: 'none',
                                            color: '#000',
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)',
                                            transition: 'transform 0.1s active'
                                        }}
                                        onPointerDown={(e) => e.currentTarget.style.transform = 'scale(0.9)'}
                                        onPointerUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                    >
                                        <Plus size={20} />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

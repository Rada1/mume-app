import React from 'react';
import { Trash2, Copy } from 'lucide-react';
import { CustomButton } from '../types';
import { useButtonModalLogic } from '../hooks/useButtonModalLogic';
import ButtonForm from './ButtonEditor/ButtonForm';

interface EditButtonModalProps {
    editingButton: CustomButton;
    setEditingButtonId: (id: string | null) => void;
    deleteButton: (id: string) => void;
    setButtons: React.Dispatch<React.SetStateAction<CustomButton[]>>;
    availableSets: string[];
    selectedButtonIds: Set<string>;
}

const EditButtonModal: React.FC<EditButtonModalProps> = ({
    editingButton,
    setEditingButtonId,
    deleteButton,
    setButtons,
    availableSets,
    selectedButtonIds
}) => {
    const {
        activeTab,
        setActiveTab,
        handleDuplicate,
        updateButton,
        handleImageUpload
    } = useButtonModalLogic({
        editingButton,
        setEditingButtonId,
        setButtons,
        selectedButtonIds
    });

    const tabs: ('main' | 'gestures' | 'style' | 'triggers' | 'requirements')[] =
        ['main', 'gestures', 'style', 'triggers', 'requirements'];

    return (
        <div className="modal-overlay" onClick={() => setEditingButtonId(null)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ minHeight: '550px', display: 'flex', flexDirection: 'column', maxHeight: '85vh' }}>
                <div className="modal-header">
                    <div className="modal-title">Edit Button</div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={handleDuplicate} title="Duplicate Button" style={{ background: 'none', border: 'none', color: 'var(--text-primary, #fff)', cursor: 'pointer' }}>
                            <Copy size={20} />
                        </button>
                        <button onClick={() => deleteButton(editingButton.id)} title="Delete Button" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                            <Trash2 size={20} />
                        </button>
                    </div>
                </div>

                <div className="modal-tabs" style={{ display: 'flex', gap: '5px', borderBottom: '1px solid var(--border-color, #444)', marginBottom: '15px' }}>
                    {tabs.map(tab => (
                        <div
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                padding: '8px 12px',
                                cursor: 'pointer',
                                borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
                                color: activeTab === tab ? 'var(--text-primary, #fff)' : 'var(--text-dim, #aaa)',
                                textTransform: 'capitalize',
                                fontWeight: activeTab === tab ? 'bold' : 'normal',
                                fontSize: '0.9rem'
                            }}
                        >
                            {tab}
                        </div>
                    ))}
                </div>

                <div className="modal-content" style={{ flex: 1, overflowY: 'auto', paddingRight: '5px' }}>
                    <ButtonForm
                        activeTab={activeTab}
                        editingButton={editingButton}
                        availableSets={availableSets}
                        updateButton={updateButton}
                        handleImageUpload={handleImageUpload}
                    />
                </div>

                <div className="modal-footer" style={{ marginTop: '15px' }}>
                    <button className="btn-primary" onClick={() => setEditingButtonId(null)}>
                        Save & Close
                    </button>
                </div>
            </div>
        </div >
    );
};

export default EditButtonModal;

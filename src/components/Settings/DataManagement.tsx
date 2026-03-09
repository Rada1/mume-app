import React from 'react';
import { Download, Upload } from 'lucide-react';

interface DataManagementProps {
    exportSettings: () => void;
    importSettings: (e: React.ChangeEvent<HTMLInputElement>) => void;
    isLoading: boolean;
    resetButtons: () => void;
}

const DataManagement: React.FC<DataManagementProps> = ({
    exportSettings,
    importSettings,
    isLoading,
    resetButtons,
}) => {
    return (
        <div className="setting-group">
            <label className="setting-label" style={{ marginTop: '20px' }}>Data Management</label>
            <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn-primary" onClick={exportSettings} style={{ flex: 1 }}>
                        <Download size={16} /> Export Settings
                    </button>
                    <input
                        type="file"
                        id="settings-import"
                        hidden
                        onChange={importSettings}
                        accept=".json"
                    />
                    <label htmlFor="settings-import" className="btn-secondary" style={{ flex: 1, margin: 0 }}>
                        {isLoading ? 'Loading...' : <><Upload size={16} /> Import Settings</>}
                    </label>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button className="btn-secondary" onClick={() => { if (confirm('WIPE ALL SAVED DATA and reset to the built-in defaults? This cannot be undone.')) resetButtons(); }} style={{ width: '100%', borderColor: 'var(--ansi-red, #ef4444)', color: 'var(--ansi-red, #ef4444)' }}>
                        Reset to Default
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DataManagement;

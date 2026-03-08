import React, { useState, useEffect } from 'react';
import { Book, ChevronRight, MessageSquare, Map, MousePointer2 } from 'lucide-react';
import { useGame } from '../../context/GameContext';

// Import markdown files as raw strings (Vite feature)
// @ts-ignore
import gettingStarted from '../../constants/docs/getting-started.md?raw';
// @ts-ignore
import buttonEditor from '../../constants/docs/button-editor.md?raw';
// @ts-ignore
import mapAdvanced from '../../constants/docs/map-advanced.md?raw';

const GUIDES = [
    { id: 'start', title: 'Getting Started', icon: <Book size={18} />, content: gettingStarted },
    { id: 'buttons', title: 'Button Editor', icon: <MousePointer2 size={18} />, content: buttonEditor },
    { id: 'map', title: 'Advanced Mapping', icon: <Map size={18} />, content: mapAdvanced },
];

const HelpGuides: React.FC = () => {
    const [selectedGuideId, setSelectedGuideId] = useState(GUIDES[0].id);
    const { btn } = useGame();

    const selectedGuide = GUIDES.find(g => g.id === selectedGuideId) || GUIDES[0];

    // Simple markdown renderer for basic formatting
    const renderMarkdown = (text: string) => {
        return text.split('\n').map((line, i) => {
            if (line.startsWith('# ')) return <h1 key={i}>{line.replace('# ', '')}</h1>;
            if (line.startsWith('## ')) return <h2 key={i}>{line.replace('## ', '')}</h2>;
            if (line.startsWith('- ')) return <li key={i}>{line.replace('- ', '')}</li>;
            if (line.trim() === '') return <br key={i} />;

            // Bold
            let parts: (string | React.JSX.Element)[] = [line];
            const boldRegex = /\*\*(.*?)\*\*/g;
            let match;
            while ((match = boldRegex.exec(line)) !== null) {
                // This is a very basic parser, better to use real one but for now:
                return <p key={i} dangerouslySetInnerHTML={{
                    __html: line
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/`(.*?)`/g, '<code>$1</code>')
                }} />;
            }

            return <p key={i}>{line}</p>;
        });
    };

    return (
        <div className="help-guides-container">
            <div className="help-sidebar">
                {GUIDES.map(guide => (
                    <div
                        key={guide.id}
                        className={`help-nav-item ${selectedGuideId === guide.id ? 'active' : ''}`}
                        onClick={() => setSelectedGuideId(guide.id)}
                    >
                        {guide.icon}
                        <span>{guide.title}</span>
                        <ChevronRight size={14} className="chevron" />
                    </div>
                ))}

                <div className="help-sidebar-footer">
                    <button className="reset-defaults-btn" onClick={() => btn.resetToDefaults()}>
                        Reset UI to Defaults
                    </button>
                    <p className="help-version">Version 1.0.0</p>
                </div>
            </div>

            <div className="help-content">
                <div className="markdown-body">
                    {renderMarkdown(selectedGuide.content)}
                </div>
            </div>
        </div>
    );
};

export default HelpGuides;

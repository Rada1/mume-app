import React, { useState, useEffect } from 'react';
import { useGame, useVitals } from '../../context/GameContext';
import './AgentHUD.css';

export const AgentHUD: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [snapshot, setSnapshot] = useState<any>(null);
    const game = useGame();
    const vitals = useVitals();

    useEffect(() => {
        const handleToggle = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'A') {
                setIsVisible(v => !v);
            }
        };
        window.addEventListener('keydown', handleToggle);
        return () => window.removeEventListener('keydown', handleToggle);
    }, []);

    useEffect(() => {
        if (!isVisible) return;
        const interval = setInterval(() => {
            if ((window as any).__AGENT_OBSERVABILITY__) {
                setSnapshot((window as any).__AGENT_OBSERVABILITY__.getSnapshot());
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [isVisible]);

    if (!isVisible || !snapshot) return null;

    return (
        <div className="agent-hud-overlay">
            <div className="agent-hud-header">
                <h3>Agent Observability HUD</h3>
                <button onClick={() => setIsVisible(false)}>Close</button>
            </div>
            <div className="agent-hud-content">
                <section>
                    <h4>Invariants</h4>
                    <ul>
                        {snapshot.invariants.map((inv: any) => (
                            <li key={inv.id} className={inv.passed ? 'passed' : 'failed'}>
                                {inv.passed ? '✅' : '❌'} {inv.message}
                            </li>
                        ))}
                    </ul>
                </section>
                <section>
                    <h4>State Snapshot</h4>
                    <pre>{JSON.stringify({
                        gameState: snapshot.game.gameState,
                        character: snapshot.game.characterName,
                        hp: `${snapshot.vitals.stats.hp}/${snapshot.vitals.stats.maxHp}`,
                        mana: `${snapshot.vitals.stats.mana}/${snapshot.vitals.stats.maxMana}`,
                        room: snapshot.game.roomName,
                        zone: snapshot.game.roomZone
                    }, null, 2)}</pre>
                </section>
                <section>
                    <h4>Recent Events (Last 5)</h4>
                    <div className="event-list">
                        {snapshot.events.slice(-5).reverse().map((ev: any, i: number) => (
                            <div key={i} className={`event-item ev-${ev.typ}`}>
                                <span>[{new Date(ev.t).toLocaleTimeString()}]</span>
                                <strong>{ev.typ.toUpperCase()}</strong>
                                <code>{JSON.stringify(ev.d).slice(0, 50)}...</code>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
};

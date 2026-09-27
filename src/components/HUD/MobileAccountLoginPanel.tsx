/**
 * @file MobileAccountLoginPanel.tsx
 * @description Large, focused mobile login form with saved credential support.
 */

// --- Logic Section ---
import React, { FC, FormEvent, useEffect, useRef } from 'react';
import { useGame } from '../../context/GameContext';
import type { GameContextType } from '../../context/GameContext/types';
import { useInputStore } from '../../stores/useInputStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import './MobileAccountLoginPanel.css';

export const MobileAccountLoginPanel: FC = () => {
    const { accountState, isPasswordMode, executeCommand, triggerHaptic } = useGame() as GameContextType;
    const input = useInputStore(state => state.input);
    const setInput = useInputStore(state => state.setInput);
    const rememberLogin = useSettingsStore(state => state.rememberLogin);
    const setRememberLogin = useSettingsStore(state => state.setRememberLogin);
    const loginName = useSettingsStore(state => state.loginName);
    const loginPassword = useSettingsStore(state => state.loginPassword);
    const setLoginName = useSettingsStore(state => state.setLoginName);
    const setLoginPassword = useSettingsStore(state => state.setLoginPassword);
    const lastFilledPromptRef = useRef('');

    const loginPrompt = (accountState.currentPrompt ?? '').toLowerCase();
    const isLoginPassword = isPasswordMode || loginPrompt.includes('password') || loginPrompt.includes('verify');
    const isLoginName = loginPrompt.includes('by what name') || loginPrompt.includes('enter new account name');

    useEffect(() => {
        if (!rememberLogin) {
            lastFilledPromptRef.current = '';
            return;
        }
        const promptKey = isLoginPassword ? 'password' : isLoginName ? 'name' : '';
        if (!promptKey || lastFilledPromptRef.current === promptKey) return;
        lastFilledPromptRef.current = promptKey;
        const savedValue = isLoginPassword ? loginPassword : loginName;
        if (savedValue) setInput(savedValue);
    }, [isLoginName, isLoginPassword, loginName, loginPassword, rememberLogin, setInput]);

    const submitLogin = (event: FormEvent) => {
        event.preventDefault();
        const value = input.trim();
        if (!value) return;
        if (rememberLogin) {
            if (isLoginPassword) setLoginPassword(value);
            else if (isLoginName) setLoginName(value);
        }
        useInputStore.getState().addToHistory(value);
        setInput('');
        const savedPasswordWillBeAvailable = isLoginName && Boolean(loginPassword.trim());
        executeCommand(value, false, false, false, false, { shouldFocus: !savedPasswordWillBeAvailable });
    };

    return (
        <main className="mobile-account-experience is-login">
            <div className="mobile-account-login-card">
                <h1>MUME IX</h1>
                <div className="mobile-account-login-prompt">
                    {accountState.currentPrompt || 'By what name do you wish to be known?'}
                </div>
                <form onSubmit={submitLogin}>
                    <input
                        id="mud-input"
                        name="mud-input"
                        className="mobile-account-input"
                        type={isLoginPassword ? 'password' : 'text'}
                        value={input}
                        onChange={event => setInput(event.target.value)}
                        placeholder={isLoginPassword ? 'Enter password' : 'Enter username'}
                        autoComplete={isLoginPassword ? 'current-password' : 'username'}
                        autoCapitalize="none"
                    />
                    <label className="mobile-account-remember">
                        <input type="checkbox" checked={rememberLogin} onChange={event => setRememberLogin(event.target.checked)} />
                        <span>Remember login</span>
                    </label>
                    <button className="mobile-account-action is-primary" type="submit" onClick={() => triggerHaptic?.(40)}>Login</button>
                    <button
                        className={`mobile-account-action${isLoginName ? '' : ' is-reserved-hidden'}`}
                        type="button"
                        disabled={!isLoginName}
                        aria-hidden={!isLoginName}
                        tabIndex={isLoginName ? 0 : -1}
                        onClick={() => { triggerHaptic?.(25); executeCommand('new'); }}
                    >
                        Create new account
                    </button>
                </form>
            </div>
        </main>
    );
};

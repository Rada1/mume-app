/**
 * @file GeneralSettings.tsx
 * @description General settings panel composed of Connection, Appearance, and Experimental settings.
 */

import React from 'react';
import { ConnectionDetails } from './ConnectionDetails';
import { AppearanceSettings } from './AppearanceSettings';
import { ExperimentalSettings } from './ExperimentalSettings';
import { LootSettings } from './LootSettings';
import ClientVersionInfo from './ClientVersionInfo';

interface GeneralSettingsProps {
    connectionUrl: string;
    setConnectionUrl: (val: string) => void;
    status: string;
    connect: () => void;
    autoConnect: boolean;
    setAutoConnect: (val: boolean) => void;
    loginName: string;
    setLoginName: (val: string) => void;
    loginPassword: string;
    setLoginPassword: (val: string) => void;
    theme: 'light' | 'dark';
    setTheme: (val: 'light' | 'dark') => void;
    isImmersionMode: boolean;
    setIsImmersionMode: (val: boolean) => void;
    fontFamily: string;
    setFontFamily: (val: string) => void;
    logFontSize: number;
    logFontSizePx: number;
    setLogFontSize: (v: number | ((prev: number) => number)) => void;
    autoSaveSessions: boolean;
    setAutoSaveSessions: (val: boolean) => void;
    isPerformanceMode: boolean;
    setIsPerformanceMode: (val: boolean) => void;
}

const GeneralSettings: React.FC<GeneralSettingsProps> = (props) => {
    return (
        <>
            <ConnectionDetails
                connectionUrl={props.connectionUrl}
                setConnectionUrl={props.setConnectionUrl}
                status={props.status}
                connect={props.connect}
                autoConnect={props.autoConnect}
                setAutoConnect={props.setAutoConnect}
                loginName={props.loginName}
                setLoginName={props.setLoginName}
                loginPassword={props.loginPassword}
                setLoginPassword={props.setLoginPassword}
            />

            <AppearanceSettings
                theme={props.theme}
                setTheme={props.setTheme}
                fontFamily={props.fontFamily}
                setFontFamily={props.setFontFamily}
                logFontSize={props.logFontSize}
                logFontSizePx={props.logFontSizePx}
                setLogFontSize={props.setLogFontSize}
                isImmersionMode={props.isImmersionMode}
                setIsImmersionMode={props.setIsImmersionMode}
                isPerformanceMode={props.isPerformanceMode}
                setIsPerformanceMode={props.setIsPerformanceMode}
            />

            <LootSettings />

            <ExperimentalSettings
                autoSaveSessions={props.autoSaveSessions}
                setAutoSaveSessions={props.setAutoSaveSessions}
            />

            <ClientVersionInfo />
        </>
    );
};

export default GeneralSettings;

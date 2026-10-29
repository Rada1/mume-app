/**
 * @file GeneralSettings.tsx
 * @description General settings panel composed of connection, loot, experimental, and version settings.
 */

import React from 'react';
import { ConnectionDetails } from './ConnectionDetails';
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
    autoSaveSessions: boolean;
    setAutoSaveSessions: (val: boolean) => void;
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

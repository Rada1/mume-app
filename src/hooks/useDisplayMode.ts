/**
 * @file useDisplayMode.ts
 * @description Detects whether the app is running as an installed standalone app or in a browser tab.
 */

import { useEffect, useState } from 'react';

const getIsStandalone = () => {
    const navigatorStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
    return navigatorStandalone || window.matchMedia('(display-mode: standalone)').matches;
};

export function useDisplayMode() {
    const [isStandalone, setIsStandalone] = useState(getIsStandalone);

    useEffect(() => {
        const standaloneQuery = window.matchMedia('(display-mode: standalone)');
        const browserQuery = window.matchMedia('(display-mode: browser)');
        const update = () => setIsStandalone(getIsStandalone());

        standaloneQuery.addEventListener('change', update);
        browserQuery.addEventListener('change', update);
        update();

        return () => {
            standaloneQuery.removeEventListener('change', update);
            browserQuery.removeEventListener('change', update);
        };
    }, []);

    return {
        isStandalone,
        isBrowser: !isStandalone,
    };
}

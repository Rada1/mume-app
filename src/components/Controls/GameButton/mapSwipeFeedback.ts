/** @file mapSwipeFeedback.ts — Directional release feedback for tactical map controls. */

// --- Logic Section ---
import type { CustomButton, SwipeDirection } from '../../../types';
import { getButtonCommand } from '../../../utils/buttonUtils';

interface SwipeTrackingElement extends HTMLElement {
    _gestureStartX?: number | null;
    _gestureStartY?: number | null;
    _gestureMaxDist?: number;
    _gestureFurthestDx?: number;
    _gestureFurthestDy?: number;
    _shortSwipeFeedbackTimer?: number | null;
}

const MAP_CONTROL_CONTAINER_SELECTOR = [
    '.mobile-map-command-overlay',
    '.mobile-tactical-buttons-persistent',
    '.mobile-map-bottom-actions',
    '.desktop-tactical-buttons-persistent'
].join(', ');

export const isMapControlElement = (element: HTMLElement) => element.classList.contains('deck-category-button')
    || element.classList.contains('line-btn')
    || element.classList.contains('map-action-button')
    || Boolean(element.closest(MAP_CONTROL_CONTAINER_SELECTOR));

export const initializeMapSwipeTracking = (element: HTMLElement, clientX: number, clientY: number) => {
    const trackingElement = element as SwipeTrackingElement;
    trackingElement._gestureStartX = clientX;
    trackingElement._gestureStartY = clientY;
    trackingElement._gestureMaxDist = 0;
    trackingElement._gestureFurthestDx = 0;
    trackingElement._gestureFurthestDy = 0;
};

export const trackMapSwipeMovement = (element: HTMLElement, clientX: number, clientY: number) => {
    const trackingElement = element as SwipeTrackingElement;
    if (typeof trackingElement._gestureStartX !== 'number' || typeof trackingElement._gestureStartY !== 'number') return;

    const dx = clientX - trackingElement._gestureStartX;
    const dy = clientY - trackingElement._gestureStartY;
    const distance = Math.hypot(dx, dy);
    if (distance > (trackingElement._gestureMaxDist || 0)) {
        trackingElement._gestureMaxDist = distance;
        trackingElement._gestureFurthestDx = dx;
        trackingElement._gestureFurthestDy = dy;
    }
};

const showShortSwipeFeedback = (element: HTMLElement, direction: SwipeDirection) => {
    const trackingElement = element as SwipeTrackingElement;
    delete trackingElement.dataset.shortSwipeFeedback;
    void trackingElement.offsetWidth;
    trackingElement.dataset.shortSwipeFeedback = direction;
    if (trackingElement._shortSwipeFeedbackTimer) window.clearTimeout(trackingElement._shortSwipeFeedbackTimer);
    trackingElement._shortSwipeFeedbackTimer = window.setTimeout(() => {
        delete trackingElement.dataset.shortSwipeFeedback;
        trackingElement._shortSwipeFeedbackTimer = null;
    }, 1000);
};

export const showMapSwipeFeedback = (
    element: HTMLElement,
    button: CustomButton,
    clientX: number,
    clientY: number,
    lastDirection: SwipeDirection | 'center' | null
) => {
    const trackingElement = element as SwipeTrackingElement;
    if (typeof trackingElement._gestureStartX !== 'number' || typeof trackingElement._gestureStartY !== 'number') return;

    const netDx = clientX - trackingElement._gestureStartX;
    const netDy = clientY - trackingElement._gestureStartY;
    const netDistance = Math.hypot(netDx, netDy);
    const furthestDx = trackingElement._gestureFurthestDx || 0;
    const furthestDy = trackingElement._gestureFurthestDy || 0;
    const maxDistance = Math.max(trackingElement._gestureMaxDist || 0, netDistance);
    if (maxDistance <= 15) return;

    const dx = netDistance > 15 ? netDx : furthestDx;
    const dy = netDistance > 15 ? netDy : furthestDy;
    const direction = getButtonCommand(button, dx, dy, undefined, maxDistance)?.dir
        || (lastDirection && lastDirection !== 'center' ? lastDirection : undefined);
    if (direction) showShortSwipeFeedback(element, direction);
};

/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */


/**
 * Detects if the current browser is Safari.
 * @returns True if Safari, false otherwise.
 */
export function isSafari(): boolean {
    // Check if browser.runtime.getURL uses safari-web-extension:// protocol
    const url = browser.runtime.getURL('');
    return url.startsWith('safari-web-extension://');
}

/**
 * Detects if the current browser is Firefox.
 * @returns True if Firefox, false otherwise.
 */
export function isFirefox(): boolean {
    // Firefox uses moz-extension:// protocol for extension URLs
    const url = browser.runtime.getURL('');
    return url.startsWith('moz-extension://');
}

/**
 * Detects if the current browser is Chromium-based (Chrome, Edge, Opera, Brave, etc.).
 * @returns True if Chromium-based, false otherwise.
 */
export function isChromium(): boolean {
    // Chromium-based browsers use chrome-extension:// protocol
    const url = browser.runtime.getURL('');
    return url.startsWith('chrome-extension://');
}

/**
 * Detects if the current browser is Microsoft Edge (Chromium-based).
 * Note: This uses userAgent detection which can be spoofed, but is necessary
 * to differentiate Edge from other Chromium browsers.
 * @returns True if Edge, false otherwise.
 */
export function isEdge(): boolean {
    // Edge uses "Edg/" in userAgent (without the 'e' to differentiate from legacy Edge)
    return isChromium() && navigator.userAgent.includes('Edg/');
}
/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

const extensionVersionElement = document.getElementById('extensionVersion') as HTMLSpanElement;
const extensionNameElement = document.getElementById('extensionName') as HTMLSpanElement;

// Function to display the extension version
export function displayExtensionVersion() {
    if (extensionVersionElement) {
        const manifest = browser.runtime.getManifest();
        extensionVersionElement.textContent = manifest.version;
    }
}

export function displayExtensionName() {
    if (extensionNameElement) {
        const manifest = browser.runtime.getManifest();
        extensionNameElement.textContent = manifest.name;
    }
}
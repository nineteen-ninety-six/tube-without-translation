/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */


/**
 * Ensures that settings object matches the default structure:
 * - Adds missing keys with default values
 * - Removes unknown keys
 * - Fixes type mismatches by resetting to default
 * Returns an object with added, removed, and fixed keys for logging.
 */
export function sanitizeSettings<T extends object>(settings: T, defaults: T): { added: string[], removed: string[], fixed: string[] } {
    const added: string[] = [];
    const removed: string[] = [];
    const fixed: string[] = [];

    // Remove unknown keys
    for (const key in settings) {
        if (Object.prototype.hasOwnProperty.call(settings, key) && 
            !Object.prototype.hasOwnProperty.call(defaults, key)) {
            delete (settings as any)[key];
            removed.push(key);
        }
    }

    // Add missing keys and fix types
    for (const key in defaults) {
        if (!Object.prototype.hasOwnProperty.call(defaults, key)) continue;
        
        const defaultValue = defaults[key];
        const currentValue = (settings as any)[key];
        const hasKey = key in settings;

        if (!hasKey) {
            (settings as any)[key] = defaultValue;
            added.push(key);
        } else if (isNestedObject(defaultValue)) {
            // Handle nested objects
            if (!isNestedObject(currentValue)) {
                // Current value is not an object, reset to default
                (settings as any)[key] = defaultValue;
                fixed.push(key);
            } else {
                // Recursively sanitize nested objects
                const nestedResult = sanitizeSettings(currentValue, defaultValue);
                added.push(...nestedResult.added.map(nestedKey => `${key}.${nestedKey}`));
                removed.push(...nestedResult.removed.map(nestedKey => `${key}.${nestedKey}`));
                fixed.push(...nestedResult.fixed.map(nestedKey => `${key}.${nestedKey}`));
            }
        } else if (!isSameType(currentValue, defaultValue)) {
            // Fix type mismatch for primitive values
            (settings as any)[key] = defaultValue;
            fixed.push(key);
        }
    }

    return { added, removed, fixed };
}

/**
 * Checks if a value is a nested object (not null, not array, not date)
 */
function isNestedObject(value: any): boolean {
    return typeof value === 'object' && 
           value !== null && 
           !Array.isArray(value) && 
           !(value instanceof Date);
}

/**
 * Checks if two values have the same type (handles arrays and null specially)
 */
function isSameType(value1: any, value2: any): boolean {
    if (value1 === null || value2 === null) {
        return value1 === value2;
    }
    
    if (Array.isArray(value1) !== Array.isArray(value2)) {
        return false;
    }
    
    return typeof value1 === typeof value2;
}
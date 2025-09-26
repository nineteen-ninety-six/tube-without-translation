import { titlesLog, titlesErrorLog } from '../../utils/logger';
import { ProcessingResult, ElementProcessingState, TitleFetchResult } from '../../types/types';
import { normalizeText } from '../../utils/text';
import { extractVideoIdFromUrl } from '../../utils/video';
import { fetchOriginalTitle, updateBrowsingTitleElement } from './browsingTitles';
import { currentSettings } from '../index';
import { restoreOriginalThumbnail } from '../Thumbnails/browsingThumbnails';

let postVideoObserver: MutationObserver | null = null;
const processingPostVideoTitles = new Set<string>();
let postVideoDebounceTimer: number | null = null;
let isPostVideoGridActive = false;
const POST_VIDEO_DEBOUNCE = 500;

export function setupPostVideoObserver(): void {
    cleanupPostVideoObserver();
    
    const player = document.getElementById('movie_player');
    if (!player) {
        titlesLog('No player found for post video observer');
        return;
    }
    
    // Initialize grid state
    isPostVideoGridActive = player.classList.contains('ytp-fullscreen-grid-active');
    
    // Check if grid already exists and is visible
    const existingGrid = document.querySelector('.ytp-fullscreen-grid');
    if (existingGrid && isPostVideoGridActive) {
        titlesLog('Post video grid already active on setup');
        setTimeout(() => {
            refreshPostVideoTitles();
        }, 200);
    }
    
    postVideoObserver = new MutationObserver((mutations) => {
        let shouldRefresh = false;
        
        mutations.forEach((mutation) => {
            // Check for attribute changes on the player (class changes)
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                const target = mutation.target as Element;
                if (target.id === 'movie_player') {
                    const nowActive = target.classList.contains('ytp-fullscreen-grid-active');
                    
                    // Only trigger if grid becomes active (transition from inactive to active)
                    if (nowActive && !isPostVideoGridActive) {
                        shouldRefresh = true;
                        titlesLog('Post video grid became active');
                    }
                    
                    isPostVideoGridActive = nowActive;
                }
            }
            
            // Also check for added nodes (fallback)
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const element = node as Element;
                        
                        // Check if the added element is or contains the fullscreen grid
                        if (element.classList?.contains('ytp-fullscreen-grid') ||
                            element.querySelector?.('.ytp-fullscreen-grid')) {
                            shouldRefresh = true;
                            titlesLog('Post video grid added to DOM');
                        }
                    }
                });
            }
        });
        
        if (shouldRefresh) {
            // Clear existing debounce timer
            if (postVideoDebounceTimer) {
                clearTimeout(postVideoDebounceTimer);
            }
            
            // Set new debounce timer
            postVideoDebounceTimer = window.setTimeout(() => {
                titlesLog('Triggering post video titles refresh');
                refreshPostVideoTitles();
                postVideoDebounceTimer = null;
            }, POST_VIDEO_DEBOUNCE);
        }
    });
    
    postVideoObserver.observe(player, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class']
    });
    
    titlesLog('Post video observer initialized');
}

export function cleanupPostVideoObserver(): void {
    if (postVideoObserver) {
        postVideoObserver.disconnect();
        postVideoObserver = null;
    }
    
    if (postVideoDebounceTimer) {
        clearTimeout(postVideoDebounceTimer);
        postVideoDebounceTimer = null;
    }
    
    processingPostVideoTitles.clear();
    isPostVideoGridActive = false;
}

// Check if post video title element should be processed
function shouldProcessPostVideoTitleElement(titleElement: HTMLElement): ProcessingResult {
    const linkElement = titleElement.closest('.ytp-modern-videowall-still') as HTMLAnchorElement;
    
    if (!linkElement || !linkElement.href) {
        return { shouldProcess: false };
    }

    const videoId = extractVideoIdFromUrl(linkElement.href);
    
    if (!videoId) {
        return { shouldProcess: false };
    }

    // Skip if video is currently being processed
    if (processingPostVideoTitles.has(videoId)) {
        return { shouldProcess: false };
    }

    return { 
        shouldProcess: true, 
        videoId, 
        videoUrl: linkElement.href 
    };
}

// Check processing state for post video elements
function checkPostVideoTitleElementProcessingState(titleElement: HTMLElement, videoId: string): ElementProcessingState {
    // Check if already processed successfully
    if (titleElement.hasAttribute('ynt')) {
        if (titleElement.getAttribute('ynt') === videoId) {
            const directTextNodes = Array.from(titleElement.childNodes)
                .filter(node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim());
            
            if (directTextNodes.length === 1 && normalizeText(directTextNodes[0].textContent || '') === normalizeText(titleElement.getAttribute('title') || '')) {
                return { shouldSkip: true, shouldClean: false };
            } else {
                return { shouldSkip: false, shouldClean: true };
            }
        } else {
            return { shouldSkip: false, shouldClean: true };
        }
    }

    if (titleElement.hasAttribute('ynt-fail')) {
        if (titleElement.getAttribute('ynt-fail') === videoId) {
            return { shouldSkip: true, shouldClean: false };
        }
        titleElement.removeAttribute('ynt-fail');
    }

    if (titleElement.hasAttribute('ynt-original')) {
        if (titleElement.getAttribute('ynt-original') === videoId) {
            return { shouldSkip: true, shouldClean: false };
        }
        titleElement.removeAttribute('ynt-original');
    }

    return { shouldSkip: false, shouldClean: false };
}

// Main function to refresh post video suggestions
export async function refreshPostVideoTitles(): Promise<void> {
    const postVideoGrid = document.querySelector('.ytp-fullscreen-grid');
    if (!postVideoGrid) {
        return;
    }

    const postVideoTitles = postVideoGrid.querySelectorAll('.ytp-modern-videowall-still-info-title') as NodeListOf<HTMLElement>;
    
    if (postVideoTitles.length === 0) {
        return;
    }

    //titlesLog(`Found ${postVideoTitles.length} post video titles to process`);

    // Process each title element
    for (const titleElement of postVideoTitles) {
        const processingResult = shouldProcessPostVideoTitleElement(titleElement);
        if (!processingResult.shouldProcess || !processingResult.videoId) {
            continue;
        }
        
        const { videoId } = processingResult;
        
        // Mark video as being processed
        processingPostVideoTitles.add(videoId);
        
        try {
            // Skip thumbnail restoration for videos already marked as original
            if (!titleElement.hasAttribute('ynt-original') && currentSettings?.originalThumbnails?.enabled) {
                restoreOriginalThumbnail(videoId, titleElement);
            }

            const currentTitle = titleElement.textContent || '';

            const processingState = checkPostVideoTitleElementProcessingState(titleElement, videoId);
            if (processingState.shouldSkip) {
                continue;
            }
            if (processingState.shouldClean) {
                titleElement.removeAttribute('ynt');
                titleElement.removeAttribute('ynt-fail');
                titleElement.removeAttribute('ynt-fail-retry');
                titleElement.removeAttribute('ynt-original');
            }
            
            // Reuse the existing fetchOriginalTitle function
            const titleFetchResult = await fetchOriginalTitle(videoId, titleElement, currentTitle);
            if (titleFetchResult.shouldSkip) {
                continue;
            }

            const originalTitle = titleFetchResult.originalTitle;
            if (!originalTitle) {
                titlesErrorLog(`No original title found for video ${videoId}`);
                titleElement.setAttribute('ynt-fail', videoId);
                continue;
            }

            try {
                updateBrowsingTitleElement(titleElement, originalTitle, videoId, false);
            } catch (error) {
                titlesErrorLog(`Failed to update post video title:`, error);
                titleElement.setAttribute('ynt-fail', videoId);
            }

        } finally {
            // Always remove video from processing set
            processingPostVideoTitles.delete(videoId);
        }
    }
}
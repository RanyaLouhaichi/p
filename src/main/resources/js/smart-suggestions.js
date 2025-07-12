window.SmartSuggestions = (function() {
    'use strict';
    
    const API_BASE = AJS.contextPath() + '/rest/jurix/1.0';
    const BACKEND_URL = 'http://localhost:5001';
    let currentIssueKey = null;
    let suggestionsCache = {};
    let isLoadingInProgress = false;
    let retryCount = 0;
    const MAX_RETRIES = 3;
    
    function init() {
        console.log('Initializing SmartSuggestions...');
        
        // Listen for Jira events with proper error handling
        if (typeof JIRA !== 'undefined' && JIRA.Events) {
            JIRA.bind(JIRA.Events.NEW_CONTENT_ADDED, function(e, context) {
                // Debounce to avoid multiple calls
                setTimeout(function() {
                    checkAndLoadSuggestions();
                }, 500);
            });
            
            // Also listen for issue refresh events
            JIRA.bind(JIRA.Events.ISSUE_REFRESHED, function(e, context) {
                setTimeout(function() {
                    checkAndLoadSuggestions();
                }, 500);
            });
        }
        
        // Use MutationObserver as fallback for dynamic content
        setupMutationObserver();
        
        // Initial load with better timing
        AJS.$(document).ready(function() {
            // Wait for issue data to be fully loaded
            waitForIssueData(function() {
                checkAndLoadSuggestions();
            });
        });
    }
    
    function waitForIssueData(callback, attempts = 0) {
        const maxAttempts = 20; // 10 seconds max
        
        const issueKey = getIssueKey();
        const issueContainer = AJS.$('#issue-content, .issue-view, #jira-issue-header');
        
        if (issueKey && issueContainer.length > 0) {
            // Issue data is ready
            callback();
        } else if (attempts < maxAttempts) {
            // Retry after 500ms
            setTimeout(function() {
                waitForIssueData(callback, attempts + 1);
            }, 500);
        } else {
            console.error('Failed to detect issue data after maximum attempts');
            showErrorState('Unable to load issue data. Please refresh the page.');
        }
    }
    
    function setupMutationObserver() {
        // Watch for changes in the issue view
        const targetNode = document.getElementById('content') || document.body;
        const config = { childList: true, subtree: true };
        
        const observer = new MutationObserver(function(mutationsList) {
            for (let mutation of mutationsList) {
                if (mutation.type === 'childList') {
                    // Check if issue view was added/changed
                    const newIssueKey = getIssueKey();
                    if (newIssueKey && newIssueKey !== currentIssueKey) {
                        // Debounce to avoid multiple calls
                        clearTimeout(window.suggestionDebounceTimer);
                        window.suggestionDebounceTimer = setTimeout(function() {
                            checkAndLoadSuggestions();
                        }, 500);
                    }
                }
            }
        });
        
        observer.observe(targetNode, config);
    }
    
    function checkAndLoadSuggestions() {
        const issueKey = getIssueKey();
        
        if (!issueKey) {
            console.log('No issue key found, skipping suggestions');
            return;
        }
        
        // Always try to show suggestions, even for the same issue
        // This fixes the navigation back problem
        console.log('Loading suggestions for issue:', issueKey);
        currentIssueKey = issueKey;
        loadSuggestions(issueKey);
    }
    
    function getIssueKey() {
        // Multiple ways to get issue key for better reliability
        
        // Method 1: From JIRA global object
        if (typeof JIRA !== 'undefined' && JIRA.Issue && JIRA.Issue.getIssueKey) {
            const key = JIRA.Issue.getIssueKey();
            if (key) return key;
        }
        
        // Method 2: From URL
        const match = window.location.pathname.match(/browse\/([A-Z]+-\d+)/);
        if (match) {
            return match[1];
        }
        
        // Method 3: From meta tag
        const metaTag = AJS.$('meta[name="ajs-issue-key"]');
        if (metaTag.length) {
            return metaTag.attr('content');
        }
        
        // Method 4: From data attributes
        const issueEl = AJS.$('[data-issue-key]').first();
        if (issueEl.length) {
            return issueEl.attr('data-issue-key');
        }
        
        // Method 5: From issue header
        const issueHeader = AJS.$('#key-val, .issue-link').first();
        if (issueHeader.length) {
            const text = issueHeader.text().trim();
            const keyMatch = text.match(/([A-Z]+-\d+)/);
            if (keyMatch) return keyMatch[1];
        }
        
        return null;
    }
    
    function loadSuggestions(issueKey) {
        // Prevent duplicate requests
        if (isLoadingInProgress) {
            console.log('Load already in progress, skipping');
            return;
        }
        
        // Check cache first and show immediately if available
        if (suggestionsCache[issueKey]) {
            console.log('Showing cached suggestions for', issueKey);
            displaySuggestions(suggestionsCache[issueKey]);
            return;
        }
        
        isLoadingInProgress = true;
        
        // Show loading state
        showLoadingState();
        
        // Call the Jira plugin endpoint which will get the issue details
        AJS.$.ajax({
            url: API_BASE + '/suggestions/retrieve',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ issue_key: issueKey }),
            timeout: 30000, // 30 second timeout
            success: function(response) {
                console.log('Suggestions response:', response);
                retryCount = 0; // Reset retry count on success
                
                if (response.status === 'success' && response.suggestions) {
                    suggestionsCache[issueKey] = response.suggestions;
                    displaySuggestions(response.suggestions);
                } else {
                    showNoSuggestionsState();
                }
            },
            error: function(xhr, status, error) {
                console.error('Failed to load suggestions:', error);
                handleLoadError(issueKey, xhr, status, error);
            },
            complete: function() {
                isLoadingInProgress = false;
            }
        });
    }
    
    function handleLoadError(issueKey, xhr, status, error) {
        // Implement retry logic
        if (retryCount < MAX_RETRIES) {
            retryCount++;
            console.log(`Retrying... (attempt ${retryCount}/${MAX_RETRIES})`);
            
            // Exponential backoff
            const retryDelay = Math.min(1000 * Math.pow(2, retryCount - 1), 5000);
            
            setTimeout(function() {
                isLoadingInProgress = false;
                loadSuggestions(issueKey);
            }, retryDelay);
        } else {
            // Show a user-friendly error message
            let errorMessage = 'Unable to load article suggestions. ';
            
            if (status === 'timeout') {
                errorMessage += 'The request timed out.';
            } else if (xhr.status === 0) {
                errorMessage += 'Please check your connection.';
            } else if (xhr.status >= 500) {
                errorMessage += 'Server error occurred.';
            }
            
            showErrorState(errorMessage);
            retryCount = 0; // Reset for next attempt
        }
    }
    
    function displaySuggestions(suggestions) {
        console.log('Displaying suggestions:', suggestions);
        
        // Remove any existing panel first
        AJS.$('#smart-suggestions-panel').remove();
        
        if (!suggestions || suggestions.length === 0) {
            showNoSuggestionsState();
            return;
        }
        
        // Create suggestions panel
        const panel = createSuggestionsPanel(suggestions);
        
        // Insert in the right sidebar with better positioning
        let inserted = false;
        
        // Try right panel first (preferred location)
        const rightPanel = AJS.$('#viewissuesidebar');
        if (rightPanel.length > 0) {
            // Insert after People section but before Dates
            const peopleModule = rightPanel.find('.people-module');
            if (peopleModule.length > 0) {
                peopleModule.after(panel);
            } else {
                rightPanel.prepend(panel);
            }
            inserted = true;
        }
        
        // Fallback to after description
        if (!inserted) {
            const descriptionModule = AJS.$('#descriptionmodule');
            if (descriptionModule.length > 0) {
                descriptionModule.after(panel);
                inserted = true;
            }
        }
        
        // Last fallback
        if (!inserted) {
            const issueMain = AJS.$('.issue-main-column');
            if (issueMain.length > 0) {
                issueMain.prepend(panel);
            }
        }
        
        // Bind feedback events
        bindFeedbackEvents();
        
        // Animate in
        setTimeout(function() {
            AJS.$('#smart-suggestions-panel').addClass('suggestions-loaded');
        }, 100);
    }
    
    function showLoadingState() {
        // Remove any existing panel
        AJS.$('#smart-suggestions-panel').remove();
        
        const loadingHtml = `
            <div id="smart-suggestions-panel" class="module">
                <div class="mod-header">
                    <h2>
                        <span class="aui-icon aui-icon-small aui-iconfont-lightbulb"></span>
                        Suggested Articles
                    </h2>
                </div>
                <div class="mod-content">
                    <div class="loading-suggestions">
                        <div class="aui-spinner"></div>
                        <p>Finding relevant articles...</p>
                    </div>
                </div>
            </div>
        `;
        
        // Try to insert in the same location logic as displaySuggestions
        const rightPanel = AJS.$('#viewissuesidebar');
        if (rightPanel.length > 0) {
            const peopleModule = rightPanel.find('.people-module');
            if (peopleModule.length > 0) {
                peopleModule.after(loadingHtml);
            } else {
                rightPanel.prepend(loadingHtml);
            }
        } else {
            AJS.$('.issue-main-column').prepend(loadingHtml);
        }
    }
    
    function showNoSuggestionsState() {
        const panel = `
            <div id="smart-suggestions-panel" class="module">
                <div class="mod-header">
                    <h2>
                        <span class="aui-icon aui-icon-small aui-iconfont-lightbulb"></span>
                        Suggested Articles
                    </h2>
                </div>
                <div class="mod-content">
                    <div class="no-suggestions">
                        <p>No relevant articles found for this issue.</p>
                        <p class="suggestion-help-text">Articles will appear here as our knowledge base grows.</p>
                    </div>
                </div>
            </div>
        `;
        
        AJS.$('#smart-suggestions-panel').replaceWith(panel);
    }
    
    function showErrorState(errorMessage) {
        const panel = AJS.$('#smart-suggestions-panel');
        if (panel.length) {
            panel.find('.mod-content').html(`
                <div class="error-suggestions">
                    <span class="aui-icon aui-icon-small aui-iconfont-error"></span>
                    <p>${errorMessage || 'Unable to load suggestions. Please try refreshing the page.'}</p>
                    <button class="aui-button aui-button-link retry-button" onclick="SmartSuggestions.retryLoad()">
                        Try Again
                    </button>
                </div>
            `);
        }
    }
    
    function createSuggestionsPanel(suggestions) {
        let html = `
            <div id="smart-suggestions-panel" class="jurix-suggestions-module">
                <div class="jurix-suggestions-header">
                    <div class="jurix-header-left">
                        <div class="jurix-icon-wrapper">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                            </svg>
                        </div>
                        <h3>AI Suggestions</h3>
                        <span class="jurix-badge">${suggestions.length}</span>
                    </div>
                    <div class="jurix-header-actions">
                        <button class="jurix-icon-btn" onclick="SmartSuggestions.minimizePanel()" title="Minimize">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M5 12h14"/>
                            </svg>
                        </button>
                        <button class="jurix-icon-btn" onclick="SmartSuggestions.closePanel()" title="Close">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M18 6L6 18M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="jurix-suggestions-body">
        `;
        
        suggestions.forEach((suggestion, index) => {
            const relevancePercent = Math.round(suggestion.relevance_score * 100);
            const relevanceLevel = suggestion.relevance_score > 0.7 ? 'high' : 
                                suggestion.relevance_score > 0.4 ? 'medium' : 'low';
            
            html += `
                <div class="jurix-suggestion-card" data-article-id="${suggestion.article_id}" data-relevance="${relevanceLevel}">
                    <div class="jurix-relevance-indicator ${relevanceLevel}">
                        <div class="jurix-relevance-bar" style="width: ${relevancePercent}%"></div>
                    </div>
                    
                    <div class="jurix-suggestion-content">
                        <h4 class="jurix-suggestion-title">
                            <a href="#" class="jurix-article-link" data-article-id="${suggestion.article_id}">
                                ${AJS.escapeHtml(suggestion.title)}
                            </a>
                        </h4>
                        
                        <div class="jurix-suggestion-meta">
                            <span class="jurix-relevance-score">
                                ${relevancePercent}% match
                            </span>
                            <span class="jurix-meta-separator">•</span>
                            <span class="jurix-suggestion-reason">
                                ${AJS.escapeHtml(suggestion.suggestion_reason)}
                            </span>
                        </div>
                        
                        <p class="jurix-suggestion-preview">
                            ${AJS.escapeHtml(suggestion.content)}
                        </p>
                        
                        <div class="jurix-suggestion-actions">
                            <button class="jurix-thumb-btn jurix-thumb-up" data-article-id="${suggestion.article_id}">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/>
                                </svg>
                                <span>Helpful</span>
                            </button>
                            <button class="jurix-thumb-btn jurix-thumb-down" data-article-id="${suggestion.article_id}">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3zm7-13h3a2 2 0 012 2v7a2 2 0 01-2 2h-3"/>
                                </svg>
                                <span>Not helpful</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
                <div class="jurix-minimized-state" onclick="SmartSuggestions.restorePanel()">
                    <span class="jurix-minimized-icon">💡</span>
                    <span>AI Suggestions (${suggestions.length})</span>
                </div>
            </div>
        `;
        
        // Add the modern styles
        addModernStyles();
        
        return html;
    }

    function showLoadingState() {
        // Remove any existing panel
        AJS.$('#smart-suggestions-panel').remove();
        
        const loadingHtml = `
            <div id="smart-suggestions-panel" class="jurix-suggestions-module loading">
                <div class="jurix-suggestions-header">
                    <div class="jurix-header-left">
                        <div class="jurix-icon-wrapper">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                            </svg>
                        </div>
                        <h3>AI Suggestions</h3>
                    </div>
                </div>
                <div class="jurix-suggestions-body">
                    <div class="jurix-loading-state">
                        <div class="jurix-spinner">
                            <div class="jurix-spinner-dot"></div>
                            <div class="jurix-spinner-dot"></div>
                            <div class="jurix-spinner-dot"></div>
                        </div>
                        <p>Finding relevant articles...</p>
                    </div>
                </div>
            </div>
        `;
        
        // Insert in the same location logic
        const rightPanel = AJS.$('#viewissuesidebar');
        if (rightPanel.length > 0) {
            const peopleModule = rightPanel.find('.people-module');
            if (peopleModule.length > 0) {
                peopleModule.after(loadingHtml);
            } else {
                rightPanel.prepend(loadingHtml);
            }
        } else {
            AJS.$('.issue-main-column').prepend(loadingHtml);
        }
        
        // Trigger animation after insertion
        setTimeout(function() {
            AJS.$('#smart-suggestions-panel').addClass('suggestions-loaded');
        }, 10);
    }

    function addModernStyles() {
        const styleId = 'jurix-suggestions-modern-styles';
        if (document.getElementById(styleId)) return;
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* Modern Suggestions Panel */
            .jurix-suggestions-module {
                background: rgba(255, 255, 255, 0.98);
                backdrop-filter: blur(10px);
                border-radius: 12px;
                box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
                border: 1px solid rgba(0, 0, 0, 0.06);
                overflow: hidden;
                margin-bottom: 20px;
                transition: all 0.3s ease;
                opacity: 0;
                transform: translateY(10px);
                position: relative;
            }
            
            .jurix-suggestions-module.suggestions-loaded {
                opacity: 1;
                transform: translateY(0);
            }
            
            .jurix-suggestions-module.minimized {
                height: auto !important;
            }
            
            .jurix-suggestions-module.minimized .jurix-suggestions-header,
            .jurix-suggestions-module.minimized .jurix-suggestions-body {
                display: none;
            }
            
            .jurix-suggestions-module.minimized .jurix-minimized-state {
                display: flex;
            }
            
            /* Header */
            .jurix-suggestions-header {
                background: linear-gradient(135deg, #0052CC 0%, #0747A6 100%);
                padding: 14px 18px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .jurix-header-left {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .jurix-icon-wrapper {
                width: 32px;
                height: 32px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
            }
            
            .jurix-suggestions-header h3 {
                margin: 0;
                color: white;
                font-size: 15px;
                font-weight: 600;
                letter-spacing: -0.2px;
            }
            
            .jurix-badge {
                background: rgba(255, 255, 255, 0.25);
                color: white;
                padding: 3px 8px;
                border-radius: 20px;
                font-size: 11px;
                font-weight: 600;
            }
            
            .jurix-header-actions {
                display: flex;
                gap: 6px;
            }
            
            .jurix-icon-btn {
                width: 28px;
                height: 28px;
                border: none;
                background: rgba(255, 255, 255, 0.15);
                border-radius: 6px;
                color: white;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
            }
            
            .jurix-icon-btn:hover {
                background: rgba(255, 255, 255, 0.25);
                transform: scale(1.05);
            }
            
            /* Body */
            .jurix-suggestions-body {
                padding: 6px;
                max-height: 500px;
                overflow-y: auto;
            }
            
            .jurix-suggestions-body::-webkit-scrollbar {
                width: 6px;
            }
            
            .jurix-suggestions-body::-webkit-scrollbar-track {
                background: transparent;
            }
            
            .jurix-suggestions-body::-webkit-scrollbar-thumb {
                background: rgba(0, 0, 0, 0.1);
                border-radius: 3px;
            }
            
            /* Suggestion Cards */
            .jurix-suggestion-card {
                background: #FAFBFC;
                border-radius: 8px;
                padding: 16px;
                margin-bottom: 6px;
                cursor: pointer;
                transition: all 0.2s ease;
                position: relative;
                border: 1px solid transparent;
                overflow: hidden;
            }
            
            .jurix-suggestion-card:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(0, 82, 204, 0.08);
                border-color: rgba(0, 82, 204, 0.15);
                background: white;
            }
            
            /* Relevance Indicator */
            .jurix-relevance-indicator {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 2px;
                background: rgba(0, 0, 0, 0.05);
                overflow: hidden;
            }
            
            .jurix-relevance-bar {
                height: 100%;
                background: #0052CC;
                transition: width 0.3s ease;
            }
            
            .jurix-relevance-indicator.high .jurix-relevance-bar {
                background: #00875A;
            }
            
            .jurix-relevance-indicator.medium .jurix-relevance-bar {
                background: #0065FF;
            }
            
            .jurix-relevance-indicator.low .jurix-relevance-bar {
                background: #6B778C;
            }
            
            /* Content */
            .jurix-suggestion-content {
                padding-top: 6px;
            }
            
            .jurix-suggestion-title {
                font-size: 14px;
                font-weight: 600;
                margin: 0 0 6px 0;
                line-height: 1.4;
            }
            
            .jurix-article-link {
                color: #172B4D;
                text-decoration: none;
                transition: color 0.2s ease;
            }
            
            .jurix-article-link:hover {
                color: #0052CC;
            }
            
            /* Meta Information */
            .jurix-suggestion-meta {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 10px;
                font-size: 12px;
                color: #6B778C;
            }
            
            .jurix-relevance-score {
                font-weight: 600;
                color: #0052CC;
            }
            
            .jurix-meta-separator {
                color: #C1C7D0;
            }
            
            .jurix-suggestion-reason {
                flex: 1;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            
            /* Preview */
            .jurix-suggestion-preview {
                font-size: 13px;
                line-height: 1.5;
                color: #5E6C84;
                margin: 0 0 12px 0;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }
            
            /* Actions - Always visible, minimal style */
            .jurix-suggestion-actions {
                display: flex;
                gap: 16px;
                align-items: center;
            }
            
            .jurix-thumb-btn {
                padding: 0;
                border: none;
                background: none;
                font-size: 12px;
                color: #6B778C;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                gap: 4px;
            }
            
            .jurix-thumb-btn:hover {
                color: #42526E;
            }
            
            .jurix-thumb-up:hover {
                color: #00875A;
            }
            
            .jurix-thumb-down:hover {
                color: #DE350B;
            }
            
            .jurix-thumb-btn.feedback-given {
                pointer-events: none;
            }
            
            .jurix-thumb-up.feedback-given {
                color: #00875A;
            }
            
            .jurix-thumb-down.feedback-given {
                color: #DE350B;
            }
            
            /* Loading State */
            .jurix-loading-state {
                padding: 80px 20px;
                text-align: center;
            }
            
            .jurix-spinner {
                display: flex;
                justify-content: center;
                gap: 4px;
                margin-bottom: 16px;
            }
            
            .jurix-spinner-dot {
                width: 8px;
                height: 8px;
                background: #0052CC;
                border-radius: 50%;
                animation: bounce 1.4s ease-in-out infinite;
            }
            
            .jurix-spinner-dot:nth-child(1) { animation-delay: 0s; }
            .jurix-spinner-dot:nth-child(2) { animation-delay: 0.2s; }
            .jurix-spinner-dot:nth-child(3) { animation-delay: 0.4s; }
            
            @keyframes bounce {
                0%, 80%, 100% {
                    transform: scale(0.8);
                    opacity: 0.5;
                }
                40% {
                    transform: scale(1.2);
                    opacity: 1;
                }
            }
            
            .jurix-loading-state p {
                color: #6B778C;
                font-size: 14px;
                margin: 0;
            }
            
            /* Minimized State */
            .jurix-minimized-state {
                display: none;
                padding: 12px 18px;
                background: linear-gradient(135deg, #0052CC 0%, #0747A6 100%);
                color: white;
                cursor: pointer;
                align-items: center;
                gap: 8px;
                font-size: 14px;
                font-weight: 500;
            }
            
            .jurix-minimized-icon {
                font-size: 18px;
            }
            
            .jurix-minimized-state:hover {
                background: linear-gradient(135deg, #0747A6 0%, #0052CC 100%);
            }
            
            /* No Suggestions State */
            .no-suggestions {
                padding: 60px 20px;
                text-align: center;
            }
            
            .no-suggestions p {
                color: #6B778C;
                font-size: 14px;
                margin: 0 0 8px 0;
            }
            
            .suggestion-help-text {
                font-size: 12px;
                color: #97A0AF;
            }
            
            /* Error State */
            .error-suggestions {
                padding: 40px 20px;
                text-align: center;
            }
            
            .error-suggestions .aui-icon {
                color: #DE350B;
                margin-bottom: 12px;
            }
            
            .error-suggestions p {
                color: #5E6C84;
                font-size: 14px;
                margin: 0 0 16px 0;
            }
            
            .retry-button {
                background: white;
                border: 1px solid #DE350B;
                color: #DE350B;
                padding: 6px 14px;
                border-radius: 6px;
                font-size: 13px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .retry-button:hover {
                background: #FFEBE6;
                transform: translateY(-1px);
            }
            
            /* Animation for cards appearing */
            .jurix-suggestion-card {
                animation: cardSlideIn 0.3s ease forwards;
                opacity: 0;
            }
            
            @keyframes cardSlideIn {
                from {
                    opacity: 0;
                    transform: translateY(10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            .jurix-suggestion-card:nth-child(1) { animation-delay: 0.05s; }
            .jurix-suggestion-card:nth-child(2) { animation-delay: 0.1s; }
            .jurix-suggestion-card:nth-child(3) { animation-delay: 0.15s; }
            .jurix-suggestion-card:nth-child(4) { animation-delay: 0.2s; }
            .jurix-suggestion-card:nth-child(5) { animation-delay: 0.25s; }
            
            /* Responsive adjustments */
            @media (max-width: 1200px) {
                .jurix-suggestions-module {
                    margin-top: 20px;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    // Update the bindFeedbackEvents function
    function bindFeedbackEvents() {
        // Helpful feedback
        AJS.$('.jurix-thumb-up').off('click').on('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const articleId = AJS.$(this).data('article-id');
            sendFeedback(articleId, true);
            
            // Visual feedback
            AJS.$(this).addClass('feedback-given');
            AJS.$(this).prop('disabled', true);
            AJS.$(this).siblings('.jurix-thumb-down').prop('disabled', true).css('opacity', '0.3');
        });
        
        // Not helpful feedback
        AJS.$('.jurix-thumb-down').off('click').on('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const articleId = AJS.$(this).data('article-id');
            sendFeedback(articleId, false);
            
            // Visual feedback
            AJS.$(this).addClass('feedback-given');
            AJS.$(this).prop('disabled', true);
            AJS.$(this).siblings('.jurix-thumb-up').prop('disabled', true).css('opacity', '0.3');
        });
        
        // Article link clicks
        AJS.$('.jurix-article-link').off('click').on('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const articleId = AJS.$(this).data('article-id');
            
            // Track click as implicit positive feedback
            sendFeedback(articleId, true);
            
            // Show article content
            AJS.flag({
                type: 'info',
                title: 'Opening Article',
                body: 'Article viewer coming soon! Article ID: ' + articleId,
                close: 'auto'
            });
        });
    }

    // Add these new functions to SmartSuggestions object
    window.SmartSuggestions = window.SmartSuggestions || {};

    SmartSuggestions.minimizePanel = function() {
        AJS.$('#smart-suggestions-panel').addClass('minimized');
        // Store minimized state in session
        sessionStorage.setItem('jurix-suggestions-minimized', 'true');
    };

    SmartSuggestions.restorePanel = function() {
        AJS.$('#smart-suggestions-panel').removeClass('minimized');
        sessionStorage.removeItem('jurix-suggestions-minimized');
    };

    SmartSuggestions.closePanel = function() {
        const panel = AJS.$('#smart-suggestions-panel');
        panel.css('opacity', '0').css('transform', 'translateY(-10px)');
        setTimeout(function() {
            panel.remove();
        }, 300);
        // Cache this preference for the session
        sessionStorage.setItem('jurix-suggestions-closed-' + currentIssueKey, 'true');
    };

    // Check if panel should be hidden on load
    function checkPanelState() {
        if (sessionStorage.getItem('jurix-suggestions-closed-' + currentIssueKey)) {
            return false; // Don't show panel
        }
        if (sessionStorage.getItem('jurix-suggestions-minimized')) {
            setTimeout(function() {
                SmartSuggestions.minimizePanel();
            }, 100);
        }
        return true;
    }
    function bindFeedbackEvents() {
        // Helpful feedback
        AJS.$('.feedback-helpful').off('click').on('click', function(e) {
            e.preventDefault();
            const articleId = AJS.$(this).data('article-id');
            sendFeedback(articleId, true);
            
            // Visual feedback
            AJS.$(this).addClass('aui-button-primary feedback-given');
            AJS.$(this).prop('disabled', true);
            AJS.$(this).siblings('.feedback-not-relevant').prop('disabled', true);
            
            // Update button text
            AJS.$(this).html('<span class="aui-icon aui-icon-small aui-iconfont-approve"></span> Thanks!');
        });
        
        // Not relevant feedback
        AJS.$('.feedback-not-relevant').off('click').on('click', function(e) {
            e.preventDefault();
            const articleId = AJS.$(this).data('article-id');
            sendFeedback(articleId, false);
            
            // Visual feedback
            AJS.$(this).addClass('aui-button-primary feedback-given');
            AJS.$(this).prop('disabled', true);
            AJS.$(this).siblings('.feedback-helpful').prop('disabled', true);
            
            // Update button text
            AJS.$(this).html('<span class="aui-icon aui-icon-small aui-iconfont-cross-circle"></span> Noted');
        });
        
        // Article link clicks
        AJS.$('.article-link').off('click').on('click', function(e) {
            e.preventDefault();
            const articleId = AJS.$(this).data('article-id');
            
            // Track click as implicit positive feedback
            sendFeedback(articleId, true);
            
            // Show article content (you can implement a modal or redirect)
            AJS.flag({
                type: 'info',
                title: 'Article Viewer',
                body: 'Article viewer not implemented yet. Article ID: ' + articleId,
                close: 'auto'
            });
        });
    }
    
    function sendFeedback(articleId, helpful) {
        const feedbackData = {
            issue_key: currentIssueKey,
            article_id: articleId,
            helpful: helpful
        };
        
        // Send directly to Python backend
        AJS.$.ajax({
            url: BACKEND_URL + '/api/article-feedback',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(feedbackData),
            success: function(response) {
                console.log('Feedback recorded successfully');
            },
            error: function(xhr, status, error) {
                console.error('Failed to record feedback:', error);
            }
        });
    }
    
    // Public methods
    return {
        init: init,
        loadSuggestions: loadSuggestions,
        clearCache: function() {
            suggestionsCache = {};
            currentIssueKey = null;
        },
        retryLoad: function() {
            retryCount = 0;
            isLoadingInProgress = false;
            if (currentIssueKey) {
                loadSuggestions(currentIssueKey);
            }
        }
    };
})();

// Initialize when ready
AJS.$(document).ready(function() {
    SmartSuggestions.init();
});
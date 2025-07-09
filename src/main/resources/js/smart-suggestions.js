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
            <div id="smart-suggestions-panel" class="module">
                <div class="mod-header">
                    <h2>
                        <span class="aui-icon aui-icon-small aui-iconfont-lightbulb"></span>
                        Suggested Articles
                        <span class="suggestion-count">(${suggestions.length})</span>
                    </h2>
                </div>
                <div class="mod-content">
                    <div class="suggestions-list">
        `;
        
        suggestions.forEach((suggestion, index) => {
            const relevanceClass = suggestion.relevance_score > 0.7 ? 'high-relevance' : 
                                  suggestion.relevance_score > 0.4 ? 'medium-relevance' : 'low-relevance';
            
            const relevancePercent = Math.round(suggestion.relevance_score * 100);
            
            html += `
                <div class="suggestion-item ${relevanceClass}" data-article-id="${suggestion.article_id}">
                    <div class="suggestion-header">
                        <h4 class="suggestion-title">
                            <a href="#" class="article-link" data-article-id="${suggestion.article_id}">
                                ${AJS.escapeHtml(suggestion.title)}
                            </a>
                        </h4>
                        <div class="suggestion-relevance">
                            <span class="aui-lozenge aui-lozenge-subtle aui-lozenge-${relevanceClass === 'high-relevance' ? 'success' : relevanceClass === 'medium-relevance' ? 'current' : 'default'}">
                                ${relevancePercent}% match
                            </span>
                        </div>
                    </div>
                    <div class="suggestion-reason">
                        <span class="aui-icon aui-icon-small aui-iconfont-info"></span>
                        ${AJS.escapeHtml(suggestion.suggestion_reason)}
                    </div>
                    <div class="suggestion-preview">
                        ${AJS.escapeHtml(suggestion.content)}
                    </div>
                    <div class="suggestion-feedback">
                        <span class="feedback-prompt">Was this helpful?</span>
                        <button class="aui-button aui-button-subtle feedback-helpful" 
                                data-article-id="${suggestion.article_id}">
                            <span class="aui-icon aui-icon-small aui-iconfont-approve"></span>
                            Helpful
                        </button>
                        <button class="aui-button aui-button-subtle feedback-not-relevant" 
                                data-article-id="${suggestion.article_id}">
                            <span class="aui-icon aui-icon-small aui-iconfont-cross-circle"></span>
                            Not Relevant
                        </button>
                    </div>
                </div>
            `;
        });
        
        html += `
                    </div>
                </div>
            </div>
        `;
        
        return html;
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
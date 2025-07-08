window.SmartSuggestions = (function() {
    'use strict';
    
    const API_BASE = AJS.contextPath() + '/rest/jurix/1.0';
    const BACKEND_URL = 'http://localhost:5001';
    let currentIssueKey = null;
    let suggestionsCache = {};
    
    function init() {
        console.log('Initializing SmartSuggestions...');
        
        // Listen for issue view events
        if (typeof JIRA !== 'undefined' && JIRA.Events) {
            JIRA.bind(JIRA.Events.NEW_CONTENT_ADDED, function(e, context) {
                checkAndLoadSuggestions();
            });
        }
        
        // Also check on page load
        AJS.$(document).ready(function() {
            // Add a slight delay to ensure issue data is loaded
            setTimeout(checkAndLoadSuggestions, 1000);
        });
    }
    
    function checkAndLoadSuggestions() {
        const issueKey = getIssueKey();
        if (issueKey && issueKey !== currentIssueKey) {
            currentIssueKey = issueKey;
            console.log('Loading suggestions for issue:', issueKey);
            loadSuggestions(issueKey);
        }
    }
    
    function getIssueKey() {
        // Multiple ways to get issue key
        if (typeof JIRA !== 'undefined' && JIRA.Issue && JIRA.Issue.getIssueKey) {
            return JIRA.Issue.getIssueKey();
        }
        
        // Try from URL
        const match = window.location.pathname.match(/browse\/([A-Z]+-\d+)/);
        if (match) {
            return match[1];
        }
        
        // Try from meta tag
        const metaTag = AJS.$('meta[name="ajs-issue-key"]');
        if (metaTag.length) {
            return metaTag.attr('content');
        }
        
        return null;
    }
    
    function loadSuggestions(issueKey) {
        // Check cache first
        if (suggestionsCache[issueKey]) {
            displaySuggestions(suggestionsCache[issueKey]);
            return;
        }
        
        // Show loading state
        showLoadingState();
        
        // Call the Jira plugin endpoint which will get the issue details
        AJS.$.ajax({
            url: API_BASE + '/suggestions/retrieve',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ issue_key: issueKey }),
            success: function(response) {
                console.log('Suggestions response:', response);
                if (response.status === 'success') {
                    suggestionsCache[issueKey] = response.suggestions;
                    displaySuggestions(response.suggestions);
                } else {
                    showErrorState();
                }
            },
            error: function(xhr, status, error) {
                console.error('Failed to load suggestions:', error);
                showErrorState();
            }
        });
    }
    
    function displaySuggestions(suggestions) {
        console.log('Displaying suggestions:', suggestions);
        
        // Remove existing panel if any
        AJS.$('#smart-suggestions-panel').remove();
        
        if (!suggestions || suggestions.length === 0) {
            showNoSuggestionsState();
            return;
        }
        
        // Create suggestions panel
        const panel = createSuggestionsPanel(suggestions);
        
        // Insert in the right sidebar or after description
        let inserted = false;
        
        // Try right panel first
        const rightPanel = AJS.$('#viewissuesidebar');
        if (rightPanel.length > 0) {
            rightPanel.prepend(panel);
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
            AJS.$('.issue-main-column').prepend(panel);
        }
        
        // Bind feedback events
        bindFeedbackEvents();
    }
    
    function showNoSuggestionsState() {
        const panel = `
            <div id="smart-suggestions-panel" class="module">
                <div class="mod-header">
                    <h2>Suggested Articles</h2>
                </div>
                <div class="mod-content">
                    <div class="no-suggestions">
                        <p>No relevant articles found for this issue.</p>
                    </div>
                </div>
            </div>
        `;
        
        AJS.$('#viewissuesidebar').prepend(panel);
    }
    
    function createSuggestionsPanel(suggestions) {
        let html = `
            <div id="smart-suggestions-panel" class="module">
                <div class="mod-header">
                    <h2>
                        <span class="aui-icon aui-icon-small aui-iconfont-lightbulb"></span>
                        Suggested Articles
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
                            <span class="aui-lozenge aui-lozenge-subtle">${relevancePercent}% match</span>
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
    
    function showLoadingState() {
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
                        <span class="aui-icon aui-icon-wait"></span>
                        Finding relevant articles...
                    </div>
                </div>
            </div>
        `;
        
        AJS.$('#viewissuesidebar').prepend(loadingHtml);
    }
    
    function showErrorState() {
        const panel = AJS.$('#smart-suggestions-panel');
        if (panel.length) {
            panel.find('.mod-content').html(`
                <div class="error-suggestions">
                    <span class="aui-icon aui-icon-small aui-iconfont-error"></span>
                    Unable to load suggestions. Please try refreshing the page.
                </div>
            `);
        }
    }
    
    function bindFeedbackEvents() {
        // Helpful feedback
        AJS.$('.feedback-helpful').off('click').on('click', function(e) {
            e.preventDefault();
            const articleId = AJS.$(this).data('article-id');
            sendFeedback(articleId, true);
            
            // Visual feedback
            AJS.$(this).addClass('aui-button-primary');
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
            AJS.$(this).addClass('aui-button-primary');
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
            alert('Article viewer not implemented yet. Article ID: ' + articleId);
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
    
    // Public API
    return {
        init: init,
        loadSuggestions: loadSuggestions,
        clearCache: function() {
            suggestionsCache = {};
        }
    };
})();

// Initialize when ready
AJS.$(document).ready(function() {
    SmartSuggestions.init();
});
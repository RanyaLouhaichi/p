window.SmartSuggestions = (function() {
    'use strict';
    
    const API_BASE = AJS.contextPath() + '/rest/jurix/1.0';
    let currentIssueKey = null;
    let suggestionsCache = {};
    
    function init() {
        // Listen for issue view events
        JIRA.bind(JIRA.Events.NEW_CONTENT_ADDED, function(e, context) {
            const issueKey = JIRA.Issue.getIssueKey();
            if (issueKey && issueKey !== currentIssueKey) {
                currentIssueKey = issueKey;
                loadSuggestions(issueKey);
            }
        });
        
        // Also check on page load
        AJS.$(document).ready(function() {
            const issueKey = JIRA.Issue.getIssueKey();
            if (issueKey) {
                currentIssueKey = issueKey;
                loadSuggestions(issueKey);
            }
        });
    }
    
    function loadSuggestions(issueKey) {
        // Check cache first
        if (suggestionsCache[issueKey]) {
            displaySuggestions(suggestionsCache[issueKey]);
            return;
        }
        
        // Show loading state
        showLoadingState();
        
        // Get issue details
        const issueData = {
            issue_key: issueKey,
            issue_summary: AJS.$('#summary-val').text() || '',
            issue_description: AJS.$('#description-val').text() || '',
            issue_type: AJS.$('.issue-link-summary .issuetype').text() || '',
            issue_status: AJS.$('#status-val .jira-issue-status-lozenge').text() || ''
        };
        
        // Call backend API
        AJS.$.ajax({
            url: 'http://localhost:5001/api/suggest-articles',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(issueData),
            success: function(response) {
                if (response.status === 'success') {
                    suggestionsCache[issueKey] = response.suggestions;
                    displaySuggestions(response.suggestions);
                }
            },
            error: function(xhr, status, error) {
                console.error('Failed to load suggestions:', error);
                showErrorState();
            }
        });
    }
    
    function displaySuggestions(suggestions) {
        // Remove existing panel if any
        AJS.$('#smart-suggestions-panel').remove();
        
        if (!suggestions || suggestions.length === 0) {
            return;
        }
        
        // Create suggestions panel
        const panel = createSuggestionsPanel(suggestions);
        
        // Insert after issue header or in sidebar
        const targetLocation = AJS.$('.issue-main-column');
        if (targetLocation.length > 0) {
            targetLocation.prepend(panel);
        } else {
            // Fallback to module
            AJS.$('.module').first().before(panel);
        }
        
        // Bind feedback events
        bindFeedbackEvents();
    }
    
    function createSuggestionsPanel(suggestions) {
        let html = `
            <div id="smart-suggestions-panel" class="module jurix-suggestions-module">
                <div class="mod-header">
                    <h3>
                        <span class="aui-icon aui-icon-small aui-iconfont-lightbulb"></span>
                        Suggested Articles
                    </h3>
                </div>
                <div class="mod-content">
                    <div class="suggestions-list">
        `;
        
        suggestions.forEach((suggestion, index) => {
            const relevanceClass = suggestion.relevance_score > 0.7 ? 'high-relevance' : 
                                  suggestion.relevance_score > 0.4 ? 'medium-relevance' : 'low-relevance';
            
            html += `
                <div class="suggestion-item ${relevanceClass}" data-article-id="${suggestion.article_id}">
                    <div class="suggestion-header">
                        <h4 class="suggestion-title">
                            <a href="#" class="article-link" data-article-id="${suggestion.article_id}">
                                ${AJS.escapeHtml(suggestion.title)}
                            </a>
                        </h4>
                        <div class="suggestion-relevance">
                            <span class="relevance-score">${Math.round(suggestion.relevance_score * 100)}% match</span>
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
        
        // Add styles
        if (!AJS.$('#smart-suggestions-styles').length) {
            AJS.$('head').append(`
                <style id="smart-suggestions-styles">
                    .jurix-suggestions-module {
                        margin-bottom: 20px;
                        border: 1px solid #ddd;
                        border-radius: 3px;
                        background: #fff;
                    }
                    
                    .jurix-suggestions-module .mod-header {
                        padding: 10px 15px;
                        background: #f5f5f5;
                        border-bottom: 1px solid #ddd;
                    }
                    
                    .jurix-suggestions-module .mod-header h3 {
                        margin: 0;
                        font-size: 14px;
                        font-weight: 600;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }
                    
                    .suggestions-list {
                        padding: 10px;
                    }
                    
                    .suggestion-item {
                        padding: 12px;
                        margin-bottom: 10px;
                        border: 1px solid #e1e4e8;
                        border-radius: 3px;
                        transition: all 0.2s ease;
                    }
                    
                    .suggestion-item:hover {
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    }
                    
                    .suggestion-item.high-relevance {
                        border-left: 3px solid #00875a;
                    }
                    
                    .suggestion-item.medium-relevance {
                        border-left: 3px solid #ff991f;
                    }
                    
                    .suggestion-item.low-relevance {
                        border-left: 3px solid #97a0af;
                    }
                    
                    .suggestion-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        margin-bottom: 8px;
                    }
                    
                    .suggestion-title {
                        margin: 0;
                        font-size: 14px;
                        font-weight: 600;
                    }
                    
                    .suggestion-title a {
                        color: #0052cc;
                        text-decoration: none;
                    }
                    
                    .suggestion-title a:hover {
                        text-decoration: underline;
                    }
                    
                    .relevance-score {
                        font-size: 12px;
                        color: #5e6c84;
                        background: #f4f5f7;
                        padding: 2px 8px;
                        border-radius: 3px;
                    }
                    
                    .suggestion-reason {
                        font-size: 12px;
                        color: #5e6c84;
                        margin-bottom: 8px;
                        display: flex;
                        align-items: center;
                        gap: 4px;
                    }
                    
                    .suggestion-preview {
                        font-size: 13px;
                        color: #172b4d;
                        margin-bottom: 12px;
                        max-height: 60px;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    }
                    
                    .suggestion-feedback {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        border-top: 1px solid #f4f5f7;
                        padding-top: 8px;
                    }
                    
                    .feedback-prompt {
                        font-size: 12px;
                        color: #5e6c84;
                        margin-right: 8px;
                    }
                    
                    .suggestion-feedback button {
                        font-size: 12px;
                        padding: 2px 8px;
                    }
                    
                    .suggestion-feedback button.feedback-given {
                        background: #e3fcef;
                        color: #00875a;
                    }
                    
                    .loading-suggestions {
                        text-align: center;
                        padding: 20px;
                        color: #5e6c84;
                    }
                    
                    .error-suggestions {
                        text-align: center;
                        padding: 20px;
                        color: #de350b;
                    }
                </style>
            `);
        }
        
        return html;
    }
    
    function showLoadingState() {
        AJS.$('#smart-suggestions-panel').remove();
        
        const loadingHtml = `
            <div id="smart-suggestions-panel" class="module jurix-suggestions-module">
                <div class="mod-header">
                    <h3>
                        <span class="aui-icon aui-icon-small aui-iconfont-lightbulb"></span>
                        Suggested Articles
                    </h3>
                </div>
                <div class="mod-content">
                    <div class="loading-suggestions">
                        <span class="aui-icon aui-icon-wait"></span>
                        Loading suggestions...
                    </div>
                </div>
            </div>
        `;
        
        AJS.$('.issue-main-column').prepend(loadingHtml);
    }
    
    function showErrorState() {
        const panel = AJS.$('#smart-suggestions-panel');
        if (panel.length) {
            panel.find('.mod-content').html(`
                <div class="error-suggestions">
                    <span class="aui-icon aui-icon-small aui-iconfont-error"></span>
                    Unable to load suggestions
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
            AJS.$(this).addClass('feedback-given');
            AJS.$(this).siblings('.feedback-not-relevant').prop('disabled', true);
        });
        
        // Not relevant feedback
        AJS.$('.feedback-not-relevant').off('click').on('click', function(e) {
            e.preventDefault();
            const articleId = AJS.$(this).data('article-id');
            sendFeedback(articleId, false);
            
            // Visual feedback
            AJS.$(this).addClass('feedback-given');
            AJS.$(this).siblings('.feedback-helpful').prop('disabled', true);
        });
        
        // Article link clicks
        AJS.$('.article-link').off('click').on('click', function(e) {
            e.preventDefault();
            const articleId = AJS.$(this).data('article-id');
            // Track click as implicit positive feedback
            sendFeedback(articleId, true);
            
            // Open article in new window/tab (implement based on your article viewer)
            window.open('/confluence/article/' + articleId, '_blank');
        });
    }
    
    function sendFeedback(articleId, helpful) {
        const feedbackData = {
            issue_key: currentIssueKey,
            article_id: articleId,
            helpful: helpful
        };
        
        AJS.$.ajax({
            url: 'http://localhost:5001/api/article-feedback',
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
    if (typeof JIRA !== 'undefined') {
        SmartSuggestions.init();
    }
});
// JURIX Live Smart Suggestions - Ultimate Edition with Advanced Features
window.JurixLiveSuggestions = (function() {
    'use strict';
    
    console.log('🚀 Loading JURIX Live Suggestions Ultimate Edition...');
    
    var panel = null;
    var isVisible = false;
    var debounceTimer = null;
    var currentQuery = '';
    var selectedIndex = -1;
    var animationFrame = null;
    
    // Enhanced mock suggestions with more data
    var mockSuggestions = [
        {
            id: 1,
            title: 'Kubernetes Deployment Best Practices',
            preview: 'Learn how to deploy containerized applications to Kubernetes with best practices for scaling and security.',
            relevance: 0.95,
            category: 'Deployment',
            tags: ['kubernetes', 'containers', 'deployment', 'devops'],
            difficulty: 'intermediate',
            readTime: '8 min',
            author: 'DevOps Team',
            lastUpdated: '2 days ago',
            views: 2341,
            helpful: 94,
            trending: true
        },
        {
            id: 2,
            title: 'CI/CD Pipeline Setup Guide',
            preview: 'Complete guide to setting up continuous integration and deployment pipelines for your projects.',
            relevance: 0.82,
            category: 'DevOps',
            tags: ['ci/cd', 'automation', 'jenkins', 'gitlab'],
            difficulty: 'beginner',
            readTime: '12 min',
            author: 'Engineering Team',
            lastUpdated: '1 week ago',
            views: 1876,
            helpful: 91,
            trending: false
        },
        {
            id: 3,
            title: 'Troubleshooting Container Issues',
            preview: 'Common container problems and solutions, including networking, storage, and performance issues.',
            relevance: 0.75,
            category: 'Troubleshooting',
            tags: ['docker', 'debugging', 'troubleshooting'],
            difficulty: 'advanced',
            readTime: '15 min',
            author: 'Support Team',
            lastUpdated: '3 days ago',
            views: 1542,
            helpful: 89,
            trending: true
        },
        {
            id: 4,
            title: 'Microservices Architecture Guide',
            preview: 'Design and implement scalable microservices with best practices for communication and data management.',
            relevance: 0.70,
            category: 'Architecture',
            tags: ['microservices', 'architecture', 'design patterns'],
            difficulty: 'advanced',
            readTime: '20 min',
            author: 'Architecture Team',
            lastUpdated: '5 days ago',
            views: 1823,
            helpful: 92,
            trending: false
        },
        {
            id: 5,
            title: 'Docker Compose Best Practices',
            preview: 'Master Docker Compose for multi-container applications with production-ready configurations.',
            relevance: 0.65,
            category: 'Containers',
            tags: ['docker', 'docker-compose', 'containers'],
            difficulty: 'intermediate',
            readTime: '10 min',
            author: 'Platform Team',
            lastUpdated: '1 day ago',
            views: 1654,
            helpful: 88,
            trending: true
        }
    ];
    
    function init() {
        console.log('Initializing JURIX Live Suggestions Ultimate...');
        createPanel();
        attachListeners();
        addKeyboardNavigation();
        console.log('✅ JURIX Live Suggestions Ultimate initialized!');
    }
    
    function createPanel() {
        // Remove existing panel
        var existing = document.getElementById('jurix-live-suggestions-panel');
        if (existing) existing.remove();
        
        // Create enhanced panel HTML
        panel = document.createElement('div');
        panel.id = 'jurix-live-suggestions-panel';
        panel.className = 'jurix-suggestions-panel';
        panel.innerHTML = [
            '<div class="jurix-suggestions-container">',
                // Enhanced header with animation
                '<div class="jurix-suggestions-header">',
                    '<div class="jurix-pulse-bg"></div>',
                    '<div class="jurix-header-content">',
                        '<div class="jurix-suggestions-icon">',
                            '<div class="jurix-icon-glow"></div>',
                            '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">',
                                '<path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>',
                            '</svg>',
                        '</div>',
                        '<div class="jurix-suggestions-title">',
                            '<h4>AI Assistant</h4>',
                            '<div class="jurix-suggestions-subtitle">',
                                '<span class="jurix-status-text">Ready to help</span>',
                                '<div class="jurix-typing-indicator" style="display: none;">',
                                    '<span></span><span></span><span></span>',
                                '</div>',
                            '</div>',
                        '</div>',
                        '<div class="jurix-header-actions">',
                            '<button class="jurix-action-btn" onclick="JurixLiveSuggestions.toggleSettings()" title="Settings">',
                                '<svg width="16" height="16" viewBox="0 0 24 24" fill="white">',
                                    '<path d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5a3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97c0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1c0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z"/>',
                                '</svg>',
                            '</button>',
                            '<button class="jurix-action-btn" onclick="JurixLiveSuggestions.minimize()" title="Minimize">',
                                '<svg width="16" height="16" viewBox="0 0 24 24" fill="white">',
                                    '<path d="M19 13H5v-2h14v2z"/>',
                                '</svg>',
                            '</button>',
                        '</div>',
                    '</div>',
                '</div>',
                
                // Search insights bar
                '<div class="jurix-insights-bar">',
                    '<div class="jurix-insight-item">',
                        '<span class="jurix-insight-label">Context:</span>',
                        '<span class="jurix-insight-value" id="context-type">General</span>',
                    '</div>',
                    '<div class="jurix-insight-item">',
                        '<span class="jurix-insight-label">Confidence:</span>',
                        '<div class="jurix-confidence-bar">',
                            '<div class="jurix-confidence-fill" id="confidence-fill" style="width: 0%"></div>',
                        '</div>',
                    '</div>',
                '</div>',
                
                // Enhanced content area
                '<div class="jurix-suggestions-content">',
                    '<div class="jurix-suggestions-empty">',
                        '<div class="jurix-empty-icon">',
                            '<svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">',
                                '<path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>',
                            '</svg>',
                        '</div>',
                        '<p>Start typing to discover relevant articles</p>',
                        '<p class="jurix-empty-hint">Try keywords like "deployment", "kubernetes", or "troubleshooting"</p>',
                    '</div>',
                '</div>',
                
                // Enhanced footer with better layout
                '<div class="jurix-suggestions-footer">',
                    '<div class="jurix-footer-left">',
                        '<div class="suggestions-count">',
                            '<span class="jurix-count-number">0</span>',
                            '<span> articles</span>',
                        '</div>',
                        '<span class="jurix-separator">•</span>',
                        '<span class="jurix-query-time">0ms</span>',
                    '</div>',
                    '<div class="jurix-footer-right">',
                        '<div class="jurix-keyboard-hint">',
                            '<kbd>↑↓</kbd> <span>Navigate</span>',
                            '<kbd>Enter</kbd> <span>Select</span>',
                        '</div>',
                        '<span class="powered-by">Powered by JURIX AI</span>',
                    '</div>',
                '</div>',
            '</div>',
            
            // Minimized state
            '<div class="jurix-minimized-badge" onclick="JurixLiveSuggestions.restore()">',
                '<span class="jurix-badge-icon">💡</span>',
                '<span class="jurix-badge-count">0</span>',
            '</div>'
        ].join('');
        
        document.body.appendChild(panel);
        addEnhancedStyles();
        startAnimations();
    }
    
    function addEnhancedStyles() {
        var styleId = 'jurix-live-suggestions-styles';
        if (document.getElementById(styleId)) return;
        
        var style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* Base Panel Styles */
            .jurix-suggestions-panel {
                position: fixed !important;
                right: 20px;
                top: 120px;
                width: 420px;
                z-index: 10000;
                opacity: 0;
                transform: translateX(20px) scale(0.95);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                pointer-events: none;
            }
            
            .jurix-suggestions-panel.active {
                opacity: 1;
                transform: translateX(0) scale(1);
                pointer-events: auto;
            }
            
            .jurix-suggestions-panel.minimized .jurix-suggestions-container {
                display: none;
            }
            
            .jurix-suggestions-panel.minimized .jurix-minimized-badge {
                display: flex;
            }
            
            /* Container with advanced glassmorphism */
            .jurix-suggestions-container {
                background: rgba(255, 255, 255, 0.92);
                backdrop-filter: blur(20px) saturate(180%);
                -webkit-backdrop-filter: blur(20px) saturate(180%);
                border: 1px solid rgba(255, 255, 255, 0.3);
                border-radius: 16px;
                box-shadow: 
                    0 10px 40px rgba(0, 0, 0, 0.12),
                    0 2px 10px rgba(0, 0, 0, 0.06),
                    inset 0 1px 0 rgba(255, 255, 255, 0.6);
                overflow: hidden;
                animation: panelAppear 0.4s ease;
            }
            
            @keyframes panelAppear {
                from {
                    opacity: 0;
                    transform: translateY(-10px) scale(0.98);
                }
                to {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }
            
            /* Enhanced Header */
            .jurix-suggestions-header {
                background: linear-gradient(135deg, #0052CC 0%, #0747A6 100%);
                color: white;
                padding: 20px;
                position: relative;
                overflow: hidden;
            }
            
            .jurix-pulse-bg {
                position: absolute;
                top: -50%;
                left: -50%;
                width: 200%;
                height: 200%;
                background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
                animation: pulse 4s ease-in-out infinite;
            }
            
            @keyframes pulse {
                0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.5; }
                50% { transform: scale(1.1) rotate(180deg); opacity: 0.3; }
            }
            
            .jurix-header-content {
                position: relative;
                display: flex;
                align-items: center;
                gap: 16px;
            }
            
            .jurix-suggestions-icon {
                width: 40px;
                height: 40px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
                animation: iconFloat 3s ease-in-out infinite;
            }
            
            @keyframes iconFloat {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-3px); }
            }
            
            .jurix-icon-glow {
                position: absolute;
                inset: -10px;
                background: radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%);
                filter: blur(10px);
                animation: glow 2s ease-in-out infinite;
            }
            
            @keyframes glow {
                0%, 100% { opacity: 0.6; }
                50% { opacity: 1; }
            }
            
            .jurix-suggestions-title {
                flex: 1;
            }
            
            .jurix-suggestions-title h4 {
                margin: 0;
                font-size: 18px;
                font-weight: 600;
                text-shadow: 0 1px 2px rgba(0,0,0,0.1);
            }
            
            .jurix-suggestions-subtitle {
                font-size: 13px;
                opacity: 0.9;
                margin-top: 4px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            /* Typing Indicator */
            .jurix-typing-indicator {
                display: inline-flex;
                gap: 3px;
            }
            
            .jurix-typing-indicator span {
                width: 4px;
                height: 4px;
                background: white;
                border-radius: 50%;
                animation: typing 1.4s infinite;
            }
            
            .jurix-typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
            .jurix-typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
            
            @keyframes typing {
                0%, 60%, 100% {
                    opacity: 0.3;
                    transform: scale(0.8) translateY(0);
                }
                30% {
                    opacity: 1;
                    transform: scale(1) translateY(-2px);
                }
            }
            
            /* Header Actions */
            .jurix-header-actions {
                display: flex;
                gap: 8px;
            }
            
            .jurix-action-btn {
                width: 32px;
                height: 32px;
                background: rgba(255, 255, 255, 0.2);
                border: none;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .jurix-action-btn:hover {
                background: rgba(255, 255, 255, 0.3);
                transform: scale(1.1);
            }
            
            /* Insights Bar */
            .jurix-insights-bar {
                background: rgba(0, 82, 204, 0.08);
                padding: 12px 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid rgba(0, 82, 204, 0.1);
            }
            
            .jurix-insight-item {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .jurix-insight-label {
                font-size: 12px;
                color: #6B778C;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .jurix-insight-value {
                font-size: 13px;
                font-weight: 600;
                color: #0052CC;
            }
            
            .jurix-confidence-bar {
                width: 80px;
                height: 6px;
                background: rgba(0, 82, 204, 0.1);
                border-radius: 3px;
                overflow: hidden;
            }
            
            .jurix-confidence-fill {
                height: 100%;
                background: linear-gradient(90deg, #0052CC, #0065FF);
                border-radius: 3px;
                transition: width 0.3s ease;
            }
            
            /* Content Area */
            .jurix-suggestions-content {
                max-height: 420px;
                overflow-y: auto;
                padding: 16px;
                scroll-behavior: smooth;
            }
            
            .jurix-suggestions-content::-webkit-scrollbar {
                width: 6px;
            }
            
            .jurix-suggestions-content::-webkit-scrollbar-track {
                background: rgba(0, 0, 0, 0.05);
                border-radius: 3px;
            }
            
            .jurix-suggestions-content::-webkit-scrollbar-thumb {
                background: rgba(0, 82, 204, 0.2);
                border-radius: 3px;
                transition: background 0.2s;
            }
            
            .jurix-suggestions-content::-webkit-scrollbar-thumb:hover {
                background: rgba(0, 82, 204, 0.3);
            }
            
            /* Suggestion Items */
            .jurix-suggestion-item {
                background: white;
                border: 1px solid #E4E7EB;
                border-radius: 12px;
                padding: 16px;
                margin-bottom: 12px;
                cursor: pointer;
                transition: all 0.2s ease;
                position: relative;
                overflow: hidden;
            }
            
            .jurix-suggestion-item::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 3px;
                background: linear-gradient(90deg, #0052CC, #0065FF);
                transform: translateX(-100%);
                transition: transform 0.3s ease;
            }
            
            .jurix-suggestion-item:hover {
                border-color: #0052CC;
                transform: translateY(-2px);
                box-shadow: 0 8px 16px rgba(0, 82, 204, 0.15);
            }
            
            .jurix-suggestion-item:hover::before {
                transform: translateX(0);
            }
            
            .jurix-suggestion-item.selected {
                border-color: #0052CC;
                background: rgba(0, 82, 204, 0.05);
            }
            
            /* Suggestion Header */
            .suggestion-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 8px;
            }
            
            .suggestion-title {
                font-size: 15px;
                font-weight: 600;
                color: #172B4D;
                margin-right: 12px;
                line-height: 1.3;
            }
            
            .suggestion-badges {
                display: flex;
                gap: 6px;
                flex-shrink: 0;
            }
            
            .suggestion-badge {
                padding: 2px 8px;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 500;
            }
            
            .badge-category {
                background: #E3FCEF;
                color: #00875A;
            }
            
            .badge-trending {
                background: #FFF0B3;
                color: #974F0C;
                display: flex;
                align-items: center;
                gap: 3px;
            }
            
            .badge-difficulty-beginner {
                background: #E3FCEF;
                color: #00875A;
            }
            
            .badge-difficulty-intermediate {
                background: #E9F2FF;
                color: #0065FF;
            }
            
            .badge-difficulty-advanced {
                background: #FFEBE6;
                color: #DE350B;
            }
            
            /* Suggestion Content */
            .suggestion-preview {
                font-size: 13px;
                color: #5E6C84;
                line-height: 1.5;
                margin-bottom: 12px;
            }
            
            .suggestion-highlight {
                background: rgba(255, 196, 0, 0.3);
                padding: 1px 3px;
                border-radius: 3px;
                font-weight: 500;
            }
            
            /* Suggestion Tags */
            .suggestion-tags {
                display: flex;
                gap: 6px;
                flex-wrap: wrap;
                margin-bottom: 12px;
            }
            
            .suggestion-tag {
                padding: 4px 8px;
                background: rgba(0, 82, 204, 0.08);
                color: #0052CC;
                border-radius: 4px;
                font-size: 11px;
                transition: all 0.2s ease;
            }
            
            .suggestion-tag:hover {
                background: rgba(0, 82, 204, 0.15);
            }
            
            /* Suggestion Meta */
            .suggestion-meta {
                display: flex;
                gap: 16px;
                font-size: 12px;
                color: #6B778C;
            }
            
            .suggestion-meta-item {
                display: flex;
                align-items: center;
                gap: 4px;
            }
            
            /* Relevance Score */
            .relevance-indicator {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 12px;
            }
            
            .relevance-score {
                display: flex;
                gap: 3px;
            }
            
            .relevance-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #DFE1E6;
                transition: all 0.3s ease;
            }
            
            .relevance-dot.active {
                background: #0052CC;
                animation: dotPulse 1s ease infinite;
            }
            
            @keyframes dotPulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.2); }
            }
            
            .relevance-label {
                font-size: 11px;
                color: #6B778C;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .relevance-percentage {
                font-weight: 600;
                color: #0052CC;
            }
            
            /* Loading State - Single Clean Spinner */
            .jurix-loading {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 80px 20px;
                min-height: 300px;
            }
            
            .jurix-spinner-container {
                margin-bottom: 24px;
            }
            
            .jurix-spinner {
                animation: rotate 2s linear infinite;
            }
            
            .jurix-spinner-circle {
                stroke: #0052CC;
                stroke-linecap: round;
                animation: dash 1.5s ease-in-out infinite;
                transform-origin: center;
            }
            
            @keyframes rotate {
                100% {
                    transform: rotate(360deg);
                }
            }
            
            @keyframes dash {
                0% {
                    stroke-dasharray: 1, 150;
                    stroke-dashoffset: 0;
                }
                50% {
                    stroke-dasharray: 90, 150;
                    stroke-dashoffset: -35;
                }
                100% {
                    stroke-dasharray: 90, 150;
                    stroke-dashoffset: -124;
                }
            }
            
            .jurix-loading-text {
                margin-top: 0;
                font-size: 14px;
                color: #6B778C;
                text-align: center;
                animation: loadingTextPulse 2s ease-in-out infinite;
            }
            
            @keyframes loadingTextPulse {
                0%, 100% { opacity: 0.6; }
                50% { opacity: 1; }
            }
            
            @keyframes rotate {
                to { transform: rotate(360deg); }
            }
            
            .jurix-loading-text {
                margin-top: 20px;
                font-size: 14px;
                color: #6B778C;
                animation: loadingText 1.5s ease infinite;
            }
            
            @keyframes loadingText {
                0%, 100% { opacity: 0.5; }
                50% { opacity: 1; }
            }
            
            /* Empty State */
            .jurix-suggestions-empty {
                text-align: center;
                padding: 60px 20px;
                color: #6B778C;
            }
            
            .jurix-empty-icon {
                margin-bottom: 16px;
                opacity: 0.3;
                animation: emptyIconFloat 3s ease-in-out infinite;
            }
            
            @keyframes emptyIconFloat {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-5px); }
            }
            
            .jurix-empty-hint {
                font-size: 12px;
                margin-top: 8px;
                opacity: 0.7;
            }
            
            /* Footer - Fixed */
            .jurix-suggestions-footer {
                background: rgba(244, 245, 247, 0.8);
                padding: 12px 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 12px;
                color: #6B778C;
                border-top: 1px solid #E4E7EB;
                position: relative;
                bottom: 0;
                left: 0;
                right: 0;
            }
            
            .jurix-footer-left,
            .jurix-footer-right {
                display: flex;
                align-items: center;
                gap: 8px;
                flex-wrap: wrap;
            }
            
            .jurix-footer-left {
                min-width: 0;
                flex: 1;
            }
            
            .jurix-footer-right {
                flex-shrink: 0;
                font-size: 11px;
            }
            
            .jurix-count-number {
                font-weight: 700;
                color: #0052CC;
                font-size: 16px;
            }
            
            .suggestions-count {
                font-size: 13px;
                color: #42526E;
                white-space: nowrap;
            }
            
            .jurix-separator {
                opacity: 0.3;
                margin: 0 4px;
            }
            
            .jurix-query-time {
                color: #00875A;
                font-weight: 500;
                white-space: nowrap;
            }
            
            .jurix-keyboard-hint {
                display: flex;
                align-items: center;
                gap: 4px;
                color: #97A0AF;
                font-size: 11px;
            }
            
            .jurix-keyboard-hint kbd {
                padding: 2px 6px;
                background: white;
                border: 1px solid #DFE1E6;
                border-radius: 3px;
                font-size: 10px;
                font-family: monospace;
                box-shadow: 0 1px 0 rgba(0,0,0,0.1);
                color: #42526E;
                font-weight: 600;
            }
            
            .powered-by {
                font-size: 11px;
                color: #97A0AF;
                white-space: nowrap;
                margin-left: 8px;
            }
            
            /* Minimized Badge */
            .jurix-minimized-badge {
                display: none;
                align-items: center;
                gap: 8px;
                background: linear-gradient(135deg, #0052CC, #0747A6);
                color: white;
                padding: 12px 16px;
                border-radius: 50px;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(0, 82, 204, 0.3);
                transition: all 0.2s ease;
            }
            
            .jurix-minimized-badge:hover {
                transform: scale(1.05);
                box-shadow: 0 6px 16px rgba(0, 82, 204, 0.4);
            }
            
            .jurix-badge-icon {
                font-size: 20px;
                animation: badgeGlow 2s ease infinite;
            }
            
            @keyframes badgeGlow {
                0%, 100% { filter: brightness(1); }
                50% { filter: brightness(1.2); }
            }
            
            .jurix-badge-count {
                background: white;
                color: #0052CC;
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: 600;
            }
            
            /* Animations for suggestion appearance */
            .jurix-suggestion-item {
                animation: suggestionSlide 0.3s ease forwards;
                opacity: 0;
            }
            
            @keyframes suggestionSlide {
                from {
                    opacity: 0;
                    transform: translateY(10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            .jurix-suggestion-item:nth-child(1) { animation-delay: 0.05s; }
            .jurix-suggestion-item:nth-child(2) { animation-delay: 0.1s; }
            .jurix-suggestion-item:nth-child(3) { animation-delay: 0.15s; }
            .jurix-suggestion-item:nth-child(4) { animation-delay: 0.2s; }
            .jurix-suggestion-item:nth-child(5) { animation-delay: 0.25s; }
        `;
        
        document.head.appendChild(style);
    }
    
    function attachListeners() {
        console.log('Attaching enhanced listeners...');
        
        // Listen to all input events
        document.addEventListener('input', handleInput, true);
        
        // Check for TinyMCE
        var checkInterval = setInterval(function() {
            var iframe = document.querySelector('iframe[id*="description"]');
            if (iframe) {
                try {
                    var iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                    if (iframeDoc && iframeDoc.body) {
                        // Monitor TinyMCE content
                        var observer = new MutationObserver(function() {
                            var text = iframeDoc.body.textContent || '';
                            handleTextChange(text);
                        });
                        
                        observer.observe(iframeDoc.body, {
                            childList: true,
                            subtree: true,
                            characterData: true
                        });
                        
                        console.log('✅ Attached to TinyMCE editor');
                        clearInterval(checkInterval);
                    }
                } catch (e) {
                    console.log('Waiting for TinyMCE...');
                }
            }
        }, 1000);
        
        // Poll for changes
        setInterval(function() {
            var textarea = document.querySelector('textarea[name="description"]');
            if (textarea && textarea.value) {
                if (textarea._lastValue !== textarea.value) {
                    textarea._lastValue = textarea.value;
                    handleTextChange(textarea.value);
                }
            }
        }, 1000);
    }
    
    function handleInput(event) {
        var target = event.target;
        if (target.name === 'description' || 
            target.id === 'description' ||
            target.classList.contains('wiki-textfield')) {
            handleTextChange(target.value);
        }
    }
    
    function handleTextChange(text) {
        currentQuery = text;
        clearTimeout(debounceTimer);
        
        // Show typing indicator immediately
        if (text.length > 2) {
            showPanel();
            showTypingIndicator();
            updateContextType(text);
        }
        
        debounceTimer = setTimeout(function() {
            updateSuggestions(text);
        }, 300);
    }
    
    function updateContextType(text) {
        var contextEl = document.getElementById('context-type');
        if (!contextEl) return;
        
        var textLower = text.toLowerCase();
        var context = 'General';
        
        if (/error|bug|issue|problem|broken|fail/.test(textLower)) {
            context = 'Troubleshooting';
        } else if (/deploy|kubernetes|k8s|container|docker/.test(textLower)) {
            context = 'Deployment';
        } else if (/pipeline|ci\/cd|jenkins|gitlab|automation/.test(textLower)) {
            context = 'DevOps';
        } else if (/\?|how|what|why|when|where/.test(textLower)) {
            context = 'Question';
        }
        
        contextEl.textContent = context;
    }
    
    function showTypingIndicator() {
        var indicator = panel.querySelector('.jurix-typing-indicator');
        var statusText = panel.querySelector('.jurix-status-text');
        if (indicator && statusText) {
            indicator.style.display = 'inline-flex';
            statusText.textContent = 'AI analyzing...';
        }
    }
    
    function hideTypingIndicator() {
        var indicator = panel.querySelector('.jurix-typing-indicator');
        var statusText = panel.querySelector('.jurix-status-text');
        if (indicator && statusText) {
            indicator.style.display = 'none';
            statusText.textContent = 'Ready to help';
        }
    }
    
    function updateSuggestions(text) {
        if (!text || text.trim().length < 3) {
            hidePanel();
            return;
        }
        
        var startTime = Date.now();
        showPanel();
        showLoadingState();
        
        // Simulate processing time
        setTimeout(function() {
            var keywords = text.toLowerCase().split(/\W+/).filter(function(w) { return w.length > 2; });
            
            // Enhanced filtering with relevance scoring
            var scored = mockSuggestions.map(function(s) {
                var score = 0;
                var matchedKeywords = [];
                
                // Check keywords in title and preview
                keywords.forEach(function(keyword) {
                    var titleMatch = s.title.toLowerCase().indexOf(keyword) >= 0;
                    var previewMatch = s.preview.toLowerCase().indexOf(keyword) >= 0;
                    var tagMatch = s.tags.some(function(tag) { return tag.indexOf(keyword) >= 0; });
                    
                    if (titleMatch) {
                        score += 3;
                        matchedKeywords.push(keyword);
                    }
                    if (previewMatch) {
                        score += 2;
                        if (!titleMatch) matchedKeywords.push(keyword);
                    }
                    if (tagMatch) {
                        score += 1;
                    }
                });
                
                // Boost for trending articles
                if (s.trending) score += 0.5;
                
                return {
                    item: s,
                    score: score,
                    relevance: Math.min(score / (keywords.length * 3), 1),
                    matchedKeywords: matchedKeywords
                };
            });
            
            // Filter and sort
            var filtered = scored
                .filter(function(s) { return s.score > 0; })
                .sort(function(a, b) { return b.score - a.score; })
                .slice(0, 5);
            
            var queryTime = Date.now() - startTime;
            displaySuggestions(filtered, queryTime);
            hideTypingIndicator();
            
            // Update confidence
            updateConfidence(filtered);
            
        }, 600 + Math.random() * 400); // Simulate variable processing time
    }
    
    function showLoadingState() {
        var content = panel.querySelector('.jurix-suggestions-content');
        if (content) {
            content.innerHTML = [
                '<div class="jurix-loading">',
                    '<div class="jurix-spinner-container">',
                        '<svg class="jurix-spinner" width="44" height="44" viewBox="0 0 44 44">',
                            '<circle class="jurix-spinner-circle" cx="22" cy="22" r="20" fill="none" stroke-width="3"></circle>',
                        '</svg>',
                    '</div>',
                    '<div class="jurix-loading-text">Searching knowledge base...</div>',
                '</div>'
            ].join('');
        }
    }
    
    function displaySuggestions(suggestions, queryTime) {
        var content = panel.querySelector('.jurix-suggestions-content');
        var countEl = panel.querySelector('.jurix-count-number');
        var timeEl = panel.querySelector('.jurix-query-time');
        var badgeCount = panel.querySelector('.jurix-badge-count');
        
        if (!content) return;
        
        // Update stats
        if (countEl) countEl.textContent = suggestions.length;
        if (timeEl) timeEl.textContent = queryTime + 'ms';
        if (badgeCount) badgeCount.textContent = suggestions.length;
        
        if (suggestions.length === 0) {
            content.innerHTML = [
                '<div class="jurix-suggestions-empty">',
                    '<div class="jurix-empty-icon">',
                        '<svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">',
                            '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>',
                        '</svg>',
                    '</div>',
                    '<p>No matching articles found</p>',
                    '<p class="jurix-empty-hint">Try different keywords or broaden your search</p>',
                '</div>'
            ].join('');
            return;
        }
        
        var html = suggestions.map(function(result, index) {
            var s = result.item;
            var relevanceLevel = Math.ceil(result.relevance * 5);
            
            // Highlight keywords
            var highlightedTitle = s.title;
            var highlightedPreview = s.preview;
            result.matchedKeywords.forEach(function(keyword) {
                var regex = new RegExp('(' + keyword + ')', 'gi');
                highlightedTitle = highlightedTitle.replace(regex, '<span class="suggestion-highlight">$1</span>');
                highlightedPreview = highlightedPreview.replace(regex, '<span class="suggestion-highlight">$1</span>');
            });
            
            return [
                '<div class="jurix-suggestion-item" data-index="' + index + '" data-id="' + s.id + '">',
                    '<div class="relevance-indicator">',
                        '<div class="relevance-score">',
                            [1,2,3,4,5].map(function(i) {
                                return '<div class="relevance-dot' + (i <= relevanceLevel ? ' active' : '') + '"></div>';
                            }).join(''),
                        '</div>',
                        '<span class="relevance-label">',
                            '<span class="relevance-percentage">' + Math.round(result.relevance * 100) + '%</span> Match',
                        '</span>',
                    '</div>',
                    '<div class="suggestion-header">',
                        '<div class="suggestion-title">' + highlightedTitle + '</div>',
                        '<div class="suggestion-badges">',
                            s.trending ? '<span class="suggestion-badge badge-trending">🔥 Trending</span>' : '',
                            '<span class="suggestion-badge badge-difficulty-' + s.difficulty + '">' + 
                                s.difficulty.charAt(0).toUpperCase() + s.difficulty.slice(1) + 
                            '</span>',
                        '</div>',
                    '</div>',
                    '<div class="suggestion-preview">' + highlightedPreview + '</div>',
                    '<div class="suggestion-tags">',
                        s.tags.map(function(tag) {
                            return '<span class="suggestion-tag">#' + tag + '</span>';
                        }).join(''),
                    '</div>',
                    '<div class="suggestion-meta">',
                        '<span class="suggestion-meta-item">',
                            '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">',
                                '<path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>',
                            '</svg>',
                            s.views.toLocaleString() + ' views',
                        '</span>',
                        '<span class="suggestion-meta-item">',
                            '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">',
                                '<path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.85-1.26l3.03-7.08c.09-.23.12-.47.12-.66v-2z"/>',
                            '</svg>',
                            s.helpful + '% helpful',
                        '</span>',
                        '<span class="suggestion-meta-item">',
                            '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">',
                                '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>',
                            '</svg>',
                            s.readTime + ' read',
                        '</span>',
                    '</div>',
                '</div>'
            ].join('');
        }).join('');
        
        content.innerHTML = html;
        
        // Add click handlers
        content.querySelectorAll('.jurix-suggestion-item').forEach(function(item) {
            item.addEventListener('click', handleSuggestionClick);
            item.addEventListener('mouseenter', function() {
                selectedIndex = parseInt(item.dataset.index);
                updateSelection();
            });
        });
    }
    
    function updateConfidence(suggestions) {
        var fillEl = document.getElementById('confidence-fill');
        if (!fillEl) return;
        
        var avgRelevance = suggestions.length > 0 
            ? suggestions.reduce(function(sum, s) { return sum + s.relevance; }, 0) / suggestions.length
            : 0;
        
        fillEl.style.width = (avgRelevance * 100) + '%';
    }
    
    function handleSuggestionClick(event) {
        var item = event.currentTarget;
        var suggestionId = item.dataset.id;
        var suggestion = mockSuggestions.find(function(s) { return s.id == suggestionId; });
        
        if (!suggestion) return;
        
        console.log('Selected article:', suggestion.title);
        
        // Insert reference into field
        var textarea = document.querySelector('textarea[name="description"]');
        var iframe = document.querySelector('iframe[id*="description"]');
        
        if (textarea) {
            var reference = '\n\n📚 Reference: ' + suggestion.title + '\n🔗 ' + suggestion.category + ' • ' + suggestion.readTime + ' read';
            textarea.value += reference;
            
            // Trigger change event
            var event = new Event('change', { bubbles: true });
            textarea.dispatchEvent(event);
        } else if (iframe) {
            try {
                var iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                if (iframeDoc && iframeDoc.body) {
                    iframeDoc.body.innerHTML += '<p>📚 Reference: <strong>' + suggestion.title + '</strong><br/>🔗 ' + suggestion.category + ' • ' + suggestion.readTime + ' read</p>';
                }
            } catch (e) {
                console.error('Could not insert into TinyMCE:', e);
            }
        }
        
        // Animate selection
        item.style.background = '#E3FCEF';
        item.style.borderColor = '#00875A';
        setTimeout(function() {
            item.style.background = '';
            item.style.borderColor = '';
        }, 500);
    }
    
    function addKeyboardNavigation() {
        document.addEventListener('keydown', function(e) {
            if (!isVisible) return;
            
            var items = panel.querySelectorAll('.jurix-suggestion-item');
            if (items.length === 0) return;
            
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
                updateSelection();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedIndex = Math.max(selectedIndex - 1, 0);
                updateSelection();
            } else if (e.key === 'Enter' && selectedIndex >= 0) {
                e.preventDefault();
                items[selectedIndex].click();
            } else if (e.key === 'Escape') {
                hidePanel();
            }
        });
    }
    
    function updateSelection() {
        var items = panel.querySelectorAll('.jurix-suggestion-item');
        items.forEach(function(item, index) {
            if (index === selectedIndex) {
                item.classList.add('selected');
                item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            } else {
                item.classList.remove('selected');
            }
        });
    }
    
    function startAnimations() {
        // Continuous glow animation for icon
        animationFrame = requestAnimationFrame(function animate() {
            // Add any continuous animations here
            animationFrame = requestAnimationFrame(animate);
        });
    }
    
    function showPanel() {
        if (panel && !isVisible) {
            panel.classList.add('active');
            panel.classList.remove('minimized');
            isVisible = true;
        }
    }
    
    function hidePanel() {
        if (panel && isVisible) {
            panel.classList.remove('active');
            isVisible = false;
            selectedIndex = -1;
        }
    }
    
    function minimize() {
        if (panel) {
            panel.classList.add('minimized');
        }
    }
    
    function restore() {
        if (panel) {
            panel.classList.remove('minimized');
        }
    }
    
    function toggleSettings() {
        console.log('Settings clicked - implement settings panel');
        alert('Settings panel coming soon! 🚀');
    }
    
    // Public API
    return {
        init: init,
        show: showPanel,
        hide: hidePanel,
        minimize: minimize,
        restore: restore,
        toggleSettings: toggleSettings,
        test: function() {
            updateSuggestions('kubernetes deployment troubleshooting');
        }
    };
})();

// Initialize when document is ready
if (typeof AJS !== 'undefined') {
    AJS.$(document).ready(function() {
        JurixLiveSuggestions.init();
    });
} else {
    // Fallback for testing
    document.addEventListener('DOMContentLoaded', function() {
        JurixLiveSuggestions.init();
    });
}
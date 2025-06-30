// JURIX AI Dashboard - Real-time Updates
window.JurixDashboard = (function() {
    'use strict';
    
    let websocket = null;
    let charts = {};
    let updateInterval = null;
    const UPDATE_FREQUENCY = 30000; // 30 seconds

    // Chart configurations
    const chartConfigs = {
        velocity: {
            type: 'line',
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        cornerRadius: 8,
                        titleFont: {
                            size: 14,
                            weight: 'bold'
                        }
                    }
                },
                scales: {
                    x: { grid: { display: false } },
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0, 0, 0, 0.05)' }
                    }
                }
            }
        },
        workload: {
            type: 'bar',
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: { grid: { display: false } },
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0, 0, 0, 0.05)' }
                    }
                }
            }
        }
    };

    function init() {
        console.log('Initializing JURIX Dashboard...');
        if (window.JurixData && window.JurixData.dashboardData) {
            updateDashboard(window.JurixData.dashboardData);
        }
        initWebSocket();
        updateInterval = setInterval(refreshDashboard, UPDATE_FREQUENCY);
        initCharts();
        bindEvents();
    }

    function initWebSocket() {
        if (!window.JurixData || !window.JurixData.websocketUrl) return;
        try {
            websocket = new WebSocket(window.JurixData.websocketUrl);
            websocket.onopen = function() {
                console.log('WebSocket connected');
                showNotification('Connected to real-time updates', 'success');
            };
            websocket.onmessage = function(event) {
                handleWebSocketMessage(JSON.parse(event.data));
            };
            websocket.onerror = function(error) {
                console.error('WebSocket error:', error);
            };
            websocket.onclose = function() {
                console.log('WebSocket disconnected');
                setTimeout(initWebSocket, 5000);
            };
        } catch (error) {
            console.error('Failed to initialize WebSocket:', error);
        }
    }

    function handleWebSocketMessage(message) {
        switch (message.type) {
            case 'metrics_update':
                updateMetrics(message.data);
                break;
            case 'prediction_update':
                updatePredictions(message.data);
                break;
            case 'article_generated':
                showArticleNotification(message.data);
                break;
            case 'activity':
                addActivityItem(message.data);
                break;
            default:
                console.log('Unknown message type:', message.type);
        }
    }

    function updateDashboard(data) {
        if (data.metrics) updateMetrics(data.metrics);
        if (data.predictions) updatePredictions(data.predictions);
        if (data.recommendations) updateRecommendations(data.recommendations);
        if (data.visualizationData) updateCharts(data.visualizationData);
    }

    function updateMetrics(metrics) {
        const velocityEl = document.getElementById('velocityMetric');
        const velocityValue = metrics.throughput || 0;
        animateValue(velocityEl, velocityValue);

        const cycleTimeEl = document.getElementById('cycleTimeMetric');
        const cycleTimeValue = metrics.cycle_time || 0;
        animateValue(cycleTimeEl, cycleTimeValue.toFixed(1) + ' days');

        const efficiencyEl = document.getElementById('efficiencyMetric');
        const efficiency = calculateEfficiency(metrics);
        animateValue(efficiencyEl, efficiency + '%');

        const activeIssuesEl = document.getElementById('activeIssuesMetric');
        const activeCount = ((metrics.bottlenecks && metrics.bottlenecks['To Do']) || 0) +
                            ((metrics.bottlenecks && metrics.bottlenecks['In Progress']) || 0);
        animateValue(activeIssuesEl, activeCount);
    }

    function updatePredictions(predictions) {
        const container = document.getElementById('predictionsList');
        container.innerHTML = '';

        if (predictions.sprint_completion) {
            const sprint = predictions.sprint_completion;
            const item = createPredictionItem(
                (sprint.probability * 100).toFixed(0) + '%',
                'Sprint Completion Probability',
                sprint.risk_level,
                sprint.reasoning
            );
            container.appendChild(item);
        }

        if (predictions.velocity_forecast) {
            const forecast = predictions.velocity_forecast;
            const nextWeekEstimate = forecast.next_week_estimate;
            const item = createPredictionItem(
                (nextWeekEstimate && nextWeekEstimate.toFixed(1)) || 'N/A',
                'Next Week Velocity Forecast',
                forecast.trend,
                forecast.insights
            );
            container.appendChild(item);
        }

        if (predictions.risks && predictions.risks.length > 0) {
            const topRisk = predictions.risks[0];
            const item = createPredictionItem(
                topRisk.severity.toUpperCase(),
                topRisk.description,
                topRisk.severity,
                topRisk.mitigation
            );
            container.appendChild(item);
        }
    }

    function createPredictionItem(value, label, riskLevel, tooltip) {
        const div = document.createElement('div');
        div.className = 'jurix-prediction-item';
        div.innerHTML = `
            <div class="jurix-prediction-probability ${getRiskClass(riskLevel)}">${value}</div>
            <div class="jurix-prediction-label" title="${tooltip || ''}">${label}</div>
        `;
        return div;
    }

    function updateRecommendations(recommendations) {
        const container = document.getElementById('recommendationsList');
        container.innerHTML = '';

        recommendations.forEach((rec, index) => {
            const div = document.createElement('div');
            div.style.cssText = 'padding: 1rem 0; border-bottom: 1px solid rgba(0,0,0,0.05);';
            div.innerHTML = `
                <div style="display: flex; align-items: start;">
                    <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; margin-right: 1rem; flex-shrink: 0;">
                        ${index + 1}
                    </div>
                    <div style="flex: 1;">
                        <p style="margin: 0; color: #1a202c; line-height: 1.6;">${rec}</p>
                    </div>
                </div>
            `;
            container.appendChild(div);
        });
    }

    // Utility functions
    function animateValue(el, value) {
        if (el) el.innerText = value;
    }

    function calculateEfficiency(metrics) {
        if (!metrics.cycle_time || !metrics.throughput) return 0;
        return Math.min(100, Math.round((metrics.throughput / metrics.cycle_time) * 100));
    }

    function getRiskClass(riskLevel) {
        if (typeof riskLevel === 'string') {
            riskLevel = riskLevel.toLowerCase();
        }
        if (riskLevel === 'high' || riskLevel === 'critical') return 'risk-high';
        if (riskLevel === 'medium') return 'risk-medium';
        return 'risk-low';
    }

    function refreshDashboard() {
        // Placeholder for dashboard refresh logic
        console.log('Refreshing dashboard...');
    }

    function updateCharts(data) {
        // Placeholder for chart update logic
        console.log('Updating charts with data:', data);
    }

    function initCharts() {
        // Placeholder for chart initialization logic
        console.log('Initializing charts...');
    }

    function bindEvents() {
        // Placeholder for UI event bindings
        console.log('Binding events...');
    }

    function showNotification(msg, type) {
        console.log(`[${type}] ${msg}`);
        // Add visual notification if needed
    }

    function showArticleNotification(data) {
        showNotification(`Article generated: ${data.title}`, 'info');
    }

    function addActivityItem(data) {
        // Placeholder for activity feed updates
        console.log('New activity:', data);
    }

    return {
        init: init
    };
})();

// Initialize when DOM is ready
if (typeof AJS !== 'undefined') {
    AJS.$(document).ready(function() {
        JurixDashboard.init();
    });
}
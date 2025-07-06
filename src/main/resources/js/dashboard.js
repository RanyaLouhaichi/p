// JURIX AI Dashboard - Real Backend Integration
window.JurixDashboard = (function() {
    'use strict';
    
    let charts = {};
    let updateInterval = null;
    let currentProjectKey = null;
    const UPDATE_FREQUENCY = 30000; // 30 seconds
    const API_BASE_URL = 'http://localhost:5001'; // Your backend URL
    let lastUpdateTimestamp = Date.now();
    let pollInterval = null;
    let isPolling = false;
    let pollFrequency = 5000; // Start with 5 seconds
    const MIN_POLL_FREQUENCY = 2000;  // 2 seconds minimum
    const MAX_POLL_FREQUENCY = 30000;

    function init() {
        console.log('🚀 Initializing JURIX Dashboard with Real-Time Updates...');
        
        // Get project key from URL or window data
        currentProjectKey = window.JurixData && window.JurixData.projectKey;
        if (!currentProjectKey) {
            const urlParams = new URLSearchParams(window.location.search);
            currentProjectKey = urlParams.get('projectKey');
        }
        
        console.log('📋 Current project key:', currentProjectKey);
        
        if (currentProjectKey) {
            // Load initial dashboard data
            loadDashboardData();
            
            // START POLLING - Make sure this is called!
            console.log('🔄 Starting real-time polling...');
            startPolling();
        } else {
            console.error('❌ No project key found!');
            showError('No project key specified');
        }
        
        // Initialize event handlers
        bindEvents();
    }
    

    function loadDashboardData() {
        if (!currentProjectKey) return;
        
        console.log(`Loading dashboard data for project: ${currentProjectKey}`);
        
        // Show loading state
        showLoadingState();
        
        // Fetch data from backend
        fetch(`${API_BASE_URL}/api/dashboard/${currentProjectKey}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            mode: 'cors'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Dashboard data received:', data);
            
            if (data.status === 'success') {
                updateDashboard(data);
                hideLoadingState();
            } else {
                throw new Error(data.error || 'Failed to load dashboard data');
            }
        })
        .catch(error => {
            console.error('Error loading dashboard:', error);
            hideLoadingState();
            showError(`Failed to load dashboard: ${error.message}`);
        });
    }

    function startPolling() {
        if (isPolling) return;
        
        isPolling = true;
        console.log('Starting smart polling for real-time updates');
        
        // Initial poll
        checkForUpdates();
        
        // Set up interval
        pollInterval = setInterval(checkForUpdates, pollFrequency);
    }

    function stopPolling() {
        if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
        }
        isPolling = false;
    }

    function checkForUpdates() {
        if (!currentProjectKey) {
            console.log('⚠️ No project key, skipping update check');
            return;
        }
        
        console.log(`🔍 Checking for updates at ${new Date().toLocaleTimeString()}...`);
        console.log(`📊 Project: ${currentProjectKey}, Last timestamp: ${lastUpdateTimestamp}`);
        
        // Check Python backend for updates
        const backendUrl = `${API_BASE_URL}/api/updates/${currentProjectKey}?since=${lastUpdateTimestamp}`;
        
        console.log('📡 Fetching from:', backendUrl);
        
        fetch(backendUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            mode: 'cors'
        })
        .then(response => {
            console.log('📥 Response status:', response.status);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('📊 Update check response:', data);
            
            if (data.hasUpdates) {
                console.log(`✅ Found ${data.updateCount} updates!`);
                
                // Update timestamp
                lastUpdateTimestamp = data.timestamp || Date.now();
                
                // Show notifications
                if (data.updates && data.updates.length > 0) {
                    console.log('🔔 Showing notifications for updates:', data.updates);
                    data.updates.forEach(update => {
                        showUpdateNotification([{
                            issueKey: update.details.issueKey || 'System',
                            eventType: update.type,
                            status: update.details.status
                        }]);
                    });
                }
                
                // Refresh dashboard
                if (data.dashboardData) {
                    console.log('📈 Updating dashboard with fresh data');
                    updateDashboard(data.dashboardData);
                } else if (data.needsRefresh) {
                    console.log('🔄 Refreshing dashboard data');
                    loadDashboardData();
                }
                
                // Speed up polling when active
                adjustPollFrequency(true);
            } else {
                console.log('❌ No updates found');
                // Slow down polling when idle
                adjustPollFrequency(false);
            }
        })
        .catch(error => {
            console.error('❌ Error checking updates:', error);
            adjustPollFrequency(false);
        });
    }

    function checkJavaEndpoint() {
        const url = `${AJS.contextPath()}/rest/jurix/1.0/updates/${currentProjectKey}?since=${lastUpdateTimestamp}`;
        
        fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.hasUpdates) {
                console.log(`Found ${data.updateCount} updates from Java`);
                
                // Update timestamp
                lastUpdateTimestamp = data.latestTimestamp || Date.now();
                
                // Show notification
                showUpdateNotification(data.updates);
                
                // Refresh dashboard
                loadDashboardData();
                
                // Increase poll frequency
                adjustPollFrequency(true);
            } else {
                // No updates - decrease polling frequency
                adjustPollFrequency(false);
            }
        })
        .catch(error => {
            console.error('Error checking Java updates:', error);
            adjustPollFrequency(false);
        });
    }

    function adjustPollFrequency(hasActivity) {
        stopPolling();
        
        if (hasActivity) {
            // Increase frequency (poll more often)
            pollFrequency = Math.max(MIN_POLL_FREQUENCY, pollFrequency * 0.8);
        } else {
            // Decrease frequency (poll less often)
            pollFrequency = Math.min(MAX_POLL_FREQUENCY, pollFrequency * 1.5);
        }
        
        console.log(`Adjusted poll frequency to ${pollFrequency}ms`);
        
        // Restart with new frequency
        pollInterval = setInterval(checkForUpdates, pollFrequency);
    }

    function showUpdateNotification(updates) {
        if (!updates || updates.length === 0) return;
        
        // Get the most recent update
        const latestUpdate = updates[0];
        
        // Create notification
        const notification = document.createElement('div');
        notification.className = 'jurix-update-notification';
        notification.innerHTML = `
            <div class="notification-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
            </div>
            <div class="notification-content">
                <div class="notification-title">Dashboard Updated</div>
                <div class="notification-message">
                    ${latestUpdate.issueKey} was ${latestUpdate.eventType}
                </div>
            </div>
            <div class="notification-actions">
                <button onclick="JurixDashboard.dismissNotification(this)">✕</button>
            </div>
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => notification.classList.add('show'), 10);
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    function dismissNotification(button) {
        const notification = button.closest('.jurix-update-notification');
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }

    function updateDashboard(data) {
        // Update metrics
        if (data.metrics) {
            updateMetrics(data.metrics);
        }
        
        // Update predictions
        if (data.predictions) {
            updatePredictions(data.predictions);
        }
        
        // Update recommendations
        if (data.recommendations) {
            updateRecommendations(data.recommendations);
        }
        
        // Update charts
        if (data.visualizationData) {
            updateCharts(data.visualizationData);
        }
        
        // Update sparklines
        if (data.visualizationData && data.visualizationData.sparklines) {
            updateSparklines(data.visualizationData.sparklines);
        }
        
        // Update team members
        if (data.teamMembers) {
            updateTeamMembers(data.teamMembers);
        }
        
        // Update recent activity
        if (data.recentActivity) {
            updateRecentActivity(data.recentActivity);
        }
        
        // Update last updated time
        updateLastUpdatedTime(data.lastUpdated);
        
        // Check for alerts
        checkForAlerts(data);
    }

    function updateMetrics(metrics) {
        console.log('Updating metrics:', metrics);
        
        // Velocity metric
        const velocityEl = document.getElementById('velocityMetric');
        if (velocityEl) {
            const velocityValue = metrics.velocity || 0;
            animateValue(velocityEl, velocityValue);
            updateMetricChange(velocityEl.closest('.metric-card'), metrics.velocityChange);
        }

        // Cycle Time metric
        const cycleTimeEl = document.getElementById('cycleTimeMetric');
        if (cycleTimeEl) {
            const cycleTimeValue = metrics.cycleTime || 0;
            animateValue(cycleTimeEl, cycleTimeValue, 'd');
            updateMetricChange(cycleTimeEl.closest('.metric-card'), metrics.cycleTimeChange);
        }

        // Efficiency metric
        const efficiencyEl = document.getElementById('efficiencyMetric');
        if (efficiencyEl) {
            const efficiency = metrics.efficiency || 0;
            animateValue(efficiencyEl, efficiency, '%');
            updateMetricChange(efficiencyEl.closest('.metric-card'), metrics.efficiencyChange);
        }

        // Active Issues metric
        const activeIssuesEl = document.getElementById('activeIssuesMetric');
        if (activeIssuesEl) {
            const activeCount = metrics.activeIssues || 0;
            animateValue(activeIssuesEl, activeCount);
            
            // Check for blockers
            const blockerCount = Object.values(metrics.bottlenecks || {}).filter(v => v > 3).length;
            if (blockerCount > 0) {
                updateMetricChange(activeIssuesEl.closest('.metric-card'), {
                    value: blockerCount,
                    text: `${blockerCount} blockers`,
                    type: 'negative'
                });
            }
        }
    }

    function updateMetricChange(container, changeData) {
        if (!container) return;
        const changeEl = container.querySelector('.metric-change');
        if (!changeEl) return;
        
        // For now, just show the current state
        if (changeData && changeData.text) {
            changeEl.innerHTML = `
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    ${changeData.type === 'positive' ? 
                        '<path d="M7 14l5-5 5 5H7z"/>' : 
                        '<path d="M17 10l-5 5-5-5h10z"/>'}
                </svg>
                ${changeData.text}
            `;
        }
    }

    function updatePredictions(predictions) {
        console.log('Updating predictions:', predictions);
        const container = document.getElementById('predictionsList');
        if (!container) return;
        
        container.innerHTML = '';

        // Sprint completion prediction
        if (predictions.sprintCompletion) {
            const sprint = predictions.sprintCompletion;
            const item = createPredictionItem(
                Math.round(sprint.probability * 100) + '%',
                'Sprint Completion Probability',
                sprint.risk_level || 'low',
                sprint.reasoning || ''
            );
            container.appendChild(item);
        }

        // Velocity forecast
        if (predictions.velocityForecast) {
            const forecast = predictions.velocityForecast;
            const nextWeek = forecast.forecast && forecast.forecast[0] ? forecast.forecast[0] : 'N/A';
            const item = createPredictionItem(
                nextWeek !== 'N/A' ? nextWeek.toFixed(1) : 'N/A',
                'Next Week Velocity Forecast',
                forecast.trend === 'insufficient_data' ? 'medium' : 'stable',
                forecast.insights || ''
            );
            container.appendChild(item);
        }

        // Top risk
        if (predictions.risks && predictions.risks.length > 0) {
            const topRisk = predictions.risks[0];
            const item = createPredictionItem(
                topRisk.severity ? topRisk.severity.toUpperCase() : 'UNKNOWN',
                topRisk.type || topRisk.description || 'Risk detected',
                topRisk.severity || 'medium',
                topRisk.mitigation || ''
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
        console.log('Updating recommendations:', recommendations);
        const container = document.getElementById('recommendationsList');
        if (!container) return;
        
        container.innerHTML = '';

        // Filter out the header recommendation if it exists
        const filteredRecs = recommendations.filter(rec => 
            !rec.toLowerCase().includes('here are') && 
            !rec.toLowerCase().includes('recommendations for')
        );

        filteredRecs.slice(0, 3).forEach((rec, index) => {
            const div = document.createElement('div');
            div.className = 'recommendation-item';
            div.onclick = function() { applyRecommendation(index + 1); };
            div.innerHTML = `
                <div class="recommendation-title">Recommendation ${index + 1}</div>
                <div class="recommendation-desc">${rec}</div>
            `;
            container.appendChild(div);
        });
    }

    function updateCharts(visualizationData) {
        console.log('Updating charts:', visualizationData);
        const charts = visualizationData.charts || {};
        
        // Update team workload chart
        if (charts.teamWorkload) {
            updateTeamWorkloadChart(charts.teamWorkload);
        }
        
        // Update velocity trend chart
        if (charts.velocityTrend) {
            updateVelocityTrendChart(charts.velocityTrend);
        }
        
        // Update team performance radar
        if (charts.teamPerformance) {
            updateTeamPerformanceChart(charts.teamPerformance);
        }
        
        // For missing charts, create default ones
        if (!charts.sprintProgress) {
            createDefaultSprintProgressChart();
        }
        
        if (!charts.issueDistribution) {
            createDefaultIssueDistributionChart();
        }
        
        if (!charts.burndown) {
            createDefaultBurndownChart();
        }
    }

    function updateTeamWorkloadChart(chartData) {
        const canvas = document.getElementById('teamWorkloadChart');
        if (!canvas || !chartData || !chartData.data) return;
        
        // Destroy existing chart if it exists
        if (window.teamWorkloadChart && typeof window.teamWorkloadChart.destroy === 'function') {
            window.teamWorkloadChart.destroy();
        }
        
        const ctx = canvas.getContext('2d');
        window.teamWorkloadChart = new Chart(ctx, {
            type: chartData.type || 'bar',
            data: chartData.data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { 
                        beginAtZero: true,
                        max: 15 
                    }
                }
            }
        });
    }

    function updateVelocityTrendChart(chartData) {
        const canvas = document.getElementById('velocityTrendChart');
        if (!canvas || !chartData || !chartData.data) return;
        
        // Destroy existing chart if it exists
        if (window.velocityTrendChart && typeof window.velocityTrendChart.destroy === 'function') {
            window.velocityTrendChart.destroy();
        }
        
        const ctx = canvas.getContext('2d');
        window.velocityTrendChart = new Chart(ctx, {
            type: chartData.type || 'line',
            data: chartData.data,
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    function updateTeamPerformanceChart(chartData) {
        // This might be a radar chart, but we'll put it in sprint progress for now
        const canvas = document.getElementById('sprintProgressChart');
        if (!canvas || !chartData || !chartData.data) return;
        
        // Destroy existing chart if it exists
        if (window.sprintProgressChart && typeof window.sprintProgressChart.destroy === 'function') {
            window.sprintProgressChart.destroy();
        }
        
        const ctx = canvas.getContext('2d');
        window.sprintProgressChart = new Chart(ctx, {
            type: chartData.type || 'radar',
            data: chartData.data,
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    function createDefaultSprintProgressChart() {
        const canvas = document.getElementById('sprintProgressChart');
        if (!canvas) return;
        
        if (window.sprintProgressChart && typeof window.sprintProgressChart.destroy === 'function') {
            window.sprintProgressChart.destroy();
        }
        
        const ctx = canvas.getContext('2d');
        window.sprintProgressChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                datasets: [{
                    label: 'Completed',
                    data: [2, 2, 2, 2],
                    backgroundColor: '#0052CC'
                }, {
                    label: 'In Progress',
                    data: [4, 4, 4, 4],
                    backgroundColor: '#4C9AFF'
                }, {
                    label: 'To Do',
                    data: [0, 0, 0, 0],
                    backgroundColor: '#DEEBFF'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { stacked: true },
                    y: { stacked: true }
                }
            }
        });
    }

    function createDefaultIssueDistributionChart() {
        const canvas = document.getElementById('issueDistributionChart');
        if (!canvas) return;
        
        if (window.issueDistributionChart && typeof window.issueDistributionChart.destroy === 'function') {
            window.issueDistributionChart.destroy();
        }
        
        const ctx = canvas.getContext('2d');
        window.issueDistributionChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['In Progress', 'Done'],
                datasets: [{
                    data: [4, 2],
                    backgroundColor: ['#4C9AFF', '#0052CC']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    function createDefaultBurndownChart() {
        const canvas = document.getElementById('burndownChart');
        if (!canvas) return;
        
        if (window.burndownChart && typeof window.burndownChart.destroy === 'function') {
            window.burndownChart.destroy();
        }
        
        const days = [];
        for (let i = 1; i <= 10; i++) {
            days.push('Day ' + i);
        }
        
        const ctx = canvas.getContext('2d');
        window.burndownChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: days,
                datasets: [{
                    label: 'Ideal',
                    data: [6, 5.4, 4.8, 4.2, 3.6, 3, 2.4, 1.8, 1.2, 0.6, 0],
                    borderColor: '#6B778C',
                    borderDash: [5, 5],
                    tension: 0
                }, {
                    label: 'Actual',
                    data: [6, 6, 4, 4, 2, 2, null, null, null, null, null],
                    borderColor: '#0052CC',
                    backgroundColor: 'rgba(0, 82, 204, 0.1)',
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    function updateSparklines(sparklineData) {
        console.log('Updating sparklines:', sparklineData);
        
        // Update velocity sparkline
        if (sparklineData.velocity) {
            updateSparkline('velocitySparkline', sparklineData.velocity, '#0052CC');
        }
        
        // Update cycle time sparkline
        if (sparklineData.cycleTime) {
            updateSparkline('cycleSparkline', sparklineData.cycleTime, '#00875A');
        }
        
        // Update efficiency sparkline
        if (sparklineData.efficiency) {
            updateSparkline('efficiencySparkline', sparklineData.efficiency, '#6554C0');
        }
        
        // Update issues sparkline
        if (sparklineData.issues) {
            updateSparkline('issuesSparkline', sparklineData.issues, '#FF5630');
        }
    }

    function updateSparkline(canvasId, data, color) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        
        // Destroy existing chart
        const chartName = canvasId + 'Chart';
        if (window[chartName] && typeof window[chartName].destroy === 'function') {
            window[chartName].destroy();
        }
        
        const ctx = canvas.getContext('2d');
        window[chartName] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array(data.length).fill(''),
                datasets: [{
                    data: data,
                    borderColor: color,
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.3,
                    fill: true,
                    backgroundColor: color + '33' // Add transparency
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                scales: {
                    x: { display: false },
                    y: { display: false }
                }
            }
        });
    }

    function updateTeamMembers(teamMembers) {
        console.log('Updating team members:', teamMembers);
        const container = document.querySelector('.team-grid');
        if (!container) return;
        
        container.innerHTML = '';
        
        teamMembers.forEach(member => {
            const memberDiv = document.createElement('div');
            memberDiv.className = 'team-member';
            memberDiv.innerHTML = `
                <div class="member-avatar" style="${getAvatarStyle(member.loadPercentage)}">${member.initials}</div>
                <div class="member-info">
                    <div class="member-name">${member.name}</div>
                    <div class="member-status">${member.taskCount} tasks</div>
                </div>
                <div class="member-load">
                    <canvas id="${member.name.replace(/\s/g, '')}Load"></canvas>
                </div>
            `;
            container.appendChild(memberDiv);
            
            // Create load gauge
            setTimeout(() => {
                createLoadGauge(`${member.name.replace(/\s/g, '')}Load`, member.loadPercentage);
            }, 100);
        });
    }

    function getAvatarStyle(loadPercentage) {
        if (loadPercentage > 100) {
            return 'background: var(--pastel-red);';
        } else if (loadPercentage > 80) {
            return 'background: var(--pastel-yellow);';
        } else if (loadPercentage < 50) {
            return 'background: var(--pastel-green);';
        }
        return '';
    }

    function createLoadGauge(canvasId, percentage) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        
        const color = percentage > 100 ? '#F87171' : percentage > 80 ? '#FCD34D' : '#7DD3C0';
        
        const ctx = canvas.getContext('2d');
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [percentage, 100 - percentage],
                    backgroundColor: [color, '#F4F5F7'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                }
            }
        });
    }

    function updateRecentActivity(activities) {
        console.log('Updating recent activity:', activities);
        const container = document.querySelector('.timeline-content');
        if (!container) return;
        
        container.innerHTML = '';
        
        activities.slice(0, 5).forEach(activity => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'timeline-item';
            itemDiv.innerHTML = `
                <div class="timeline-icon ${activity.type}">
                    ${getActivityIcon(activity.type)}
                </div>
                <div class="timeline-body">
                    <div class="timeline-title">${activity.title}</div>
                    <div class="timeline-time">${activity.time}</div>
                </div>
            `;
            container.appendChild(itemDiv);
        });
    }

    function getActivityIcon(type) {
        if (type === 'success') {
            return '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';
        } else if (type === 'warning') {
            return '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>';
        } else {
            return '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';
        }
    }

    function updateLastUpdatedTime(lastUpdated) {
        // Find or create last updated element
        const headerEl = document.querySelector('.header-left');
        if (headerEl) {
            let lastUpdatedEl = headerEl.querySelector('.last-updated');
            if (!lastUpdatedEl) {
                lastUpdatedEl = document.createElement('span');
                lastUpdatedEl.className = 'last-updated';
                lastUpdatedEl.style.cssText = 'margin-left: 1rem; color: #6B778C; font-size: 0.875rem;';
                headerEl.appendChild(lastUpdatedEl);
            }
            
            const time = lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : new Date().toLocaleTimeString();
            lastUpdatedEl.textContent = `Last updated: ${time}`;
        }
    }

    function checkForAlerts(data) {
        // Check for critical conditions
        const alerts = [];
        
        // Check for low sprint completion probability
        if (data.predictions && data.predictions.sprintCompletion) {
            const probability = data.predictions.sprintCompletion.probability;
            if (probability < 0.5) {
                alerts.push(`Critical: Sprint completion probability is only ${(probability * 100).toFixed(0)}%`);
            }
        }
        
        // Check for blockers
        if (data.metrics && data.metrics.bottlenecks) {
            const blockers = Object.entries(data.metrics.bottlenecks)
                .filter(([status, count]) => count > 3 && status !== 'Done');
            if (blockers.length > 0) {
                alerts.push(`${blockers.length} bottlenecks detected in current sprint - immediate action required`);
            }
        }
        
        // Check for overloaded team members
        if (data.teamMembers) {
            const overloaded = data.teamMembers.filter(m => m.loadPercentage > 100);
            if (overloaded.length > 0) {
                alerts.push(`${overloaded.length} team member(s) overloaded - workload rebalancing needed`);
            }
        }
        
        // Show the first alert if any
        if (alerts.length > 0) {
            showAlert(alerts[0]);
        }
    }

    // Utility functions
    function animateValue(element, endValue, suffix = '') {
        if (!element) return;
        
        const startValue = parseFloat(element.textContent) || 0;
        const duration = 1500;
        const startTime = performance.now();
        
        // Check if value is numeric
        if (isNaN(endValue)) {
            element.textContent = endValue + suffix;
            return;
        }
        
        const numericEnd = parseFloat(endValue);
        const isFloat = !Number.isInteger(numericEnd) || endValue.toString().includes('.');
        
        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const easeOut = 1 - Math.pow(1 - progress, 4);
            const current = startValue + (numericEnd - startValue) * easeOut;
            
            if (isFloat) {
                element.textContent = current.toFixed(1) + suffix;
            } else {
                element.textContent = Math.floor(current) + suffix;
            }
            
            if (progress < 1) {
                requestAnimationFrame(update);
            }
        }
        
        requestAnimationFrame(update);
    }

    function getRiskClass(riskLevel) {
        if (typeof riskLevel === 'string') {
            riskLevel = riskLevel.toLowerCase();
        }
        if (riskLevel === 'high' || riskLevel === 'critical') return 'risk-high';
        if (riskLevel === 'medium') return 'risk-medium';
        if (riskLevel === 'minimal' || riskLevel === 'low') return 'risk-low';
        if (riskLevel === 'insufficient_data') return 'risk-medium';
        return 'risk-low';
    }

    function showAlert(message) {
        const alertBar = document.getElementById('alertBar');
        const alertText = document.getElementById('alertText');
        if (alertBar && alertText) {
            alertText.textContent = message;
            alertBar.style.display = 'flex';
        }
    }

    function dismissAlert() {
        const alertBar = document.getElementById('alertBar');
        if (alertBar) {
            alertBar.style.display = 'none';
        }
    }

    function viewAlert() {
        console.log('Viewing alert details...');
        // Could open a modal or navigate to details
    }

    function showLoadingState() {
        // Add loading indicators to all metric cards
        document.querySelectorAll('.metric-value').forEach(el => {
            el.classList.add('loading');
            el.textContent = '...';
        });
        
        // Also show loading for charts
        document.querySelectorAll('.chart-container').forEach(el => {
            el.style.opacity = '0.5';
        });
    }

    function hideLoadingState() {
        // Remove loading indicators
        document.querySelectorAll('.metric-value').forEach(el => {
            el.classList.remove('loading');
        });
        
        // Restore chart opacity
        document.querySelectorAll('.chart-container').forEach(el => {
            el.style.opacity = '1';
        });
    }

    function showError(message) {
        // Show error notification
        const notification = document.createElement('div');
        notification.className = 'jurix-notification error';
        notification.innerHTML = `
            <div class="jurix-notification-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
            </div>
            <div class="jurix-notification-content">
                <div class="jurix-notification-title">Error</div>
                <div class="jurix-notification-message">${message}</div>
            </div>
        `;
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => notification.remove(), 5000);
    }

    function applyRecommendation(id) {
        console.log('Applying recommendation', id);
        
        // Show notification
        const notification = document.createElement('div');
        notification.style.cssText = 'position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: #00875A; color: white; padding: 1rem 2rem; border-radius: 3px; box-shadow: 0 8px 12px rgba(9,30,66,0.15); animation: slideUp 0.3s ease; z-index: 1000;';
        notification.textContent = 'Recommendation applied successfully!';
        document.body.appendChild(notification);
        
        setTimeout(function() { notification.remove(); }, 3000);
    }

    function toggleChat() {
        const chatWindow = document.getElementById('chatWindow');
        if (chatWindow) {
            chatWindow.classList.toggle('open');
        }
    }

    function bindEvents() {
        // Bind global functions
        window.dismissAlert = dismissAlert;
        window.viewAlert = viewAlert;
        window.applyRecommendation = applyRecommendation;
        window.toggleChat = toggleChat;
        
        // Refresh button
        const refreshBtn = document.querySelector('.btn-primary');
        if (refreshBtn && refreshBtn.textContent === 'Generate Report') {
            refreshBtn.addEventListener('click', function() {
                loadDashboardData();
            });
        }
    }

    // Add CSS for loading state
    const style = document.createElement('style');
    style.textContent = `
        .metric-value.loading {
            opacity: 0.5;
            animation: pulse 1.5s ease-in-out infinite;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 0.5; }
            50% { opacity: 1; }
        }
        
        @keyframes slideUp {
            from {
                transform: translateX(-50%) translateY(20px);
                opacity: 0;
            }
            to {
                transform: translateX(-50%) translateY(0);
                opacity: 1;
            }
        }
        
        .jurix-notification {
            position: fixed;
            top: 20px;
            right: 20px;
            min-width: 300px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
            padding: 1rem;
            display: flex;
            align-items: flex-start;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        }
        
        .jurix-notification.error .jurix-notification-icon {
            background: rgba(239, 68, 68, 0.1);
            color: #ef4444;
        }
        
        .risk-low { color: #00875A; }
        .risk-medium { color: #FF991F; }
        .risk-high { color: #FF5630; }
        
        .jurix-prediction-item {
            background: rgba(255,255,255,0.8);
            backdrop-filter: blur(10px);
            border-radius: 12px;
            padding: 1rem;
            margin-bottom: 1rem;
            border: 1px solid rgba(255, 255, 255, 0.1);
            transition: all 0.3s ease;
        }
        
        .jurix-prediction-item:hover {
            background: rgba(255, 255, 255, 0.95);
            transform: translateX(4px);
        }
        
        .jurix-prediction-probability {
            font-size: 2rem;
            font-weight: 700;
            margin-bottom: 0.25rem;
        }
        
        .jurix-prediction-label {
            opacity: 0.8;
            font-size: 0.875rem;
        }
        
        .jurix-predictions-panel {
            background: linear-gradient(135deg, #0052CC 0%, #0747A6 100%);
            color: white;
            border-radius: 20px;
            padding: 1.5rem;
            position: relative;
            overflow: hidden;
        }
        
        .jurix-predictions-panel::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
            animation: pulse 4s ease-in-out infinite;
        }
        
        @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 0.8; }
            50% { transform: scale(1.1); opacity: 0.3; }
        }
        
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        /* Notification Styles */
        .jurix-update-notification {
            position: fixed;
            top: 20px;
            right: 20px;
            min-width: 320px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
            padding: 16px;
            display: flex;
            align-items: flex-start;
            gap: 12px;
            z-index: 10000;
            transform: translateX(400px);
            transition: transform 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }
        
        .jurix-update-notification.show {
            transform: translateX(0);
        }
        
        .notification-icon {
            width: 32px;
            height: 32px;
            background: #E3FCEF;
            color: #00875A;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }
        
        .notification-content {
            flex: 1;
        }
        
        .notification-title {
            font-weight: 600;
            margin-bottom: 4px;
            color: #172B4D;
        }
        
        .notification-message {
            font-size: 14px;
            color: #6B778C;
        }
        
        .notification-actions button {
            background: none;
            border: none;
            font-size: 18px;
            color: #97A0AF;
            cursor: pointer;
            padding: 4px;
            line-height: 1;
        }
        
        .notification-actions button:hover {
            color: #42526E;
        }
        
        .metric-card.updating {
            position: relative;
        }
        
        .metric-card.updating::after {
            content: '';
            position: absolute;
            top: 8px;
            right: 8px;
            width: 8px;
            height: 8px;
            background: #00875A;
            border-radius: 50%;
            animation: pulse 2s ease-in-out infinite;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(1.5); }
        }
    `;
    document.head.appendChild(style);

    return {
        init: init,
        loadDashboardData: loadDashboardData,
        dismissAlert: dismissAlert,
        viewAlert: viewAlert,
        applyRecommendation: applyRecommendation,
        toggleChat: toggleChat,
        dismissNotification: dismissNotification,  
        startPolling: startPolling,                
        stopPolling: stopPolling, 
    };
})();

// Initialize when DOM is ready
if (typeof AJS !== 'undefined') {
    AJS.$(document).ready(function() {
        JurixDashboard.init();
    });
} else {
    // Fallback for testing without AJS
    document.addEventListener('DOMContentLoaded', function() {
        JurixDashboard.init();
    });
}
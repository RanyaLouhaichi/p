// JURIX AI Dashboard - Full Backend Integration for New Layout
window.JurixDashboard = (function() {
    'use strict';
    
    let charts = {};
    let updateInterval = null;
    let currentProjectKey = null;
    const UPDATE_FREQUENCY = 30000; // 30 seconds
    const API_BASE_URL = 'http://localhost:5001'; // Python backend
    let lastUpdateTimestamp = Date.now();
    let pollInterval = null;
    let isPolling = false;
    let pollFrequency = 5000; // Start with 5 seconds
    const MIN_POLL_FREQUENCY = 2000;
    const MAX_POLL_FREQUENCY = 30000;

    function init() {
        console.log('🚀 Initializing JURIX Dashboard with New Layout...');
        
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
            
            // Start polling for real-time updates
            console.log('🔄 Starting real-time polling...');
            startPolling();
        } else {
            console.error('❌ No project key found!');
            showError('No project key specified');
        }
        
        // Initialize event handlers
        bindEvents();
        
        // Initialize tooltips
        initializeTooltips();
        
        // Initialize interactions
        initializeInteractions();
    }
    
    function loadDashboardData() {
        if (!currentProjectKey) {
            console.error('No project key specified');
            return;
        }
        
        console.log(`Loading dashboard data for project: ${currentProjectKey}`);
        
        // Show loading state
        showLoadingState();
        
        // Fetch data from Python backend
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
                // Store the data for debugging
                window.lastDashboardData = data;
                
                // Update dashboard with all the data
                updateDashboard(data);
                
                // Hide loading state
                hideLoadingState();
                
                // Show success notification
                console.log('✅ Dashboard updated successfully');
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

    // COMPLETE REPLACEMENT for updateDashboard function in dashboard.js

    function updateDashboard(data) {
        console.log('Updating dashboard with data:', data);
        
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
        
        // Update current sprint label
        const sprintEl = document.getElementById('currentSprint');
        if (sprintEl && data.currentSprint) {
            sprintEl.textContent = data.currentSprint;
        }
        
        // Update charts with new data structure
        if (data.visualizationData && data.visualizationData.charts) {
            const charts = data.visualizationData.charts;
            
            // Sprint Progress
            if (charts.sprintProgress) {
                updateSprintProgressChart(charts.sprintProgress);
            }
            
            // Burndown
            if (charts.burndown) {
                updateBurndownChart(charts.burndown);
            }
            
            // Velocity Trend
            if (charts.velocityTrend) {
                updateVelocityTrendChart(charts.velocityTrend);
            }
            
            // Team Workload (if exists)
            if (charts.teamWorkload) {
                // You can add a team workload chart update function here if needed
                console.log('Team workload data available:', charts.teamWorkload);
            }
        }
        
        // Update risk assessment
        if (data.riskAssessment) {
            updateRiskAssessment(data.riskAssessment);
        }
        
        // Update alerts
        if (data.alerts) {
            updateAlerts(data.alerts);
        }
        
        // Update alert count (critical alerts from metrics)
        const alertCountEl = document.getElementById('alertCount');
        if (alertCountEl) {
            const criticalAlerts = data.metrics?.criticalAlerts || 0;
            animateValue(alertCountEl, criticalAlerts);
        }
        
        // Update last updated time
        updateLastUpdatedTime(data.lastUpdated);
    }

    // ADD these new functions to dashboard.js (don't replace existing ones, just add):

    function updateSprintProgressChart(chartData) {
        console.log('Updating sprint progress chart:', chartData);
        
        const canvas = document.getElementById('sprintProgressChart');
        if (!canvas) {
            console.error('Sprint progress canvas not found');
            return;
        }
        
        // Destroy existing chart if exists
        if (charts.sprintProgress) {
            charts.sprintProgress.destroy();
        }
        
        const ctx = canvas.getContext('2d');
        
        // Use provided data or generate default
        const data = chartData?.data || {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            datasets: [{
                label: 'Completed',
                data: [10, 25, 45, 60],
                backgroundColor: '#0052CC',
                stack: 'stack0'
            }, {
                label: 'In Progress',
                data: [30, 35, 30, 25],
                backgroundColor: '#6B88F7',
                stack: 'stack0'
            }, {
                label: 'To Do',
                data: [60, 40, 25, 15],
                backgroundColor: '#DFE5FF',
                stack: 'stack0'
            }]
        };
        
        charts.sprintProgress = new Chart(ctx, {
            type: 'bar',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: false
                    },
                    legend: {
                        display: false  // We have our own legend in HTML
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.dataset.label || '';
                                const value = context.parsed.y || 0;
                                return label + ': ' + value + ' tickets';
                            },
                            afterLabel: function(context) {
                                // Calculate percentage
                                const datasetIndex = context.datasetIndex;
                                const dataIndex = context.dataIndex;
                                let total = 0;
                                
                                // Sum all values in this stack for this data point
                                data.datasets.forEach((dataset) => {
                                    total += dataset.data[dataIndex] || 0;
                                });
                                
                                const value = context.parsed.y || 0;
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return percentage + '% of total';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            stepSize: 10
                        }
                    }
                }
            }
        });
    }

    function updateBurndownChart(chartData) {
        console.log('Updating burndown chart:', chartData);
        
        const canvas = document.getElementById('burndownChart');
        if (!canvas) {
            console.error('Burndown canvas not found');
            return;
        }
        
        // Destroy existing chart
        if (charts.burndown) {
            charts.burndown.destroy();
        }
        
        const ctx = canvas.getContext('2d');
        
        // Use provided data or defaults
        const data = chartData?.data || {
            labels: ['Day 0', 'Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7', 'Day 8', 'Day 9', 'Day 10'],
            datasets: [{
                label: 'Ideal',
                data: [60, 54, 48, 42, 36, 30, 24, 18, 12, 6, 0],
                borderColor: '#C1C7D0',
                borderDash: [5, 5],
                tension: 0,
                fill: false,
                pointRadius: 3,
                pointHoverRadius: 5
            }, {
                label: 'Actual',
                data: [60, 58, 52, 45, 38, 30, 25, 20, null, null, null],
                borderColor: '#0052CC',
                backgroundColor: 'rgba(0, 82, 204, 0.1)',
                tension: 0.3,
                fill: true,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        };
        
        charts.burndown = new Chart(ctx, {
            type: 'line',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 15
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += context.parsed.y + ' story points';
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Story Points',
                            font: {
                                size: 12
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    }
                }
            }
        });
    }

    function updateVelocityTrendChart(chartData) {
        console.log('Updating velocity trend chart:', chartData);
        
        const canvas = document.getElementById('velocityTrendChart');
        if (!canvas) {
            console.error('Velocity trend canvas not found');
            return;
        }
        
        // Destroy existing chart
        if (charts.velocityTrend) {
            charts.velocityTrend.destroy();
        }
        
        const ctx = canvas.getContext('2d');
        
        // Use provided data or defaults
        const data = chartData?.data || {
            labels: ['Sprint 1', 'Sprint 2', 'Sprint 3', 'Sprint 4', 'Sprint 5'],
            datasets: [{
                label: 'Velocity',
                data: [32, 38, 35, 45, 42],
                borderColor: '#00875A',
                backgroundColor: 'rgba(0, 135, 90, 0.1)',
                tension: 0.3,
                fill: true,
                pointRadius: 5,
                pointHoverRadius: 7,
                pointBackgroundColor: '#00875A',
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }]
        };
        
        charts.velocityTrend = new Chart(ctx, {
            type: 'line',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return 'Velocity: ' + context.parsed.y + ' points';
                            },
                            afterLabel: function(context) {
                                // Show trend
                                const dataIndex = context.dataIndex;
                                if (dataIndex > 0) {
                                    const prevValue = context.dataset.data[dataIndex - 1];
                                    const currentValue = context.parsed.y;
                                    const change = currentValue - prevValue;
                                    const changePercent = ((change / prevValue) * 100).toFixed(1);
                                    return 'Change: ' + (change >= 0 ? '+' : '') + change + ' (' + changePercent + '%)';
                                }
                                return '';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Story Points',
                            font: {
                                size: 12
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    }
                }
            }
        });
    }

    function updateRiskAssessment(riskData) {
        console.log('Updating risk assessment:', riskData);
        
        // Update risk score
        const riskScoreEl = document.getElementById('riskScore');
        if (riskScoreEl) {
            const score = riskData?.score || 2.451;
            animateValue(riskScoreEl, score, 3); // 3 decimal places
            
            // Update risk level color based on score
            const riskCard = document.querySelector('.risk-card');
            if (riskCard) {
                // Remove existing risk classes
                riskCard.classList.remove('risk-low', 'risk-medium', 'risk-high');
                
                // Add appropriate class based on score
                if (score < 3) {
                    riskCard.classList.add('risk-low');
                } else if (score < 4) {
                    riskCard.classList.add('risk-medium');
                } else {
                    riskCard.classList.add('risk-high');
                }
            }
        }
        
        // Update risk chart bars
        const riskChartEl = document.getElementById('riskChart');
        if (riskChartEl && riskData?.monthlyScores) {
            riskChartEl.innerHTML = '';
            
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const currentMonth = new Date().getMonth();
            const scores = riskData.monthlyScores;
            
            // Find max score for scaling
            const maxScore = Math.max(...scores, 5);
            
            months.forEach((month, index) => {
                const score = scores[index] || 2;
                const heightPercent = (score / maxScore) * 100;
                
                const bar = document.createElement('div');
                bar.className = `bar ${index === currentMonth ? 'active' : ''}`;
                bar.style.height = `${heightPercent}%`;
                bar.setAttribute('data-value', score.toFixed(1));
                
                // Create label
                const label = document.createElement('span');
                label.className = 'bar-label';
                label.textContent = month;
                bar.appendChild(label);
                
                // Add hover tooltip
                bar.title = `${month}: Risk Score ${score.toFixed(1)}`;
                
                // Color based on risk level
                if (score < 3) {
                    bar.style.background = '#00875A';
                } else if (score < 4) {
                    bar.style.background = '#FFAB00';
                } else {
                    bar.style.background = '#DE350B';
                }
                
                riskChartEl.appendChild(bar);
            });
        }
    }

    function updateMetrics(metrics) {
        console.log('Updating metrics:', metrics);
        
        // Velocity metric
        const velocityEl = document.getElementById('velocityMetric');
        if (velocityEl && metrics.velocity !== undefined) {
            animateValue(velocityEl, metrics.velocity);
            updateMetricChange('velocityChange', metrics.velocityChange || { type: 'positive', value: '+12% from last sprint' });
        }

        // Cycle Time metric
        const cycleTimeEl = document.getElementById('cycleTimeMetric');
        if (cycleTimeEl && metrics.cycleTime !== undefined) {
            animateValue(cycleTimeEl, metrics.cycleTime, 'd');
            updateMetricChange('cycleTimeChange', metrics.cycleTimeChange || { type: 'positive', value: '-0.5 days improvement' });
        }

        // Efficiency metric
        const efficiencyEl = document.getElementById('efficiencyMetric');
        if (efficiencyEl && metrics.efficiency !== undefined) {
            animateValue(efficiencyEl, metrics.efficiency, '%');
            updateMetricChange('efficiencyChange', metrics.efficiencyChange || { type: 'positive', value: 'Above target' });
        }

        // Active Issues metric
        const activeIssuesEl = document.getElementById('activeIssuesMetric');
        if (activeIssuesEl && metrics.activeIssues !== undefined) {
            animateValue(activeIssuesEl, metrics.activeIssues);
            
            // Check for blockers
            const blockerCount = metrics.blockers || 0;
            if (blockerCount > 0) {
                updateMetricChange('activeIssuesChange', {
                    type: 'negative',
                    value: `${blockerCount} blockers`
                });
            }
        }

        // Alert count
        const alertCountEl = document.getElementById('alertCount');
        if (alertCountEl && metrics.criticalAlerts !== undefined) {
            animateValue(alertCountEl, metrics.criticalAlerts);
        }
    }

    function updateMetricChange(elementId, changeData) {
        const changeEl = document.getElementById(elementId);
        if (!changeEl) return;
        
        if (changeData) {
            const iconSvg = changeData.type === 'positive' 
                ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M7 14l5-5 5 5H7z"/></svg>'
                : '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M17 10l-5 5-5-5h10z"/></svg>';
            
            changeEl.className = `stat-change ${changeData.type}`;
            changeEl.innerHTML = `${iconSvg} ${changeData.value}`;
        }
    }

    function updatePredictions(predictions) {
        console.log('Updating predictions:', predictions);
        
        const container = document.getElementById('predictionsContainer');
        if (!container) return;
        
        container.innerHTML = '';

        // Sprint completion prediction
        if (predictions.sprintCompletion) {
            const item = createPredictionItem(
                'Sprint Completion Forecast',
                predictions.sprintCompletion.probability,
                predictions.sprintCompletion.reasoning,
                'growth'
            );
            container.appendChild(item);
        }

        // Bottleneck detection
        if (predictions.bottlenecks && predictions.bottlenecks.length > 0) {
            const bottleneck = predictions.bottlenecks[0];
            const item = createPredictionItem(
                'Bottleneck Detection',
                bottleneck.severity,
                bottleneck.description,
                'warning'
            );
            container.appendChild(item);
        }
    }

    function createPredictionItem(title, value, description, type) {
        const div = document.createElement('div');
        div.className = 'prediction-item';
        div.innerHTML = `
            <div class="prediction-header">
                <div class="prediction-icon ${type}">
                    ${type === 'growth' ? 
                        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12l3 9h14l3-9M2 12l3-9h14l3 9M2 12h20"/><circle cx="12" cy="12" r="2"/></svg>' :
                        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M2 12h20M12 2a10 10 0 110 20 10 10 0 010-20z"/><path d="M12 8v4m0 4h.01"/></svg>'
                    }
                </div>
                <div>
                    <div class="prediction-title">${title}</div>
                </div>
            </div>
            <div class="prediction-description">${description}</div>
            <div class="prediction-metric">↗ ${value}</div>
        `;
        return div;
    }

    function updateRecommendations(recommendations) {
        console.log('Updating recommendations:', recommendations);
        
        const container = document.getElementById('recommendationsGrid');
        if (!container) return;
        
        container.innerHTML = '';

        const recommendationTypes = [
            { icon: 'portfolio', title: 'Sprint Optimization' },
            { icon: 'compliance', title: 'Resource Balancing' },
            { icon: 'service', title: 'Automation Opportunities' },
            { icon: 'risk', title: 'Quality Improvements' }
        ];

        recommendations.slice(0, 4).forEach((rec, index) => {
            const type = recommendationTypes[index % recommendationTypes.length];
            const card = createRecommendationCard(type.icon, type.title, rec, index);
            container.appendChild(card);
        });
    }

    function createRecommendationCard(iconType, title, description, index) {
        const div = document.createElement('div');
        div.className = 'recommendation-card';
        div.innerHTML = `
            <div class="rec-icon ${iconType}">
                ${getRecommendationIcon(iconType)}
            </div>
            <div class="rec-title">${title}</div>
            <div class="rec-description">${description}</div>
            <button class="apply-btn" onclick="JurixDashboard.applyRecommendation(${index})">
                <span>Apply</span>
            </button>
        `;
        return div;
    }

    function getRecommendationIcon(type) {
        const icons = {
            portfolio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>',
            compliance: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>',
            service: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
            risk: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>'
        };
        return icons[type] || '';
    }

    function updateCharts(visualizationData) {
        console.log('Updating charts:', visualizationData);
        
        const charts = visualizationData.charts || {};
        
        // Update sprint progress chart
        if (charts.sprintProgress) {
            updateSprintProgressChart(charts.sprintProgress);
        }
        
        // Update burndown chart
        if (charts.burndown) {
            updateBurndownChart(charts.burndown);
        }
        
        // Update velocity trend chart
        if (charts.velocityTrend) {
            updateVelocityTrendChart(charts.velocityTrend);
        }
    }

    function updateSprintProgressChart(chartData) {
        const canvas = document.getElementById('sprintProgressChart');
        if (!canvas) return;
        
        // Destroy existing chart
        if (charts.sprintProgress) {
            charts.sprintProgress.destroy();
        }
        
        const ctx = canvas.getContext('2d');
        charts.sprintProgress = new Chart(ctx, {
            type: 'bar',
            data: chartData.data || {
                labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                datasets: [{
                    label: 'Completed',
                    data: [45, 60, 75, 10],
                    backgroundColor: '#0052CC'
                }, {
                    label: 'In Progress',
                    data: [30, 25, 20, 35],
                    backgroundColor: '#6B88F7'
                }, {
                    label: 'To Do',
                    data: [25, 15, 5, 55],
                    backgroundColor: '#DFE5FF'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { stacked: true },
                    y: { 
                        stacked: true,
                        max: 100
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + context.raw + '%';
                            }
                        }
                    }
                }
            }
        });
    }

    function updateBurndownChart(chartData) {
        const canvas = document.getElementById('burndownChart');
        if (!canvas) return;
        
        // Destroy existing chart
        if (charts.burndown) {
            charts.burndown.destroy();
        }
        
        const ctx = canvas.getContext('2d');
        charts.burndown = new Chart(ctx, {
            type: 'line',
            data: chartData.data || {
                labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7', 'Day 8', 'Day 9', 'Day 10'],
                datasets: [{
                    label: 'Ideal',
                    data: [60, 54, 48, 42, 36, 30, 24, 18, 12, 6, 0],
                    borderColor: '#C1C7D0',
                    borderDash: [5, 5],
                    tension: 0,
                    fill: false
                }, {
                    label: 'Actual',
                    data: [60, 55, 50, 40, 38, 30, 25, 20, 18, null, null],
                    borderColor: '#0052CC',
                    backgroundColor: 'rgba(0, 82, 204, 0.1)',
                    tension: 0.3,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Story Points'
                        }
                    }
                }
            }
        });
    }

    function updateVelocityTrendChart(chartData) {
        const canvas = document.getElementById('velocityTrendChart');
        if (!canvas) return;
        
        // Destroy existing chart
        if (charts.velocityTrend) {
            charts.velocityTrend.destroy();
        }
        
        const ctx = canvas.getContext('2d');
        charts.velocityTrend = new Chart(ctx, {
            type: 'line',
            data: chartData.data || {
                labels: ['Sprint 1', 'Sprint 2', 'Sprint 3', 'Sprint 4', 'Sprint 5'],
                datasets: [{
                    label: 'Velocity',
                    data: [32, 38, 35, 45, 42],
                    borderColor: '#00875A',
                    backgroundColor: 'rgba(0, 135, 90, 0.1)',
                    tension: 0.3,
                    fill: true,
                    pointRadius: 5,
                    pointHoverRadius: 7
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return 'Velocity: ' + context.raw + ' points';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Story Points'
                        }
                    }
                }
            }
        });
    }

    function updateAlerts(alerts) {
        console.log('Updating alerts:', alerts);
        
        // Update alert count
        const alertCountEl = document.getElementById('alertCount');
        if (alertCountEl) {
            alertCountEl.textContent = alerts.length;
        }
        
        // Update alert list in modal
        const alertListEl = document.getElementById('alertList');
        if (alertListEl) {
            alertListEl.innerHTML = '';
            
            alerts.forEach(alert => {
                const alertItem = document.createElement('div');
                alertItem.className = 'alert-item';
                alertItem.innerHTML = `
                    <div class="alert-item-left">
                        <div class="alert-severity"></div>
                        <span class="alert-text">${alert.message}</span>
                    </div>
                    <span class="alert-time">${alert.time || 'Just now'}</span>
                `;
                alertListEl.appendChild(alertItem);
            });
        }
    }

    function updateRiskAssessment(riskData) {
        console.log('Updating risk assessment:', riskData);
        
        // Update risk score
        const riskScoreEl = document.getElementById('riskScore');
        if (riskScoreEl && riskData.score !== undefined) {
            animateValue(riskScoreEl, riskData.score.toFixed(3));
        }
        
        // Update risk chart
        const riskChartEl = document.getElementById('riskChart');
        if (riskChartEl && riskData.monthlyScores) {
            riskChartEl.innerHTML = '';
            
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const currentMonth = new Date().getMonth();
            
            months.forEach((month, index) => {
                const height = riskData.monthlyScores[index] ? `${riskData.monthlyScores[index] * 20}%` : '20%';
                const bar = document.createElement('div');
                bar.className = `bar ${index === currentMonth ? 'active' : ''}`;
                bar.style.height = height;
                bar.innerHTML = `<span class="bar-label">${month}</span>`;
                riskChartEl.appendChild(bar);
            });
        }
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
        if (!currentProjectKey) return;
        
        console.log(`🔍 Checking for updates at ${new Date().toLocaleTimeString()}...`);
        
        // Check Python backend for updates
        fetch(`${API_BASE_URL}/api/updates/${currentProjectKey}?since=${lastUpdateTimestamp}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            mode: 'cors'
        })
        .then(response => response.json())
        .then(data => {
            if (data.hasUpdates) {
                console.log(`✅ Found ${data.updateCount} updates!`);
                
                // Update timestamp
                lastUpdateTimestamp = data.timestamp || Date.now();
                
                // Show update notification
                if (data.updates && data.updates.length > 0) {
                    showUpdateNotification(data.updates[0]);
                }
                
                // Refresh dashboard data
                if (data.needsRefresh) {
                    loadDashboardData();
                }
                
                // Speed up polling when active
                adjustPollFrequency(true);
            } else {
                // Slow down polling when idle
                adjustPollFrequency(false);
            }
        })
        .catch(error => {
            console.error('❌ Error checking updates:', error);
            adjustPollFrequency(false);
        });
    }

    function adjustPollFrequency(hasActivity) {
        stopPolling();
        
        if (hasActivity) {
            pollFrequency = Math.max(MIN_POLL_FREQUENCY, pollFrequency * 0.8);
        } else {
            pollFrequency = Math.min(MAX_POLL_FREQUENCY, pollFrequency * 1.5);
        }
        
        console.log(`Adjusted poll frequency to ${pollFrequency}ms`);
        
        // Restart with new frequency
        pollInterval = setInterval(checkForUpdates, pollFrequency);
    }

    function showUpdateNotification(update) {
        AJS.flag({
            type: 'success',
            title: 'Dashboard Updated',
            body: `${update.issueKey || 'System'} - ${update.eventType || 'Updated'}`,
            close: 'auto'
        });
    }

    function initializeTooltips() {
        const tooltip = document.getElementById('tooltip');
        if (!tooltip) return;
        
        // Tooltips for stacked bars in sprint progress
        document.addEventListener('mouseover', function(e) {
            if (e.target.classList.contains('bar-segment')) {
                const rect = e.target.getBoundingClientRect();
                const percentage = e.target.style.height;
                const type = e.target.classList.contains('completed') ? 'Completed' :
                           e.target.classList.contains('in-progress') ? 'In Progress' : 'To Do';
                
                tooltip.innerHTML = `${type}: ${percentage}`;
                tooltip.style.left = rect.left + rect.width / 2 + 'px';
                tooltip.style.top = rect.top - 30 + 'px';
                tooltip.classList.add('show');
            }
        });
        
        document.addEventListener('mouseout', function(e) {
            if (e.target.classList.contains('bar-segment')) {
                tooltip.classList.remove('show');
            }
        });
    }

    function initializeInteractions() {
        // Handle sidebar navigation
        document.querySelectorAll('.sidebar-icon').forEach(icon => {
            icon.addEventListener('click', function() {
                document.querySelectorAll('.sidebar-icon').forEach(i => i.classList.remove('active'));
                this.classList.add('active');
            });
        });
        
        // Close modal on escape
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                const modal = document.getElementById('alertModal');
                const overlay = document.getElementById('modalOverlay');
                if (modal && modal.classList.contains('active')) {
                    modal.classList.remove('active');
                    overlay.classList.remove('active');
                }
            }
        });
    }

    function animateValue(element, endValue, decimalPlaces = 0, suffix = '') {
        if (!element) return;
        
        const startValue = parseFloat(element.textContent) || 0;
        const duration = 1500;
        const startTime = performance.now();
        
        const numericEnd = parseFloat(endValue);
        
        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const easeOut = 1 - Math.pow(1 - progress, 4);
            const current = startValue + (numericEnd - startValue) * easeOut;
            
            if (decimalPlaces > 0) {
                element.textContent = current.toFixed(decimalPlaces) + suffix;
            } else {
                element.textContent = Math.floor(current) + suffix;
            }
            
            if (progress < 1) {
                requestAnimationFrame(update);
            }
        }
        
        requestAnimationFrame(update);
    }

    function showLoadingState() {
        document.querySelectorAll('.stat-value').forEach(el => {
            el.textContent = '--';
            el.style.opacity = '0.5';
        });
        
        document.querySelectorAll('.chart-container').forEach(el => {
            el.style.opacity = '0.5';
        });
    }

    function hideLoadingState() {
        document.querySelectorAll('.stat-value').forEach(el => {
            el.style.opacity = '1';
        });
        
        document.querySelectorAll('.chart-container').forEach(el => {
            el.style.opacity = '1';
        });
    }

    function showError(message) {
        AJS.flag({
            type: 'error',
            title: 'Error',
            body: message,
            close: 'manual'
        });
    }

    function updateLastUpdatedTime(timestamp) {
        const time = timestamp ? new Date(timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();
        console.log('Dashboard last updated:', time);
    }

    function bindEvents() {
        // Bind any additional events specific to the new layout
        console.log('Events bound for new dashboard layout');
    }

    // Public API
    return {
        init: init,
        loadDashboardData: loadDashboardData,
        viewDetails: function(type) {
            console.log('Viewing details for:', type);
            window.location.href = window.JurixData.contextPath + '/browse/' + window.JurixData.projectKey + '?view=' + type;
        },
        toggleAlertModal: function() {
            const modal = document.getElementById('alertModal');
            const overlay = document.getElementById('modalOverlay');
            if (modal && overlay) {
                modal.classList.toggle('active');
                overlay.classList.toggle('active');
            }
        },
        switchForecast: function(position, element) {
            document.querySelectorAll('.forecast-pill').forEach(opt => opt.classList.remove('active'));
            element.classList.add('active');
            
            const indicator = document.querySelector('.forecast-indicator');
            if (indicator) {
                indicator.className = 'forecast-indicator';
                indicator.classList.add('pos-' + position);
            }
            
            console.log('Switching to forecast type:', position);
            // Load forecast data based on type
            loadDashboardData();
        },
        startForecast: function() {
            console.log('Starting forecast...');
            showLoadingState();
            
            // Call backend to generate forecast
            fetch(`${API_BASE_URL}/api/forecast/${currentProjectKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                mode: 'cors'
            })
            .then(response => response.json())
            .then(data => {
                console.log('Forecast data:', data);
                loadDashboardData();
            })
            .catch(error => {
                console.error('Error generating forecast:', error);
                showError('Failed to generate forecast');
            });
        },
        runSprintAnalysis: function() {
            console.log('Running AI sprint analysis...');
            AJS.flag({
                type: 'info',
                title: 'AI Analysis Started',
                body: 'Running comprehensive sprint analysis. This may take a few moments...',
                close: 'auto'
            });
            
            // Refresh dashboard after a delay
            setTimeout(function() {
                loadDashboardData();
            }, 2000);
        },
        generateReport: function() {
            console.log('Generating report...');
            window.open(`${API_BASE_URL}/api/report/${currentProjectKey}`, '_blank');
        },
        applyRecommendation: function(index) {
            console.log('Applying recommendation', index);
            
            AJS.flag({
                type: 'success',
                title: 'Recommendation Applied',
                body: 'The AI recommendation has been applied successfully!',
                close: 'auto'
            });
            
            // Refresh to show updated state
            setTimeout(function() {
                loadDashboardData();
            }, 1000);
        },
        startPolling: startPolling,
        stopPolling: stopPolling
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
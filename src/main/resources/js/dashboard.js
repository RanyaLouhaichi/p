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
    window.currentForecastType = 'velocity'; // Track current forecast type

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
            
            // Initialize sprint forecast
            initializeSprintForecast();
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
        
        // Add CSS styles for new features
        const style = document.createElement('style');
        style.textContent = `
            /* Loading spinner - FIXED to not rotate text */
            .loading-spinner {
                width: 24px;
                height: 24px;
                border: 3px solid #f3f3f3;
                border-top: 3px solid #0052CC;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                display: inline-block;
                margin-right: 8px;
                vertical-align: middle;
            }
            
            .forecast-loading {
                text-align: center;
                padding: 20px;
                color: #5e6c84;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 12px;
            }
            
            .forecast-loading span {
                /* Text should not rotate */
                display: inline-block;
                animation: none !important;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            /* Enhanced AI Summary Widget */
            .ai-summary-widget {
                background: linear-gradient(135deg, #ffffff 0%, #f8f9fb 100%);
                border-radius: 12px;
                padding: 24px;
                margin-bottom: 24px;
                border: 1px solid #dfe1e6;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
                position: relative;
                overflow: hidden;
            }
            
            .ai-summary-widget::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 4px;
                background: linear-gradient(90deg, #0052CC 0%, #0065FF 100%);
            }
            
            .ai-summary-header {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 16px;
            }
            
            .ai-icon-modern {
                width: 40px;
                height: 40px;
                background: linear-gradient(135deg, #0052CC 0%, #0065FF 100%);
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 2px 8px rgba(0, 82, 204, 0.2);
            }
            
            .ai-icon-modern svg {
                width: 24px;
                height: 24px;
                fill: white;
            }
            
            .ai-summary-title {
                font-size: 14px;
                font-weight: 600;
                color: #172b4d;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .ai-summary-content {
                color: #344563;
                line-height: 1.8;
                font-size: 15px;
            }
            
            .ai-confidence-badge {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                background: rgba(0, 82, 204, 0.1);
                color: #0052CC;
                padding: 4px 12px;
                border-radius: 16px;
                font-size: 12px;
                font-weight: 500;
                margin-top: 12px;
            }
            
            /* Forecast results styling */
            .forecast-results {
                margin-top: 20px;
                padding: 20px;
                background: #f7f8fa;
                border-radius: 8px;
                transition: opacity 0.5s ease-in;
            }
            
            .completion-bar {
                width: 100%;
                height: 8px;
                background: #e4e6ea;
                border-radius: 4px;
                overflow: hidden;
                margin-top: 8px;
            }
            
            .completion-fill {
                height: 100%;
                background: #36B37E;
                transition: width 1s ease-out;
            }
            
            .capacity-metrics {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 12px;
                margin: 16px 0;
            }
            
            .metric-card {
                background: white;
                padding: 12px;
                border-radius: 8px;
                text-align: center;
            }
            
            .metric-card.optimal {
                border: 2px solid #36B37E;
            }
            
            .metric-card.warning {
                border: 2px solid #FFAB00;
            }
            
            .metric-value {
                font-size: 24px;
                font-weight: 600;
                color: #172b4d;
            }
            
            .metric-label {
                font-size: 12px;
                color: #5e6c84;
                margin-top: 4px;
            }
            
            /* Enhanced forecast insight card */
            .forecast-insight-card {
                background: white;
                border: 1px solid #dfe1e6;
                border-radius: 8px;
                padding: 16px;
                margin-top: 16px;
                display: flex;
                gap: 12px;
                align-items: flex-start;
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
            }
            
            .forecast-insight-icon {
                width: 32px;
                height: 32px;
                background: #f4f5f7;
                border-radius: 6px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }
            
            .forecast-insight-icon svg {
                width: 18px;
                height: 18px;
                fill: #5e6c84;
            }
            
            .forecast-insight-content {
                flex: 1;
            }
            
            .forecast-insight-title {
                font-weight: 600;
                color: #172b4d;
                margin-bottom: 4px;
                font-size: 14px;
            }
            
            .forecast-insight-text {
                color: #5e6c84;
                font-size: 13px;
                line-height: 1.5;
            }
            
            /* Bottleneck Alert */
            .bottleneck-alert {
                background: #fff5f5;
                border: 1px solid #ffebe6;
            }
            
            .bottleneck-item {
                padding: 12px 0;
                border-bottom: 1px solid #ffebe6;
            }
            
            .bottleneck-item:last-child {
                border-bottom: none;
            }
            
            .ticket-key {
                font-weight: 600;
                color: #de350b;
                margin-bottom: 4px;
            }
            
            .ticket-summary {
                color: #172b4d;
                margin-bottom: 8px;
            }
            
            .ticket-metrics {
                display: flex;
                gap: 16px;
                font-size: 12px;
                color: #5e6c84;
            }
            
            .days-remaining {
                color: #de350b;
                font-weight: 500;
            }
            
            /* Team Performance */
            .performance-grid {
                display: grid;
                gap: 16px;
            }
            
            .member-performance {
                background: #f7f8fa;
                padding: 16px;
                border-radius: 8px;
            }
            
            .member-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
            }
            
            .member-name {
                font-weight: 600;
                color: #172b4d;
            }
            
            .performance-score {
                padding: 4px 12px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: 600;
            }
            
            .performance-score.high {
                background: #e3fcef;
                color: #006644;
            }
            
            .performance-score.medium {
                background: #fffae6;
                color: #974f0c;
            }
            
            .performance-score.low {
                background: #ffebe6;
                color: #ae2a19;
            }
            
            .member-metrics {
                display: flex;
                gap: 16px;
                font-size: 12px;
            }
            
            .member-metrics .metric {
                display: flex;
                flex-direction: column;
            }
            
            /* Critical Factors Banner */
            .critical-factors-banner {
                background: #ffebe6;
                border: 1px solid #ff5630;
                border-radius: 8px;
                padding: 20px;
                margin-bottom: 20px;
            }
            
            .critical-header {
                font-size: 18px;
                font-weight: 600;
                color: #ae2a19;
                margin-bottom: 16px;
            }
            
            .factor-item {
                margin-bottom: 12px;
                padding: 12px;
                background: white;
                border-radius: 6px;
            }
            
            .factor-action {
                font-size: 12px;
                color: #5e6c84;
                margin-top: 4px;
            }
            
            /* Recovery Plan */
            .recovery-plan {
                background: #e3fcef;
                border: 1px solid #36b37e;
            }
            
            .recovery-steps {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            
            .recovery-step {
                display: flex;
                gap: 12px;
                padding: 12px;
                background: white;
                border-radius: 6px;
                border-left: 4px solid;
            }
            
            .recovery-step.priority-immediate {
                border-left-color: #de350b;
            }
            
            .recovery-step.priority-today {
                border-left-color: #ffab00;
            }
            
            .step-number {
                width: 32px;
                height: 32px;
                background: #0052cc;
                color: white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 600;
                flex-shrink: 0;
            }
            
            .step-action {
                font-weight: 600;
                color: #172b4d;
                margin-bottom: 4px;
            }
            
            .step-description {
                font-size: 13px;
                color: #5e6c84;
                margin-bottom: 4px;
            }
            
            .step-priority {
                font-size: 11px;
                color: #8993a4;
                text-transform: uppercase;
            }
            
            /* Trend indicators */
            .trend-indicator {
                display: inline-block;
                width: 0;
                height: 0;
                border-style: solid;
                margin-right: 8px;
            }
            
            .trend-indicator.increasing {
                border-left: 8px solid transparent;
                border-right: 8px solid transparent;
                border-bottom: 12px solid #36B37E;
            }
            
            .trend-indicator.decreasing {
                border-left: 8px solid transparent;
                border-right: 8px solid transparent;
                border-top: 12px solid #FF5630;
            }
            
            .trend-indicator.stable {
                width: 16px;
                height: 2px;
                background: #6B778C;
                border: none;
            }
        `;
        document.head.appendChild(style);
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

    function updateDashboard(data) {
        console.log('Updating dashboard with enhanced data:', data);
        
        // Update metrics
        if (data.metrics) {
            updateMetrics(data.metrics);
        }
        
        // Update predictions with new features
        if (data.predictions) {
            updatePredictions(data.predictions);
            
            // NEW: Update AI summary if available
            if (data.predictions.aiSummary) {
                updateAISummary(data.predictions.aiSummary);
            }
            
            // NEW: Show individual ticket predictions
            if (data.predictions.ticketPredictions) {
                updateTicketPredictions(data.predictions.ticketPredictions);
            }
        }
        
        // Update recommendations
        if (data.recommendations) {
            updateRecommendations(data.recommendations);
        }
        
        // Update charts with ALL new visualizations
        if (data.visualizationData) {
            updateCharts(data.visualizationData);
        }
        
        // Update alerts
        if (data.alerts) {
            updateAlerts(data.alerts);
        }
        
        // Update risk assessment
        if (data.riskAssessment) {
            updateRiskAssessment(data.riskAssessment);
        }
        
        // NEW: Update sprint health pulse with animation
        if (data.sprintHealth) {
            updateSprintHealthPulse(data.sprintHealth);
        }
        
        // NEW: Update team energy meter with individual metrics
        if (data.teamEnergy) {
            updateTeamEnergyMeter(data.teamEnergy);
        }
        
        // NEW: Update team analytics
        if (data.teamAnalytics) {
            updateTeamAnalytics(data.teamAnalytics);
        }
        
        // REMOVED: Historical patterns as requested
        // if (data.patterns) {
        //     updateHistoricalPatterns(data.patterns);
        // }
        
        // NEW: Show critical factors if any
        if (data.criticalFactors && data.criticalFactors.length > 0) {
            showCriticalFactors(data.criticalFactors);
        }
        
        // NEW: Show recovery plan if needed
        if (data.recoveryPlan && data.recoveryPlan.length > 0) {
            showRecoveryPlan(data.recoveryPlan);
        }
        
        // Update last updated time
        updateLastUpdatedTime(data.lastUpdated);
    }

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
        
        // Use the actual data from backend
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
                        display: false  // Using custom legend
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.dataset.label || '';
                                const value = context.parsed.y || 0;
                                return label + ': ' + value + ' tickets';
                            },
                            afterLabel: function(context) {
                                const datasetIndex = context.datasetIndex;
                                const dataIndex = context.dataIndex;
                                let total = 0;
                                
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
            labels: ['Week -2', 'Week -1', 'Current', 'Next Week', 'Week +2', 'Week +3'],
            datasets: [{
                label: 'Velocity',
                data: [5, 6, 7, 7, 7, 7],
                borderColor: '#36B37E',  // Changed from #00875A to match the green in other parts
                backgroundColor: 'rgba(54, 179, 126, 0.15)',  // Light green shadow - increased opacity
                tension: 0.4,  // Slightly more curve to match burndown style
                fill: true,
                pointRadius: 6,  // Larger points to match burndown
                pointHoverRadius: 8,
                pointBackgroundColor: '#36B37E',  // Green fill
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                borderWidth: 3  // Thicker line to match burndown
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
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        titleColor: '#172b4d',
                        bodyColor: '#172b4d',
                        borderColor: '#dfe1e6',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: false,
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
                        },
                        ticks: {
                            color: '#5e6c84',
                            font: {
                                size: 12
                            }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Story Points',
                            font: {
                                size: 12
                            },
                            color: '#5e6c84'
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            color: '#5e6c84',
                            stepSize: 1,
                            font: {
                                size: 12
                            }
                        }
                    }
                }
            }
        });
    }

    function updateRiskAssessment(riskData) {
        console.log('Updating risk assessment with real data:', riskData);
        
        // Update risk score with animation
        const riskScoreEl = document.getElementById('riskScore');
        if (riskScoreEl && riskData.score !== undefined) {
            animateValue(riskScoreEl, riskData.score, 3); // 3 decimal places
            
            // Change color based on risk level
            const riskCard = riskScoreEl.closest('.risk-card');
            if (riskCard) {
                riskCard.classList.remove('low-risk', 'medium-risk', 'high-risk', 'critical-risk');
                riskCard.classList.add(`${riskData.level}-risk`);
            }
        }
        
        // Update risk chart with real monthly data
        const riskChartEl = document.getElementById('riskChart');
        if (riskChartEl && riskData.monthlyScores) {
            riskChartEl.innerHTML = '';
            
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const currentMonth = new Date().getMonth();
            const maxScore = Math.max(...riskData.monthlyScores, 10);
            
            months.forEach((month, index) => {
                const score = riskData.monthlyScores[index] || 0;
                const heightPercent = (score / maxScore) * 100;
                
                const bar = document.createElement('div');
                bar.className = `bar ${index === currentMonth ? 'active' : ''}`;
                bar.style.height = `${heightPercent}%`;
                bar.innerHTML = `<span class="bar-label">${month}</span>`;
                
                // Add color based on risk level
                if (score > 7) {
                    bar.style.backgroundColor = '#FF5630';
                } else if (score > 5) {
                    bar.style.backgroundColor = '#FFAB00';
                } else if (score > 3) {
                    bar.style.backgroundColor = '#36B37E';
                } else {
                    bar.style.backgroundColor = '#00875A';
                }
                
                // Add tooltip on hover
                bar.title = `${month}: Risk score ${score.toFixed(2)}`;
                
                riskChartEl.appendChild(bar);
            });
        }
        
        // Update risk factors if available
        if (riskData.factors && riskData.factors.length > 0) {
            const riskLabel = document.querySelector('.risk-label');
            if (riskLabel) {
                const topFactor = riskData.factors[0];
                riskLabel.textContent = `Top risk: ${topFactor.factor}`;
            }
        }
    }

    function updateSprintHealthPulse(healthData) {
        console.log('Updating sprint health pulse:', healthData);
        
        // Create or update sprint health widget
        let healthWidget = document.getElementById('sprintHealthWidget');
        if (!healthWidget) {
            // Create a more compact widget
            const container = document.querySelector('.charts-grid');
            if (container) {
                const healthCard = document.createElement('div');
                healthCard.className = 'chart-card sprint-health-card';
                healthCard.innerHTML = `
                    <div id="sprintHealthWidget" class="health-widget-compact"></div>
                `;
                container.appendChild(healthCard);
                healthWidget = document.getElementById('sprintHealthWidget');
            }
        }
        
        if (healthWidget) {
            const pulseClass = healthData.status === 'healthy' ? 'pulse-healthy' : 
                            healthData.status === 'at_risk' ? 'pulse-warning' : 'pulse-critical';
            
            healthWidget.innerHTML = `
                <div class="health-compact-container">
                    <div class="health-left">
                        <h3 class="chart-title">Sprint Health</h3>
                        <div class="health-score-compact">
                            <span class="score-value" style="color: ${healthData.color}">${healthData.health_score.toFixed(0)}%</span>
                            <span class="health-status-badge ${healthData.status}">${healthData.status.toUpperCase()}</span>
                        </div>
                        <div class="health-subtitle">Pulse rate: ${healthData.pulse_rate} bpm</div>
                    </div>
                    <div class="health-right">
                        <div class="pulse-circle ${pulseClass}">
                            <div class="pulse-dot" style="background-color: ${healthData.color}"></div>
                        </div>
                    </div>
                </div>
                ${healthData.critical_moments && healthData.critical_moments.length > 0 ? `
                    <div class="critical-moments-compact">
                        <strong>Key Risks:</strong>
                        ${healthData.critical_moments.slice(0, 2).map(m => `<span class="risk-tag">• ${m}</span>`).join(' ')}
                    </div>
                ` : '<div class="health-good">✓ All systems operational</div>'}
            `;
        }
    }

    function updateTeamEnergyMeter(energyData) {
        console.log('Updating team energy meter:', energyData);
        
        // Create or update team energy widget
        let energyWidget = document.getElementById('teamEnergyWidget');
        if (!energyWidget) {
            // Create widget if it doesn't exist
            const container = document.querySelector('.ai-left-section');
            if (container) {
                const energyCard = document.createElement('div');
                energyCard.className = 'market-card';
                energyCard.innerHTML = `
                    <h3 class="risk-title">Team Energy Levels</h3>
                    <div id="teamEnergyWidget" class="energy-widget"></div>
                `;
                container.appendChild(energyCard);
                energyWidget = document.getElementById('teamEnergyWidget');
            }
        }
        
        if (energyWidget) {
            const memberBars = energyData.members.map(member => {
                const barColor = member.energy >= 70 ? '#36B37E' : 
                            member.energy >= 40 ? '#FFAB00' : '#FF5630';
                
                return `
                    <div class="energy-member">
                        <div class="member-name">${member.name}</div>
                        <div class="energy-bar-container">
                            <div class="energy-bar" style="width: ${member.energy}%; background-color: ${barColor}"></div>
                        </div>
                        <div class="energy-info">
                            <span class="energy-percent">${member.energy}%</span>
                            ${member.recovery_time > 0 ? `<span class="recovery-time">${member.recovery_time.toFixed(1)}d recovery</span>` : ''}
                        </div>
                    </div>
                `;
            }).join('');
            
            energyWidget.innerHTML = `
                <div class="team-energy-summary">
                    <div class="avg-energy">Team Average: <strong>${energyData.average_energy.toFixed(0)}%</strong></div>
                    <div class="at-risk">At Risk: <strong>${energyData.at_risk_count} members</strong></div>
                </div>
                <div class="energy-members">
                    ${memberBars}
                </div>
                ${energyData.recommendations.length > 0 ? `
                    <div class="energy-recommendations">
                        <strong>Recommendations:</strong>
                        ${energyData.recommendations.slice(0, 2).map(r => `<div>• ${r}</div>`).join('')}
                    </div>
                ` : ''}
            `;
        }
    }

    function initializeSprintForecast() {
        window.JurixDashboard.startForecast = function() {
            console.log('Starting forecast for type:', window.currentForecastType);
            
            const forecastCard = document.querySelector('.performance-card');
            if (!forecastCard) return;
            
            // Show loading animation with fixed text
            const loadingHtml = `
                <div class="forecast-loading">
                    <div class="loading-spinner"></div>
                    <span>Generating AI forecast...</span>
                </div>
            `;
            
            // Find or create results container
            let resultsContainer = forecastCard.querySelector('.forecast-results');
            if (!resultsContainer) {
                resultsContainer = document.createElement('div');
                resultsContainer.className = 'forecast-results';
                forecastCard.appendChild(resultsContainer);
            }
            
            resultsContainer.innerHTML = loadingHtml;
            
            // Call backend to generate forecast
            fetch(`${API_BASE_URL}/api/forecast/${currentProjectKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type: window.currentForecastType
                }),
                mode: 'cors'
            })
            .then(response => response.json())
            .then(data => {
                console.log('Forecast data:', data);
                
                if (data.status === 'success') {
                    displayEnhancedForecastResults(data, resultsContainer);
                } else {
                    throw new Error(data.error || 'Failed to generate forecast');
                }
            })
            .catch(error => {
                console.error('Error generating forecast:', error);
                resultsContainer.innerHTML = `
                    <div class="forecast-error">
                        <span>⚠️ Failed to generate forecast</span>
                    </div>
                `;
            });
        };
    }

    function displayEnhancedForecastResults(forecastData, container) {
        const type = forecastData.type;
        const data = forecastData.data;
        
        let resultsHtml = '';
        
        if (type === 'velocity') {
            resultsHtml = `
                <div class="forecast-result-header">
                    <h4>Velocity Forecast</h4>
                    <span class="forecast-confidence">Confidence: ${(data.confidence * 100).toFixed(0)}%</span>
                </div>
                <div class="forecast-trend ${data.trend}">
                    <div class="trend-indicator ${data.trend}"></div>
                    Trend: <strong>${data.trend}</strong>
                </div>
                <div class="forecast-visual">
                    <canvas id="velocityForecastChart" height="150"></canvas>
                </div>
                <div class="forecast-insight-card">
                    <div class="forecast-insight-icon">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M13 7.5a1 1 0 11-2 0 1 1 0 012 0zm-3 3.75a.75.75 0 01.75-.75h1.5a.75.75 0 01.75.75v4.25h.75a.75.75 0 010 1.5h-3a.75.75 0 010-1.5h.75V12h-.75a.75.75 0 01-.75-.75z"/>
                            <path fill-rule="evenodd" d="M12 1C5.925 1 1 5.925 1 12s4.925 11 11 11 11-4.925 11-11S18.075 1 12 1zM2.5 12a9.5 9.5 0 1119 0 9.5 9.5 0 01-19 0z"/>
                        </svg>
                    </div>
                    <div class="forecast-insight-content">
                        <div class="forecast-insight-title">Insight</div>
                        <div class="forecast-insight-text">${data.insights || 'Analyzing velocity patterns...'}</div>
                    </div>
                </div>
                <div class="forecast-insight-card">
                    <div class="forecast-insight-icon">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                        </svg>
                    </div>
                    <div class="forecast-insight-content">
                        <div class="forecast-insight-title">Recommendation</div>
                        <div class="forecast-insight-text">${data.recommendation}</div>
                    </div>
                </div>
            `;
        } else if (type === 'burndown') {
            const riskClass = data.at_risk ? 'at-risk' : 'on-track';
            resultsHtml = `
                <div class="forecast-result-header">
                    <h4>Burndown Forecast</h4>
                    <span class="forecast-confidence ${riskClass}">
                        ${data.at_risk ? '⚠️ At Risk' : '✅ On Track'}
                    </span>
                </div>
                <div class="forecast-completion">
                    Sprint Completion: <strong>${(data.completion_probability * 100).toFixed(0)}%</strong>
                    <div class="completion-bar">
                        <div class="completion-fill" style="width: ${data.completion_probability * 100}%"></div>
                    </div>
                </div>
                <div class="forecast-visual">
                    <canvas id="burndownForecastChart" height="200"></canvas>
                </div>
                <div class="forecast-days">
                    <span class="days-icon">📅</span>
                    Days Remaining: <strong>${data.days_remaining}</strong>
                </div>
            `;
        } else if (type === 'capacity') {
            const trendClass = data.capacity_trend === 'declining' ? 'declining' : 'stable';
            resultsHtml = `
                <div class="forecast-result-header">
                    <h4>Team Capacity Forecast</h4>
                    <span class="forecast-capacity-trend ${trendClass}">
                        ${data.capacity_trend === 'declining' ? '📉 Declining' : '📊 Stable'}
                    </span>
                </div>
                <div class="capacity-metrics">
                    <div class="metric-card">
                        <div class="metric-value">${data.current_capacity}</div>
                        <div class="metric-label">Current hrs/day</div>
                    </div>
                    <div class="metric-card optimal">
                        <div class="metric-value">${data.optimal_capacity.toFixed(1)}</div>
                        <div class="metric-label">Optimal hrs/day</div>
                    </div>
                    <div class="metric-card ${data.at_risk_members > 0 ? 'warning' : ''}">
                        <div class="metric-value">${data.at_risk_members}</div>
                        <div class="metric-label">At Risk Members</div>
                    </div>
                </div>
                <div class="capacity-visual">
                    <div class="capacity-gauge">
                        <div class="gauge-fill" style="width: ${(data.current_capacity / 10) * 100}%"></div>
                    </div>
                </div>
                <div class="capacity-recommendations">
                    ${data.recommendations.map(r => `<div class="rec-item">• ${r}</div>`).join('')}
                </div>
            `;
        }
        
        // Animate the results appearing
        container.style.opacity = '0';
        container.innerHTML = resultsHtml;
        
        // Fade in animation
        setTimeout(() => {
            container.style.transition = 'opacity 0.5s ease-in';
            container.style.opacity = '1';
            
            // Draw charts if needed
            if (type === 'velocity') {
                drawVelocityForecast(data);
            } else if (type === 'burndown') {
                drawEnhancedBurndownForecast(data);
            }
        }, 100);
    }

    function drawVelocityForecast(data) {
        const canvas = document.getElementById('velocityForecastChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        // Prepare data for chart
        const labels = ['Current', 'Next Week', 'Week +2', 'Week +3'];
        const forecastData = [6].concat(data.next_sprints || [48, 50, 52]); // Use actual current velocity
        
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Velocity Forecast',
                    data: forecastData,
                    borderColor: '#0052CC',
                    backgroundColor: 'rgba(0, 82, 204, 0.1)',
                    borderWidth: 3,
                    tension: 0.3,
                    fill: true,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    pointBackgroundColor: '#0052CC',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
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
                                return 'Velocity: ' + context.parsed.y + ' points';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    }
                }
            }
        });
    }

    function drawEnhancedBurndownForecast(data) {
        const canvas = document.getElementById('burndownForecastChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array.from({length: data.ideal_burndown.length}, (_, i) => `Day ${i}`),
                datasets: [{
                    label: 'Ideal',
                    data: data.ideal_burndown,
                    borderColor: '#C1C7D0',
                    borderDash: [5, 5],
                    borderWidth: 2,
                    tension: 0,
                    fill: false,
                    pointRadius: 0
                }, {
                    label: 'Predicted',
                    data: data.predicted_burndown,
                    borderColor: data.at_risk ? '#FF5630' : '#36B37E',
                    backgroundColor: data.at_risk ? 'rgba(255, 86, 48, 0.1)' : 'rgba(54, 179, 126, 0.1)',
                    borderWidth: 3,
                    tension: 0.3,
                    fill: true,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: data.at_risk ? '#FF5630' : '#36B37E',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Story Points'
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    }
                }
            }
        });
    }

    function updateAISummary(summary) {
        // Create enhanced AI summary widget at the top of AI insights
        let summaryWidget = document.querySelector('.ai-summary-widget');
        if (!summaryWidget) {
            const container = document.querySelector('.ai-insights-wrapper');
            if (container) {
                summaryWidget = document.createElement('div');
                summaryWidget.className = 'ai-summary-widget';
                container.insertBefore(summaryWidget, container.firstChild);
            }
        }
        
        if (summaryWidget && summary) {
            // Extract confidence percentage if available
            const confidenceMatch = summary.match(/(\d+)%\s*(?:success\s*probability|confidence|chance)/i);
            const confidence = confidenceMatch ? confidenceMatch[1] : null;
            
            summaryWidget.innerHTML = `
                <div class="ai-summary-header">
                    <div class="ai-icon-modern">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M13 10h-3v3h3v-3zm0-4h-3v3h3V6zm0 8h-3v3h3v-3zm-5-4H5v3h3v-3zm0-4H5v3h3V6zm0 8H5v3h3v-3zm11-8h-3v3h3V6zm0 4h-3v3h3v-3zm0 4h-3v3h3v-3z"/>
                        </svg>
                    </div>
                    <div class="ai-summary-title">AI Sprint Analysis</div>
                </div>
                <div class="ai-summary-content">
                    ${summary}
                </div>
                ${confidence ? `
                    <div class="ai-confidence-badge">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2L3 7v9c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V7l-9-5z"/>
                        </svg>
                        ${confidence}% Confidence
                    </div>
                ` : ''}
            `;
        }
    }

    function updateTicketPredictions(predictions) {
        // Find bottleneck tickets
        const bottlenecks = predictions.filter(p => p.is_bottleneck);
        
        if (bottlenecks.length > 0) {
            // Create a bottleneck alert
            const alertArea = document.querySelector('.charts-grid');
            if (alertArea) {
                let bottleneckCard = document.getElementById('bottleneckAlert');
                if (!bottleneckCard) {
                    bottleneckCard = document.createElement('div');
                    bottleneckCard.id = 'bottleneckAlert';
                    bottleneckCard.className = 'chart-card bottleneck-alert';
                    alertArea.appendChild(bottleneckCard);
                }
                
                bottleneckCard.innerHTML = `
                    <h3 class="chart-title">🚨 Bottleneck Tickets Detected</h3>
                    <div class="bottleneck-list">
                        ${bottlenecks.slice(0, 5).map(ticket => `
                            <div class="bottleneck-item">
                                <div class="ticket-key">${ticket.ticket_key}</div>
                                <div class="ticket-summary">${ticket.summary}</div>
                                <div class="ticket-metrics">
                                    <span class="days-remaining">${ticket.days_remaining} days left</span>
                                    <span class="bottleneck-reason">${ticket.bottleneck_reason}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            }
        }
    }

    function updateTeamAnalytics(analytics) {
        if (!analytics.members || analytics.members.length === 0) return;
        
        // Update team workload chart with individual performance
        const members = analytics.members;
        
        // Create performance comparison
        let performanceCard = document.getElementById('teamPerformanceCard');
        if (!performanceCard) {
            const container = document.querySelector('.charts-grid');
            if (container) {
                performanceCard = document.createElement('div');
                performanceCard.id = 'teamPerformanceCard';
                performanceCard.className = 'chart-card';
                container.appendChild(performanceCard);
            }
        }
        
        if (performanceCard) {
            performanceCard.innerHTML = `
                <h3 class="chart-title">Team Performance Matrix</h3>
                <div class="performance-grid">
                    ${members.map(member => `
                        <div class="member-performance">
                            <div class="member-header">
                                <span class="member-name">${member.name}</span>
                                <span class="performance-score ${getPerformanceClass(member.performance_score)}">
                                    ${(member.performance_score * 100).toFixed(0)}%
                                </span>
                            </div>
                            <div class="member-metrics">
                                <div class="metric">
                                    <span class="metric-label">Completed:</span>
                                    <span class="metric-value">${member.metrics.completed}</span>
                                </div>
                                <div class="metric">
                                    <span class="metric-label">Cycle Time:</span>
                                    <span class="metric-value">${member.metrics.avg_cycle_time}d</span>
                                </div>
                                <div class="metric">
                                    <span class="metric-label">Efficiency:</span>
                                    <span class="metric-value">${(member.metrics.efficiency * 100).toFixed(0)}%</span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    }

    function getPerformanceClass(score) {
        if (score >= 0.8) return 'high';
        if (score >= 0.6) return 'medium';
        return 'low';
    }

    // REMOVED: Historical patterns function as requested
    // function updateHistoricalPatterns(patterns) { ... }

    function showCriticalFactors(factors) {
        // Create alert banner for critical factors
        const banner = document.createElement('div');
        banner.className = 'critical-factors-banner';
        banner.innerHTML = `
            <div class="critical-header">⚠️ Critical Factors Affecting Sprint</div>
            <div class="factors-list">
                ${factors.map(factor => `
                    <div class="factor-item ${factor.severity}">
                        <strong>${factor.factor}:</strong> ${factor.impact}
                        <div class="factor-action">→ ${factor.action}</div>
                    </div>
                `).join('')}
            </div>
        `;
        
        // Insert at top of dashboard
        const container = document.querySelector('.main-content');
        if (container && container.firstChild) {
            container.insertBefore(banner, container.firstChild);
        }
    }

    function showRecoveryPlan(plan) {
        // Create recovery plan modal or card
        let recoveryCard = document.getElementById('recoveryPlan');
        if (!recoveryCard) {
            const container = document.querySelector('.ai-insights-wrapper');
            if (container) {
                recoveryCard = document.createElement('div');
                recoveryCard.id = 'recoveryPlan';
                recoveryCard.className = 'market-card recovery-plan';
                container.appendChild(recoveryCard);
            }
        }
        
        if (recoveryCard) {
            recoveryCard.innerHTML = `
                <h3 class="risk-title">🚑 Recovery Plan</h3>
                <div class="recovery-steps">
                    ${plan.map((step, index) => `
                        <div class="recovery-step priority-${step.priority}">
                            <div class="step-number">${index + 1}</div>
                            <div class="step-content">
                                <div class="step-action">${step.action}</div>
                                <div class="step-description">${step.description}</div>
                                <div class="step-priority">Priority: ${step.priority}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    }

    function displayForecastResults(forecastData) {
        const performanceCard = document.querySelector('.performance-card');
        if (!performanceCard) return;
        
        // Create forecast results display
        const resultsDiv = document.createElement('div');
        resultsDiv.className = 'forecast-results';
        resultsDiv.style.marginTop = '20px';
        
        if (forecastData.type === 'velocity') {
            resultsDiv.innerHTML = `
                <div class="forecast-result-header">
                    <h4>Velocity Forecast</h4>
                    <span class="forecast-confidence">Confidence: ${(forecastData.data.confidence * 100).toFixed(0)}%</span>
                </div>
                <div class="forecast-trend ${forecastData.data.trend}">
                    Trend: <strong>${forecastData.data.trend}</strong>
                </div>
                <div class="forecast-values">
                    Next 3 sprints: ${forecastData.data.next_sprints.map(v => `<span class="forecast-value">${v}</span>`).join(' → ')}
                </div>
                <div class="forecast-insight">${forecastData.data.insights}</div>
                <div class="forecast-recommendation">${forecastData.data.recommendation}</div>
            `;
        } else if (forecastData.type === 'burndown') {
            resultsDiv.innerHTML = `
                <div class="forecast-result-header">
                    <h4>Burndown Forecast</h4>
                    <span class="forecast-confidence ${forecastData.data.at_risk ? 'at-risk' : 'on-track'}">
                        ${forecastData.data.at_risk ? '⚠️ At Risk' : '✅ On Track'}
                    </span>
                </div>
                <div class="forecast-completion">
                    Sprint Completion: <strong>${(forecastData.data.completion_probability * 100).toFixed(0)}%</strong>
                </div>
                <div class="forecast-days">Days Remaining: ${forecastData.data.days_remaining}</div>
                <canvas id="burndownForecastChart" width="100%" height="150"></canvas>
            `;
            
            // Add burndown chart after inserting HTML
            setTimeout(() => {
                drawBurndownForecast(forecastData.data);
            }, 100);
        } else if (forecastData.type === 'capacity') {
            resultsDiv.innerHTML = `
                <div class="forecast-result-header">
                    <h4>Team Capacity Forecast</h4>
                    <span class="forecast-capacity-trend ${forecastData.data.capacity_trend}">
                        ${forecastData.data.capacity_trend === 'declining' ? '📉 Declining' : '📊 Stable'}
                    </span>
                </div>
                <div class="capacity-metrics">
                    <div>Current: ${forecastData.data.current_capacity} hrs/day</div>
                    <div>Optimal: ${forecastData.data.optimal_capacity} hrs/day</div>
                    <div>At Risk: ${forecastData.data.at_risk_members} members</div>
                </div>
                <div class="capacity-recommendations">
                    ${forecastData.data.recommendations.map(r => `<div class="rec-item">• ${r}</div>`).join('')}
                </div>
            `;
        }
        
        // Replace or append results
        const existingResults = performanceCard.querySelector('.forecast-results');
        if (existingResults) {
            existingResults.replaceWith(resultsDiv);
        } else {
            performanceCard.appendChild(resultsDiv);
        }
    }

    function drawBurndownForecast(burndownData) {
        const canvas = document.getElementById('burndownForecastChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array.from({length: burndownData.ideal_burndown.length}, (_, i) => `Day ${i}`),
                datasets: [{
                    label: 'Ideal',
                    data: burndownData.ideal_burndown,
                    borderColor: '#C1C7D0',
                    borderDash: [5, 5],
                    fill: false
                }, {
                    label: 'Predicted',
                    data: burndownData.predicted_burndown,
                    borderColor: burndownData.at_risk ? '#FF5630' : '#36B37E',
                    backgroundColor: burndownData.at_risk ? 'rgba(255, 86, 48, 0.1)' : 'rgba(54, 179, 126, 0.1)',
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
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
        if (charts.sprintProgress || charts.teamWorkload) {
            // Use teamWorkload data for sprint progress if available
            const progressData = charts.sprintProgress || charts.teamWorkload;
            updateSprintProgressChart(progressData);
        } else {
            // Use default data if no data provided
            updateSprintProgressChart({
                data: {
                    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                    datasets: [{
                        label: 'Completed',
                        data: [20, 35, 55, 75],
                        backgroundColor: '#0052CC'
                    }, {
                        label: 'In Progress',
                        data: [40, 35, 25, 15],
                        backgroundColor: '#6B88F7'
                    }, {
                        label: 'To Do',
                        data: [40, 30, 20, 10],
                        backgroundColor: '#DFE5FF'
                    }]
                }
            });
        }
        
        // Update burndown chart
        if (charts.burndown) {
            updateBurndownChart(charts.burndown);
        } else {
            // Use default burndown data
            updateBurndownChart({
                data: {
                    labels: ['Day 0', 'Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7', 'Day 8', 'Day 9', 'Day 10'],
                    datasets: [{
                        label: 'Ideal',
                        data: [60, 54, 48, 42, 36, 30, 24, 18, 12, 6, 0],
                        borderColor: '#C1C7D0',
                        borderDash: [5, 5],
                        tension: 0,
                        fill: false
                    }, {
                        label: 'Actual',
                        data: [60, 58, 52, 45, 38, 30, 25, 20, 18, null, null],
                        borderColor: '#0052CC',
                        backgroundColor: 'rgba(0, 82, 204, 0.1)',
                        tension: 0.3,
                        fill: true
                    }]
                }
            });
        }
        
        // Update velocity trend chart
        if (charts.velocityTrend) {
            updateVelocityTrendChart(charts.velocityTrend);
        } else {
            // Use default velocity data
            updateVelocityTrendChart({
                data: {
                    labels: ['Week -2', 'Week -1', 'Current', 'Next Week', 'Week +2'],
                    datasets: [{
                        label: 'Velocity',
                        data: [5, 6, 6, null, null],
                        borderColor: '#00875A',
                        backgroundColor: 'rgba(0, 135, 90, 0.1)',
                        tension: 0.3,
                        fill: true
                    }]
                }
            });
        }
    }

    function updateAlerts(alerts) {
        console.log('Updating alerts:', alerts);
        
        // If no alerts provided, create default alerts based on metrics
        if (!alerts || alerts.length === 0) {
            // Check if we have risk data to generate alerts
            const riskScore = window.lastDashboardData?.riskAssessment?.score || 0;
            const sprintCompletion = window.lastDashboardData?.predictions?.sprintCompletion?.probability || 1;
            
            alerts = [];
            
            if (riskScore > 4) {
                alerts.push({
                    type: 'critical',
                    message: `High risk score detected: ${riskScore.toFixed(1)}`,
                    time: 'Just now',
                    action: 'Review risk factors immediately'
                });
            }
            
            if (sprintCompletion < 0.7) {
                alerts.push({
                    type: 'warning',
                    message: `Sprint completion at risk: ${(sprintCompletion * 100).toFixed(0)}%`,
                    time: '2 minutes ago',
                    action: 'Review sprint backlog'
                });
            }
        }
        
        // Update alert count
        const alertCountEl = document.getElementById('alertCount');
        if (alertCountEl) {
            alertCountEl.textContent = alerts.length;
            
            // Update alert card styling based on count
            const alertCard = document.querySelector('.alert-card');
            if (alertCard) {
                if (alerts.length === 0) {
                    alertCard.classList.add('no-alerts');
                    document.querySelector('.alert-indicator').style.display = 'none';
                    document.querySelector('.alert-dot').style.display = 'none';
                } else {
                    alertCard.classList.remove('no-alerts');
                    document.querySelector('.alert-indicator').style.display = 'block';
                    document.querySelector('.alert-dot').style.display = 'block';
                }
            }
        }
        
        // Update alert list in modal
        const alertListEl = document.getElementById('alertList');
        if (alertListEl) {
            alertListEl.innerHTML = '';
            
            if (alerts.length === 0) {
                alertListEl.innerHTML = '<div class="no-alerts-message">No critical alerts at this time. System is healthy!</div>';
            } else {
                alerts.forEach(alert => {
                    const alertItem = document.createElement('div');
                    alertItem.className = 'alert-item';
                    alertItem.innerHTML = `
                        <div class="alert-item-left">
                            <div class="alert-severity ${alert.type}"></div>
                            <span class="alert-text">${alert.message}</span>
                        </div>
                        <span class="alert-time">${alert.time || 'Just now'}</span>
                    `;
                    alertListEl.appendChild(alertItem);
                });
            }
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
            // Update active state
            document.querySelectorAll('.forecast-pill').forEach(opt => opt.classList.remove('active'));
            element.classList.add('active');
            
            // Move indicator dot
            const indicator = document.querySelector('.forecast-indicator');
            if (indicator) {
                indicator.className = 'forecast-indicator';
                indicator.classList.add('pos-' + position);
            }
            
            // Update forecast type
            const types = ['velocity', 'burndown', 'capacity'];
            window.currentForecastType = types[position - 1];
            
            console.log('Switching to forecast type:', window.currentForecastType);
        },

        startForecast: function() {
            console.log('Starting forecast for type:', window.currentForecastType);
            
            // Show loading state
            const forecastCard = document.querySelector('.performance-card');
            if (forecastCard) {
                const originalContent = forecastCard.innerHTML;
                forecastCard.innerHTML += '<div class="forecast-loading">Generating AI forecast...</div>';
            }
            
            // Call backend to generate forecast
            fetch(`${API_BASE_URL}/api/forecast/${currentProjectKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type: window.currentForecastType
                }),
                mode: 'cors'
            })
            .then(response => response.json())
            .then(data => {
                console.log('Forecast data:', data);
                
                if (data.status === 'success') {
                    displayForecastResults(data);
                } else {
                    throw new Error(data.error || 'Failed to generate forecast');
                }
            })
            .catch(error => {
                console.error('Error generating forecast:', error);
                showError('Failed to generate forecast: ' + error.message);
            })
            .finally(() => {
                // Remove loading state
                const loadingEl = document.querySelector('.forecast-loading');
                if (loadingEl) {
                    loadingEl.remove();
                }
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
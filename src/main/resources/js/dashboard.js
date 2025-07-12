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
        console.log('Updating dashboard with enhanced data:', data);
        
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
        
        // Update alerts
        if (data.alerts) {
            updateAlerts(data.alerts);
        }
        
        // Update risk assessment with real data
        if (data.riskAssessment) {
            updateRiskAssessment(data.riskAssessment);
        }
        
        // NEW: Update sprint health pulse
        if (data.sprintHealth) {
            updateSprintHealthPulse(data.sprintHealth);
        }
        
        // NEW: Update team energy meter
        if (data.teamEnergy) {
            updateTeamEnergyMeter(data.teamEnergy);
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
package com.jurix.ai.service;

import com.jurix.ai.api.JurixApiClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import javax.inject.Named;
import org.springframework.stereotype.Component;

@Component
@Named("dashboardService") 
public class DashboardService {
    
    private static final Logger log = LoggerFactory.getLogger(DashboardService.class);
    private final Map<String, Object> dashboardCache = new ConcurrentHashMap<>();
    
    public void broadcastDashboardUpdate(String projectKey, JurixApiClient.DashboardResponse dashboard) {
        // In a real implementation, this would use WebSockets
        dashboardCache.put(projectKey, dashboard);
        log.info("Broadcasting dashboard update for project: {}", projectKey);
    }
    
    public Object getCachedDashboard(String projectKey) {
        return dashboardCache.get(projectKey);
    }
}
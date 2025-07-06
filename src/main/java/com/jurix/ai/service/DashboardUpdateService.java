package com.jurix.ai.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import javax.inject.Named;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Named
public class DashboardUpdateService {
    private static final Logger log = LoggerFactory.getLogger(DashboardUpdateService.class);
    
    // Simple in-memory storage
    private final Map<String, List<UpdateEvent>> updates = new ConcurrentHashMap<>();
    private final int MAX_UPDATES_PER_PROJECT = 100;
    
    public void recordUpdate(String projectKey, UpdateEvent event) {
        updates.computeIfAbsent(projectKey, k -> Collections.synchronizedList(new ArrayList<>()))
               .add(0, event); // Add to beginning
        
        // Trim to max size
        List<UpdateEvent> projectUpdates = updates.get(projectKey);
        if (projectUpdates.size() > MAX_UPDATES_PER_PROJECT) {
            projectUpdates.subList(MAX_UPDATES_PER_PROJECT, projectUpdates.size()).clear();
        }
        
        log.info("Recorded update for project {} - Issue {} - Event {}", 
                 projectKey, event.issueKey, event.eventType);
    }
    
    public Map<String, Object> getUpdatesSince(String projectKey, long sinceTimestamp) {
        List<UpdateEvent> projectUpdates = updates.getOrDefault(projectKey, new ArrayList<>());
        
        // Filter updates since timestamp
        List<UpdateEvent> recentUpdates = projectUpdates.stream()
            .filter(update -> update.timestamp > sinceTimestamp)
            .collect(Collectors.toList());
        
        Map<String, Object> result = new HashMap<>();
        result.put("projectKey", projectKey);
        result.put("updateCount", recentUpdates.size());
        result.put("hasUpdates", !recentUpdates.isEmpty());
        
        if (!recentUpdates.isEmpty()) {
            result.put("latestTimestamp", recentUpdates.get(0).timestamp);
            
            // Convert to list of maps
            List<Map<String, Object>> updateList = new ArrayList<>();
            for (UpdateEvent update : recentUpdates) {
                Map<String, Object> updateMap = new HashMap<>();
                updateMap.put("issueKey", update.issueKey);
                updateMap.put("eventType", update.eventType);
                updateMap.put("status", update.status);
                updateMap.put("timestamp", update.timestamp);
                updateList.add(updateMap);
            }
            result.put("updates", updateList);
        }
        
        return result;
    }
    
    public ProjectUpdateInfo getProjectUpdateInfo(String projectKey) {
        ProjectUpdateInfo info = new ProjectUpdateInfo(projectKey);
        List<UpdateEvent> projectUpdates = updates.getOrDefault(projectKey, new ArrayList<>());
        
        // Add updates to info (they're already in reverse chronological order)
        for (UpdateEvent update : projectUpdates) {
            info.addUpdate(update);
        }
        
        return info;
    }
    
    // Inner classes
    public static class UpdateEvent {
        public final String issueKey;
        public final String status;
        public final String eventType;
        public final long timestamp;
        
        public UpdateEvent(String issueKey, String status, String eventType, long timestamp) {
            this.issueKey = issueKey;
            this.status = status;
            this.eventType = eventType;
            this.timestamp = timestamp;
        }
    }
    
    public static class ProjectUpdateInfo {
        private final String projectKey;
        private final List<UpdateEvent> recentUpdates;
        private long lastUpdateTimestamp;
        private int updateCount;
        
        public ProjectUpdateInfo(String projectKey) {
            this.projectKey = projectKey;
            this.recentUpdates = new ArrayList<>();
            this.lastUpdateTimestamp = System.currentTimeMillis();
            this.updateCount = 0;
        }
        
        public void addUpdate(UpdateEvent event) {
            recentUpdates.add(event);
            if (recentUpdates.size() > 50) {
                recentUpdates.remove(recentUpdates.size() - 1);
            }
            lastUpdateTimestamp = event.timestamp;
            updateCount++;
        }
        
        public String getProjectKey() { return projectKey; }
        public List<UpdateEvent> getRecentUpdates() { return recentUpdates; }
        public long getLastUpdateTimestamp() { return lastUpdateTimestamp; }
        public int getUpdateCount() { return updateCount; }
    }
}
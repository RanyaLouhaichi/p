package com.jurix.ai.service;

import com.atlassian.cache.Cache;
import com.atlassian.cache.CacheManager;
import com.atlassian.cache.CacheSettingsBuilder;
import com.atlassian.jira.component.ComponentAccessor;
import com.atlassian.jira.user.ApplicationUser;
import com.google.gson.Gson;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.inject.Inject;
import javax.inject.Named;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

@Named
public class ArticleGenerationService {
    
    private static final Logger log = LoggerFactory.getLogger(ArticleGenerationService.class);
    private final Gson gson = new Gson();
    
    // In-memory storage for article data and notifications
    private final Map<String, ArticleData> articleStorage = new ConcurrentHashMap<>();
    private final Map<String, List<Notification>> userNotifications = new ConcurrentHashMap<>();
    private final Set<String> generationInProgress = ConcurrentHashMap.newKeySet();
    
    // Cache for temporary data
    private final Cache<String, String> cache;
    
    @Inject
    public ArticleGenerationService(CacheManager cacheManager) {
        this.cache = cacheManager.getCache(
            "com.jurix.ai.articleCache",
            null,
            new CacheSettingsBuilder()
                .expireAfterWrite(24, TimeUnit.HOURS)
                .maxEntries(1000)
                .build()
        );
    }
    
    public boolean isArticleGenerationInProgress(String cacheKey) {
        return generationInProgress.contains(cacheKey);
    }
    
    public void markGenerationInProgress(String cacheKey) {
        generationInProgress.add(cacheKey);
        // Auto-remove after 10 minutes to prevent stuck states
        new Timer().schedule(new TimerTask() {
            @Override
            public void run() {
                generationInProgress.remove(cacheKey);
            }
        }, 600000); // 10 minutes
    }
    
    public void markGenerationComplete(String cacheKey) {
        generationInProgress.remove(cacheKey);
    }
    
    public void storeArticleData(String issueKey, Map<String, Object> articleData) {
        ArticleData data = new ArticleData();
        data.issueKey = issueKey;
        data.article = (Map<String, Object>) articleData.get("article");
        data.status = (String) articleData.get("status");
        data.createdAt = System.currentTimeMillis();
        data.version = getArticleVersion(articleData);
        
        articleStorage.put(issueKey, data);
        cache.put("article:" + issueKey, gson.toJson(data));
        
        log.info("Stored article data for issue: {}", issueKey);
    }
    
    public void storeGenerationError(String issueKey, String error) {
        ArticleData data = new ArticleData();
        data.issueKey = issueKey;
        data.status = "error";
        data.error = error;
        data.createdAt = System.currentTimeMillis();
        
        articleStorage.put(issueKey, data);
        cache.put("article:" + issueKey, gson.toJson(data));
    }
    
    public void createNotification(String issueKey, String issueSummary) {
        ApplicationUser currentUser = ComponentAccessor.getJiraAuthenticationContext().getLoggedInUser();
        if (currentUser == null) {
            log.warn("No authenticated user for notification");
            return;
        }
        
        String userKey = currentUser.getKey();
        
        Notification notification = new Notification();
        notification.id = UUID.randomUUID().toString();
        notification.issueKey = issueKey;
        notification.title = "AI Article Generated";
        notification.message = "An article has been generated for: " + issueSummary;
        notification.timestamp = System.currentTimeMillis();
        notification.read = false;
        notification.type = "article_ready";
        
        userNotifications.computeIfAbsent(userKey, k -> new ArrayList<>()).add(notification);
        
        // Store in cache for persistence
        cache.put("notification:" + userKey + ":" + notification.id, gson.toJson(notification));
        
        log.info("Created notification for user: {}", userKey);
    }
    
    public List<Notification> getUserNotifications(String userKey) {
        List<Notification> notifications = userNotifications.get(userKey);
        if (notifications == null) {
            return new ArrayList<>();
        }
        
        // Sort by timestamp descending
        notifications.sort((a, b) -> Long.compare(b.timestamp, a.timestamp));
        
        // Return only unread or recent notifications
        long cutoffTime = System.currentTimeMillis() - TimeUnit.HOURS.toMillis(24);
        return notifications.stream()
            .filter(n -> !n.read || n.timestamp > cutoffTime)
            .limit(10)
            .collect(java.util.stream.Collectors.toList());
    }
    
    public void markNotificationRead(String userKey, String notificationId) {
        List<Notification> notifications = userNotifications.get(userKey);
        if (notifications != null) {
            notifications.stream()
                .filter(n -> n.id.equals(notificationId))
                .forEach(n -> {
                    n.read = true;
                    cache.put("notification:" + userKey + ":" + n.id, gson.toJson(n));
                });
        }
    }
    
    public ArticleData getArticleData(String issueKey) {
        // Try memory first
        ArticleData data = articleStorage.get(issueKey);
        if (data != null) {
            return data;
        }
        
        // Try cache
        String cached = cache.get("article:" + issueKey);
        if (cached != null) {
            data = gson.fromJson(cached, ArticleData.class);
            articleStorage.put(issueKey, data);
            return data;
        }
        
        return null;
    }
    
    public void updateArticleFeedback(String issueKey, String feedback, String action) {
        ArticleData data = getArticleData(issueKey);
        if (data != null && data.article != null) {
            // Add feedback to history
            List<Map<String, Object>> feedbackHistory = (List<Map<String, Object>>) 
                data.article.computeIfAbsent("feedback_history", k -> new ArrayList<>());
            
            Map<String, Object> feedbackEntry = new HashMap<>();
            feedbackEntry.put("feedback", feedback);
            feedbackEntry.put("action", action);
            feedbackEntry.put("timestamp", System.currentTimeMillis());
            feedbackEntry.put("user", getCurrentUsername());
            
            feedbackHistory.add(feedbackEntry);
            
            // Update version if refined
            if ("refine".equals(action)) {
                data.version++;
                data.article.put("version", data.version);
            } else if ("approve".equals(action)) {
                data.article.put("approval_status", "approved");
                data.article.put("approved_at", System.currentTimeMillis());
            }
            
            // Save updates
            articleStorage.put(issueKey, data);
            cache.put("article:" + issueKey, gson.toJson(data));
        }
    }
    
    private int getArticleVersion(Map<String, Object> articleData) {
        if (articleData.containsKey("article")) {
            Map<String, Object> article = (Map<String, Object>) articleData.get("article");
            if (article.containsKey("version")) {
                return ((Number) article.get("version")).intValue();
            }
        }
        return 1;
    }
    
    private String getCurrentUsername() {
        ApplicationUser user = ComponentAccessor.getJiraAuthenticationContext().getLoggedInUser();
        return user != null ? user.getDisplayName() : "System";
    }
    
    // Data classes
    public static class ArticleData {
        public String issueKey;
        public Map<String, Object> article;
        public String status;
        public String error;
        public long createdAt;
        public int version;
    }
    
    public static class Notification {
        public String id;
        public String issueKey;
        public String title;
        public String message;
        public long timestamp;
        public boolean read;
        public String type;
    }
}
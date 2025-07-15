package com.jurix.ai.service;

import com.atlassian.cache.Cache;
import com.atlassian.cache.CacheManager;
import com.atlassian.cache.CacheSettingsBuilder;
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
    
    // In-memory storage
    private final Map<String, ArticleData> articleStorage = new ConcurrentHashMap<>();
    private final Set<String> generationInProgress = ConcurrentHashMap.newKeySet();
    
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
        log.info("ArticleGenerationService initialized");
    }
    
    public boolean isArticleGenerationInProgress(String cacheKey) {
        return generationInProgress.contains(cacheKey);
    }
    
    public void markGenerationInProgress(String cacheKey) {
        generationInProgress.add(cacheKey);
        // Auto-remove after 10 minutes
        new Timer().schedule(new TimerTask() {
            @Override
            public void run() {
                generationInProgress.remove(cacheKey);
            }
        }, 600000);
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
        // Simple notification - just log for now
        log.info("Article ready for issue: {} - {}", issueKey, issueSummary);
    }
    
    public ArticleData getArticleData(String issueKey) {
        ArticleData data = articleStorage.get(issueKey);
        if (data != null) {
            return data;
        }
        
        String cached = cache.get("article:" + issueKey);
        if (cached != null) {
            data = gson.fromJson(cached, ArticleData.class);
            articleStorage.put(issueKey, data);
            return data;
        }
        
        return null;
    }
    
    // Simple data class
    public static class ArticleData {
        public String issueKey;
        public Map<String, Object> article;
        public String status;
        public String error;
        public long createdAt;
    }
}
package com.jurix.ai.ao;

import net.java.ao.Entity;
import net.java.ao.Preload;
import net.java.ao.schema.Table;

@Preload
@Table("AI_ANALYTICS")
public interface AIAnalytics extends Entity {
    String getProjectKey();
    void setProjectKey(String projectKey);
    
    String getMetricsJson();
    void setMetricsJson(String metricsJson);
    
    Long getCreatedAt();
    void setCreatedAt(Long createdAt);
}
package com.jurix.ai.ao;

import net.java.ao.Entity;
import net.java.ao.Preload;
import net.java.ao.schema.Table;
import net.java.ao.schema.Indexed;

@Preload
@Table("DASHBOARD_UPDATE")
public interface DashboardUpdate extends Entity {
    @Indexed
    String getProjectKey();
    void setProjectKey(String projectKey);
    
    String getIssueKey();
    void setIssueKey(String issueKey);
    
    String getEventType();
    void setEventType(String eventType);
    
    String getStatus();
    void setStatus(String status);
    
    @Indexed
    Long getTimestamp();
    void setTimestamp(Long timestamp);
}
package com.jurix.ai.ao;

import net.java.ao.Entity;
import net.java.ao.Preload;
import net.java.ao.schema.StringLength;
import net.java.ao.schema.Table;

@Preload
@Table("AI_GENERATED_ARTICLE")
public interface GeneratedArticle extends Entity {
    String getIssueKey();
    void setIssueKey(String issueKey);
    
    String getTitle();
    void setTitle(String title);
    
    @StringLength(StringLength.UNLIMITED)
    String getContent();
    void setContent(String content);
    
    String getStatus();
    void setStatus(String status);
    
    Long getCreatedAt();
    void setCreatedAt(Long createdAt);
    
    Long getUpdatedAt();
    void setUpdatedAt(Long updatedAt);
}
package com.jurix.ai.ao;

import net.java.ao.Entity;
import net.java.ao.Preload;
import net.java.ao.schema.Table;

@Preload
@Table("AI_PREDICTION")
public interface Prediction extends Entity {
    String getProjectKey();
    void setProjectKey(String projectKey);
    
    String getPredictionType();
    void setPredictionType(String predictionType);
    
    String getPredictionJson();
    void setPredictionJson(String predictionJson);
    
    Double getProbability();
    void setProbability(Double probability);
    
    Long getCreatedAt();
    void setCreatedAt(Long createdAt);
}
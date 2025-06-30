package com.jurix.ai.api;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Arrays;

public class JurixApiClient {
    
    private static final Logger log = LoggerFactory.getLogger(JurixApiClient.class);
    private final Gson gson;
    
    // Singleton instance
    private static JurixApiClient instance;
    
    private JurixApiClient() {
        this.gson = new GsonBuilder()
            .setDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
            .create();
    }
    
    public static synchronized JurixApiClient getInstance() {
        if (instance == null) {
            instance = new JurixApiClient();
        }
        return instance;
    }
    
    // Mock methods that return data without external API calls
    
    public ChatResponse askOrchestrator(String query, String conversationId) {
        log.info("Mock chat request: {}", query);
        
        ChatResponse response = new ChatResponse();
        response.query = query;
        response.response = "Based on your project data, I can see that your team is performing well. " +
                           "The current sprint velocity is 45 points, which is above your average.";
        response.recommendations = Arrays.asList(
            "Review items in 'blocked' status",
            "Consider breaking down large stories",
            "Schedule a retrospective to discuss improvements"
        );
        
        return response;
    }
    
    public DashboardResponse getDashboard(String projectId) {
        log.info("Mock dashboard request for project: {}", projectId);
        
        DashboardResponse response = new DashboardResponse();
        response.projectId = projectId;
        response.metrics = createMockMetrics();
        response.predictions = createMockPredictions();
        response.recommendations = Arrays.asList(
            "Your sprint velocity has increased by 15% over the last 3 sprints",
            "Consider addressing the 3 blocked items in the current sprint",
            "Team efficiency is at 78% - above the target of 70%"
        );
        response.workflowStatus = "success";
        
        return response;
    }
    
    public PredictionsResponse getPredictions(String projectId) {
        log.info("Mock predictions request for project: {}", projectId);
        
        PredictionsResponse response = new PredictionsResponse();
        response.projectId = projectId;
        response.analysisType = "comprehensive";
        response.predictions = createMockPredictions();
        response.recommendations = Arrays.asList(
            "High probability (85%) of completing current sprint on time",
            "Potential bottleneck detected in code review process",
            "Team capacity is well-balanced across skill sets"
        );
        response.workflowStatus = "success";
        
        return response;
    }
    
    public ArticleResponse generateArticle(String ticketId) {
        log.info("Mock article generation for ticket: {}", ticketId);
        
        ArticleResponse response = new ArticleResponse();
        response.ticketId = ticketId;
        response.projectId = "DEMO";
        response.currentState = new HashMap<>();
        response.currentState.put("workflow_status", "success");
        response.currentState.put("article", Map.of(
            "title", "Resolution Guide: " + ticketId,
            "content", "This issue was successfully resolved. Key learnings and steps taken have been documented.",
            "generated_at", System.currentTimeMillis()
        ));
        
        return response;
    }
    
    public void notifyTicketResolved(String ticketId, Map<String, Object> ticketData) {
        log.info("Mock webhook notification for resolved ticket: {}", ticketId);
        // In a real implementation, this would send to an external service
    }
    
    private Map<String, Object> createMockMetrics() {
        Map<String, Object> metrics = new HashMap<>();
        metrics.put("throughput", 45);
        metrics.put("cycle_time", 3.2);
        metrics.put("bottlenecks", Map.of(
            "To Do", 15,
            "In Progress", 8,
            "In Review", 3,
            "Done", 45
        ));
        return metrics;
    }
    
    private Map<String, Object> createMockPredictions() {
        Map<String, Object> predictions = new HashMap<>();
        predictions.put("sprint_completion", Map.of(
            "probability", 0.85,
            "risk_level", "low",
            "reasoning", "Based on current velocity and remaining work",
            "confidence_interval", Arrays.asList(0.80, 0.90)
        ));
        predictions.put("velocity_forecast", Map.of(
            "next_week_estimate", 48.5,
            "trend", "increasing",
            "insights", "Team velocity showing consistent improvement"
        ));
        predictions.put("risks", Arrays.asList(
            Map.of(
                "description", "3 items blocked for more than 2 days",
                "severity", "medium",
                "mitigation", "Schedule blocker resolution meeting"
            ),
            Map.of(
                "description", "Upcoming team member vacation",
                "severity", "low",
                "mitigation", "Plan for reduced capacity in next sprint"
            )
        ));
        return predictions;
    }
    
    // Response DTOs
    public static class ChatResponse {
        public String query;
        public String response;
        public List<String> recommendations;
        public Map<String, Object> predictions;
        public String workflowStatus;
    }
    
    public static class DashboardResponse {
        public String projectId;
        public List<Map<String, Object>> tickets;
        public Map<String, Object> metrics;
        public Map<String, Object> visualizationData;
        public List<String> recommendations;
        public String report;
        public Map<String, Object> predictions;
        public String workflowStatus;
        public String dashboardId;
    }
    
    public static class PredictionsResponse {
        public String projectId;
        public String analysisType;
        public Map<String, Object> predictions;
        public List<String> recommendations;
        public String workflowStatus;
    }
    
    public static class ArticleResponse {
        public String ticketId;
        public String projectId;
        public List<Map<String, Object>> workflowHistory;
        public Map<String, Object> currentState;
    }
}
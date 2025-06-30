package com.jurix.ai.rest;

import com.atlassian.jira.component.ComponentAccessor;
import com.atlassian.jira.issue.IssueManager;
import com.atlassian.jira.project.Project;
import com.atlassian.jira.project.ProjectManager;
import com.atlassian.jira.security.JiraAuthenticationContext;
import com.atlassian.jira.user.ApplicationUser;
import com.google.gson.Gson;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import java.util.HashMap;
import java.util.Map;
import java.util.Arrays;

@Path("/")
@Consumes({MediaType.APPLICATION_JSON})
@Produces({MediaType.APPLICATION_JSON})
public class JurixRestResource {
    
    private static final Logger log = LoggerFactory.getLogger(JurixRestResource.class);
    private final Gson gson = new Gson();
    
    @GET
    @Path("/health")
    public Response health() {
        Map<String, Object> status = new HashMap<>();
        status.put("status", "healthy");
        status.put("version", "1.0.0");
        status.put("timestamp", System.currentTimeMillis());
        
        return Response.ok(status).build();
    }
    
    @POST
    @Path("/chat")
    public Response chat(ChatRequest request) {
        JiraAuthenticationContext authContext = ComponentAccessor.getJiraAuthenticationContext();
        ApplicationUser user = authContext.getLoggedInUser();
        
        if (user == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        
        // Mock chat response
        Map<String, Object> response = new HashMap<>();
        response.put("query", request.getQuery());
        response.put("response", "I'm analyzing your project data. Based on current metrics, your team velocity is trending upward. Would you like specific insights about sprint performance?");
        response.put("recommendations", Arrays.asList(
            "Review sprint backlog items",
            "Check team velocity trends",
            "Analyze cycle time metrics"
        ));
        
        return Response.ok(response).build();
    }
    
    @POST
    @Path("/dashboard/refresh")
    public Response refreshDashboard(@QueryParam("projectKey") String projectKey) {
        JiraAuthenticationContext authContext = ComponentAccessor.getJiraAuthenticationContext();
        ApplicationUser user = authContext.getLoggedInUser();
        
        if (user == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        
        // Verify project access
        if (!hasProjectAccess(projectKey, user)) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }
        
        // Mock dashboard data
        Map<String, Object> dashboard = new HashMap<>();
        dashboard.put("projectId", projectKey);
        dashboard.put("metrics", createMockMetrics());
        dashboard.put("predictions", createMockPredictions());
        dashboard.put("recommendations", Arrays.asList(
            "Sprint velocity is improving",
            "Consider addressing technical debt",
            "Review blocked items"
        ));
        
        return Response.ok(dashboard).build();
    }
    
    @GET
    @Path("/predictions/{projectKey}")
    public Response getPredictions(@PathParam("projectKey") String projectKey) {
        JiraAuthenticationContext authContext = ComponentAccessor.getJiraAuthenticationContext();
        ApplicationUser user = authContext.getLoggedInUser();
        
        if (user == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        
        if (!hasProjectAccess(projectKey, user)) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }
        
        Map<String, Object> predictions = new HashMap<>();
        predictions.put("projectId", projectKey);
        predictions.put("analysisType", "comprehensive");
        predictions.put("predictions", createMockPredictions());
        predictions.put("workflowStatus", "complete");
        
        return Response.ok(predictions).build();
    }
    
    private boolean hasProjectAccess(String projectKey, ApplicationUser user) {
        ProjectManager projectManager = ComponentAccessor.getProjectManager();
        Project project = projectManager.getProjectByCurrentKey(projectKey);
        
        if (project == null) {
            return false;
        }
        
        return ComponentAccessor.getPermissionManager()
            .hasPermission(com.atlassian.jira.permission.ProjectPermissions.BROWSE_PROJECTS, 
                          project, user);
    }
    
    private Map<String, Object> createMockMetrics() {
        Map<String, Object> metrics = new HashMap<>();
        metrics.put("throughput", 42);
        metrics.put("cycle_time", 3.5);
        metrics.put("efficiency", 78);
        metrics.put("activeIssues", 23);
        return metrics;
    }
    
    private Map<String, Object> createMockPredictions() {
        Map<String, Object> predictions = new HashMap<>();
        predictions.put("sprint_completion", Map.of(
            "probability", 0.82,
            "confidence", "high",
            "factors", Arrays.asList("velocity trend", "remaining work", "team availability")
        ));
        predictions.put("risks", Arrays.asList(
            Map.of(
                "description", "3 blockers in current sprint",
                "severity", "medium",
                "mitigation", "Schedule blocker review meeting"
            )
        ));
        return predictions;
    }
    
    // Request DTOs
    public static class ChatRequest {
        private String query;
        private String conversationId;
        
        public String getQuery() { return query; }
        public void setQuery(String query) { this.query = query; }
        public String getConversationId() { return conversationId; }
        public void setConversationId(String conversationId) { this.conversationId = conversationId; }
    }
}
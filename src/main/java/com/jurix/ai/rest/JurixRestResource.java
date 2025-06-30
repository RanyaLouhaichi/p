package com.jurix.ai.rest;

import com.atlassian.jira.component.ComponentAccessor;
import com.atlassian.jira.issue.IssueManager;
import com.atlassian.jira.project.Project;
import com.atlassian.jira.project.ProjectManager;
import com.atlassian.jira.security.JiraAuthenticationContext;
import com.atlassian.jira.user.ApplicationUser;
import com.google.gson.Gson;
import com.jurix.ai.api.JurixApiClient;
import com.jurix.ai.service.DashboardService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;

import javax.inject.Named;
import javax.inject.Inject;

@Named("jurixRestResource")
@Path("/")
@Consumes({MediaType.APPLICATION_JSON})
@Produces({MediaType.APPLICATION_JSON})
public class JurixRestResource {
    // Keep the @Inject on the constructor
    
    private static final Logger log = LoggerFactory.getLogger(JurixRestResource.class);
    
    private final JiraAuthenticationContext authContext;
    private final JurixApiClient apiClient;
    private final DashboardService dashboardService;
    private final Gson gson = new Gson();
    
    public JurixRestResource(JiraAuthenticationContext authContext,
                            JurixApiClient apiClient,
                            DashboardService dashboardService) {
        this.authContext = authContext;
        this.apiClient = apiClient;
        this.dashboardService = dashboardService;
    }
    
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
        ApplicationUser user = authContext.getLoggedInUser();
        if (user == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        
        try {
            // Add user context to conversation ID
            String conversationId = request.getConversationId();
            if (conversationId == null) {
                conversationId = "jira-" + user.getKey() + "-" + System.currentTimeMillis();
            }
            
            JurixApiClient.ChatResponse response = 
                apiClient.askOrchestrator(request.getQuery(), conversationId).get();
            
            return Response.ok(response).build();
            
        } catch (InterruptedException | ExecutionException e) {
            log.error("Chat request failed", e);
            return Response.serverError()
                .entity(Map.of("error", "Failed to process chat request"))
                .build();
        }
    }
    
    @POST
    @Path("/dashboard/refresh")
    public Response refreshDashboard(@QueryParam("projectKey") String projectKey) {
        ApplicationUser user = authContext.getLoggedInUser();
        if (user == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        
        // Verify project access
        if (!hasProjectAccess(projectKey, user)) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }
        
        try {
            JurixApiClient.DashboardResponse dashboard = 
                apiClient.getDashboard(projectKey).get();
            
            // Broadcast updates via WebSocket
            dashboardService.broadcastDashboardUpdate(projectKey, dashboard);
            
            return Response.ok(dashboard).build();
            
        } catch (InterruptedException | ExecutionException e) {
            log.error("Dashboard refresh failed", e);
            return Response.serverError()
                .entity(Map.of("error", "Failed to refresh dashboard"))
                .build();
        }
    }
    
    @GET
    @Path("/predictions/{projectKey}")
    public Response getPredictions(@PathParam("projectKey") String projectKey) {
        ApplicationUser user = authContext.getLoggedInUser();
        if (user == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        
        if (!hasProjectAccess(projectKey, user)) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }
        
        try {
            JurixApiClient.PredictionsResponse predictions = 
                apiClient.getPredictions(projectKey).get();
            
            return Response.ok(predictions).build();
            
        } catch (InterruptedException | ExecutionException e) {
            log.error("Failed to get predictions", e);
            return Response.serverError()
                .entity(Map.of("error", "Failed to get predictions"))
                .build();
        }
    }
    
    @POST
    @Path("/article/generate")
    public Response generateArticle(ArticleRequest request) {
        ApplicationUser user = authContext.getLoggedInUser();
        if (user == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        
        // Verify issue access
        IssueManager issueManager = ComponentAccessor.getIssueManager();
        var issue = issueManager.getIssueObject(request.getTicketId());
        
        if (issue == null || !hasIssueAccess(issue, user)) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }
        
        try {
            JurixApiClient.ArticleResponse response = 
                apiClient.generateArticle(request.getTicketId()).get();
            
            return Response.ok(response).build();
            
        } catch (InterruptedException | ExecutionException e) {
            log.error("Article generation failed", e);
            return Response.serverError()
                .entity(Map.of("error", "Failed to generate article"))
                .build();
        }
    }
    
    @GET
    @Path("/article/{ticketId}")
    public Response getArticle(@PathParam("ticketId") String ticketId) {
        ApplicationUser user = authContext.getLoggedInUser();
        if (user == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        
        // TODO: Implement article retrieval from storage
        return Response.ok(Map.of(
            "ticketId", ticketId,
            "status", "pending"
        )).build();
    }
    
    @POST
    @Path("/webhook/issue-resolved")
    public Response webhookIssueResolved(Map<String, Object> payload) {
        // This is called internally by Jira, no user auth needed
        try {
            log.info("Webhook received for issue resolution");
            
            // Process the webhook asynchronously
            CompletableFuture.runAsync(() -> {
                try {
                    // Extract issue data and trigger article generation
                    Map<String, Object> issue = (Map<String, Object>) payload.get("issue");
                    if (issue != null) {
                        String issueKey = (String) issue.get("key");
                        apiClient.notifyTicketResolved(issueKey, issue);
                    }
                } catch (Exception e) {
                    log.error("Error processing webhook", e);
                }
            });
            
            return Response.status(Response.Status.ACCEPTED).build();

            
        } catch (Exception e) {
            log.error("Webhook processing failed", e);
            return Response.serverError().build();
        }
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
    
    private boolean hasIssueAccess(com.atlassian.jira.issue.Issue issue, ApplicationUser user) {
        return ComponentAccessor.getPermissionManager()
            .hasPermission(com.atlassian.jira.permission.ProjectPermissions.BROWSE_PROJECTS,
                          issue, user);
    }
    
    // Request DTOs
    public static class ChatRequest {
        private String query;
        private String conversationId;
        
        // Getters and setters
        public String getQuery() { return query; }
        public void setQuery(String query) { this.query = query; }
        public String getConversationId() { return conversationId; }
        public void setConversationId(String conversationId) { this.conversationId = conversationId; }
    }
    
    public static class ArticleRequest {
        private String ticketId;
        
        public String getTicketId() { return ticketId; }
        public void setTicketId(String ticketId) { this.ticketId = ticketId; }
    }
}
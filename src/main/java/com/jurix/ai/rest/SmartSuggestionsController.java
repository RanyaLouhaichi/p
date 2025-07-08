package com.jurix.ai.rest;

import javax.inject.Inject;
import javax.inject.Named;
import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import java.util.HashMap;
import java.util.Map;
import java.util.List;
import java.util.ArrayList;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.atlassian.plugins.rest.common.security.AnonymousAllowed;
import com.atlassian.jira.component.ComponentAccessor;
import com.atlassian.jira.issue.IssueManager;
import com.atlassian.jira.issue.MutableIssue;
import com.atlassian.jira.issue.label.Label;
import com.atlassian.jira.bc.project.component.ProjectComponent;
import okhttp3.*;
import com.google.gson.Gson;

@Named
@Path("/suggestions")
public class SmartSuggestionsController {
    private static final Logger log = LoggerFactory.getLogger(SmartSuggestionsController.class);
    private final Gson gson = new Gson();
    private final OkHttpClient httpClient;
    
    @Inject
    public SmartSuggestionsController() {
        this.httpClient = new OkHttpClient.Builder().build();
    }
    
    @POST
    @Path("/retrieve")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    @AnonymousAllowed
    public Response getSuggestionsForIssue(Map<String, Object> requestData) {
        try {
            String issueKey = (String) requestData.get("issue_key");
            log.info("Getting suggestions for issue: {}", issueKey);
            
            // Get issue details from Jira
            IssueManager issueManager = ComponentAccessor.getIssueManager();
            MutableIssue issue = issueManager.getIssueObject(issueKey);
            
            if (issue == null) {
                log.error("Issue not found: {}", issueKey);
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(createErrorResponse("Issue not found"))
                    .build();
            }
            
            // Extract issue details
            Map<String, Object> issueData = new HashMap<>();
            issueData.put("issue_key", issueKey);
            issueData.put("issue_summary", issue.getSummary() != null ? issue.getSummary() : "");
            issueData.put("issue_description", issue.getDescription() != null ? issue.getDescription() : "");
            issueData.put("issue_type", issue.getIssueType() != null ? issue.getIssueType().getName() : "");
            issueData.put("issue_status", issue.getStatus() != null ? issue.getStatus().getName() : "");
            
            // Get labels
            List<String> labels = issue.getLabels().stream()
                .map(Label::getLabel)
                .collect(Collectors.toList());
            issueData.put("labels", labels);
            
            // Get components
            List<String> components = issue.getComponents().stream()
                .map(ProjectComponent::getName)
                .collect(Collectors.toList());
            issueData.put("components", components);
            
            // Get priority
            if (issue.getPriority() != null) {
                issueData.put("priority", issue.getPriority().getName());
            }
            
            // Get assignee
            if (issue.getAssignee() != null) {
                issueData.put("assignee", issue.getAssignee().getDisplayName());
            }
            
            // Get project key
            issueData.put("project_key", issue.getProjectObject().getKey());
            
            log.info("Issue data extracted: summary='{}', type='{}', status='{}', labels={}, components={}", 
                issue.getSummary(), 
                issue.getIssueType().getName(),
                issue.getStatus().getName(),
                labels,
                components
            );
            
            // Call Python backend with complete issue data
            RequestBody body = RequestBody.create(
                okhttp3.MediaType.parse("application/json"),
                gson.toJson(issueData)
            );
            
            Request request = new Request.Builder()
                .url("http://localhost:5001/api/suggest-articles")
                .post(body)
                .build();
            
            try (okhttp3.Response backendResponse = httpClient.newCall(request).execute()) {
                String responseBody = backendResponse.body().string();
                
                if (backendResponse.isSuccessful()) {
                    log.info("Successfully got suggestions from backend");
                    return Response.ok(responseBody).build();
                } else {
                    log.error("Backend error: {}", responseBody);
                    return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                        .entity(createErrorResponse("Failed to get suggestions"))
                        .build();
                }
            }
            
        } catch (Exception e) {
            log.error("Error getting suggestions", e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(createErrorResponse(e.getMessage()))
                .build();
        }
    }
    
    private Map<String, Object> createErrorResponse(String message) {
        Map<String, Object> error = new HashMap<>();
        error.put("status", "error");
        error.put("error", message);
        return error;
    }
}
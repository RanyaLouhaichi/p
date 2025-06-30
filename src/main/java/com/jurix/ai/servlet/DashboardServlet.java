package com.jurix.ai.servlet;

import com.atlassian.jira.component.ComponentAccessor;
import com.atlassian.jira.project.Project;
import com.atlassian.jira.project.ProjectManager;
import com.atlassian.jira.security.JiraAuthenticationContext;
import com.atlassian.jira.user.ApplicationUser;
import com.atlassian.templaterenderer.TemplateRenderer;
import com.atlassian.plugin.spring.scanner.annotation.imports.ComponentImport;
import com.google.gson.Gson;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

import javax.inject.Named;
import javax.inject.Inject;

@Named("dashboardServlet")
public class DashboardServlet extends HttpServlet {
    
    private static final Logger log = LoggerFactory.getLogger(DashboardServlet.class);
    
    @ComponentImport
    private final TemplateRenderer templateRenderer;
    
    private final Gson gson = new Gson();
    
    @Inject
    public DashboardServlet(@ComponentImport TemplateRenderer templateRenderer) {
        this.templateRenderer = templateRenderer;
    }
    
    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response) 
            throws ServletException, IOException {
        
        // Get authentication context
        JiraAuthenticationContext authContext = ComponentAccessor.getJiraAuthenticationContext();
        ApplicationUser user = authContext.getLoggedInUser();
        
        if (user == null) {
            response.sendRedirect(request.getContextPath() + "/login.jsp?os_destination=" + request.getRequestURI());
            return;
        }
        
        // Get project from URL
        String projectKey = request.getParameter("projectKey");
        if (projectKey == null) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Project key is required");
            return;
        }
        
        // Verify project exists and user has access
        ProjectManager projectManager = ComponentAccessor.getProjectManager();
        Project project = projectManager.getProjectByCurrentKey(projectKey);
        
        if (project == null) {
            response.sendError(HttpServletResponse.SC_NOT_FOUND, "Project not found");
            return;
        }
        
        // Check permissions
        if (!ComponentAccessor.getPermissionManager()
                .hasPermission(com.atlassian.jira.permission.ProjectPermissions.BROWSE_PROJECTS, 
                              project, user)) {
            response.sendError(HttpServletResponse.SC_FORBIDDEN, "Access denied");
            return;
        }
        
        // Create mock dashboard data for now
        Map<String, Object> dashboardData = new HashMap<>();
        dashboardData.put("metrics", createMockMetrics());
        dashboardData.put("predictions", createMockPredictions());
        dashboardData.put("recommendations", createMockRecommendations());
        
        // Prepare context for template
        Map<String, Object> context = new HashMap<>();
        context.put("project", project);
        context.put("projectKey", projectKey);
        context.put("projectName", project.getName());
        context.put("dashboardData", gson.toJson(dashboardData));
        context.put("metrics", dashboardData.get("metrics"));
        context.put("predictions", dashboardData.get("predictions"));
        context.put("recommendations", dashboardData.get("recommendations"));
        
        // Add placeholder URLs
        context.put("websocketUrl", "ws://localhost:2990" + request.getContextPath() + "/jurix-ws");
        context.put("apiBaseUrl", request.getContextPath() + "/rest/jurix-api/1.0");
        
        response.setContentType("text/html;charset=utf-8");
        templateRenderer.render("templates/dashboard.vm", context, response.getWriter());
    }
    
    private Map<String, Object> createMockMetrics() {
        Map<String, Object> metrics = new HashMap<>();
        metrics.put("throughput", 45);
        metrics.put("cycle_time", 3.2);
        metrics.put("bottlenecks", Map.of(
            "To Do", 15,
            "In Progress", 8,
            "Done", 45
        ));
        return metrics;
    }
    
    private Map<String, Object> createMockPredictions() {
        Map<String, Object> predictions = new HashMap<>();
        predictions.put("sprint_completion", Map.of(
            "probability", 0.85,
            "risk_level", "medium",
            "reasoning", "Based on current velocity and remaining work"
        ));
        predictions.put("velocity_forecast", Map.of(
            "next_week_estimate", 48.5,
            "trend", "increasing",
            "insights", "Team velocity showing positive trend"
        ));
        return predictions;
    }
    
    private String[] createMockRecommendations() {
        return new String[] {
            "Consider breaking down large stories in the backlog - 3 stories exceed 8 story points",
            "Review items in 'In Review' status - average time there is 2.5 days vs target of 1 day",
            "Team velocity is increasing - consider taking on 2-3 additional story points next sprint"
        };
    }
}
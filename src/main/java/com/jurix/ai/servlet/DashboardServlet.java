package com.jurix.ai.servlet;

import com.atlassian.jira.component.ComponentAccessor;
import com.atlassian.jira.project.Project;
import com.atlassian.jira.project.ProjectManager;
import com.atlassian.jira.security.JiraAuthenticationContext;
import com.atlassian.sal.api.auth.LoginUriProvider;
import com.atlassian.sal.api.user.UserKey;
import com.atlassian.sal.api.user.UserManager;
import com.atlassian.templaterenderer.TemplateRenderer;
import com.google.gson.Gson;
import com.jurix.ai.api.JurixApiClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.URI;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ExecutionException;

import javax.inject.Named;
import javax.inject.Inject;

@Named("dashboardServlet")
public class DashboardServlet extends HttpServlet {
    // Keep the @Inject on the constructor
    
    private static final Logger log = LoggerFactory.getLogger(DashboardServlet.class);
    
    private final UserManager userManager;
    private final LoginUriProvider loginUriProvider;
    private final TemplateRenderer templateRenderer;
    private final JurixApiClient apiClient;
    private final Gson gson = new Gson();
    
    public DashboardServlet(UserManager userManager,
                           LoginUriProvider loginUriProvider,
                           TemplateRenderer templateRenderer,
                           JurixApiClient apiClient) {
        this.userManager = userManager;
        this.loginUriProvider = loginUriProvider;
        this.templateRenderer = templateRenderer;
        this.apiClient = apiClient;
    }
    
    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response) 
            throws ServletException, IOException {
        
        // Check authentication
        UserKey userKey = userManager.getRemoteUserKey(request);
        if (userKey == null) {
            redirectToLogin(request, response);
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
        JiraAuthenticationContext authContext = ComponentAccessor.getJiraAuthenticationContext();
        if (!ComponentAccessor.getPermissionManager()
                .hasPermission(com.atlassian.jira.permission.ProjectPermissions.BROWSE_PROJECTS, 
                              project, authContext.getLoggedInUser())) {
            response.sendError(HttpServletResponse.SC_FORBIDDEN, "Access denied");
            return;
        }
        
        // Load dashboard data
        try {
            JurixApiClient.DashboardResponse dashboardData = 
                apiClient.getDashboard(projectKey).get();
            
            // Prepare context for template
            Map<String, Object> context = new HashMap<>();
            context.put("project", project);
            context.put("projectKey", projectKey);
            context.put("projectName", project.getName());
            context.put("dashboardData", gson.toJson(dashboardData));
            context.put("metrics", dashboardData.metrics);
            context.put("predictions", dashboardData.predictions);
            context.put("recommendations", dashboardData.recommendations);
            
            // Add real-time endpoint info
            context.put("websocketUrl", getWebSocketUrl(request));
            context.put("apiBaseUrl", getApiBaseUrl(request));
            
            response.setContentType("text/html;charset=utf-8");
            templateRenderer.render("templates/dashboard.vm", context, response.getWriter());
            
        } catch (InterruptedException | ExecutionException e) {
            log.error("Failed to load dashboard data", e);
            response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, 
                             "Failed to load dashboard data");
        }
    }
    
    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response) 
            throws ServletException, IOException {
        
        // Check authentication
        UserKey userKey = userManager.getRemoteUserKey(request);
        if (userKey == null) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }
        
        String action = request.getParameter("action");
        String projectKey = request.getParameter("projectKey");
        
        if ("refresh".equals(action)) {
            // Refresh dashboard data
            try {
                JurixApiClient.DashboardResponse dashboardData = 
                    apiClient.getDashboard(projectKey).get();
                
                response.setContentType("application/json");
                response.getWriter().write(gson.toJson(dashboardData));
                
            } catch (InterruptedException | ExecutionException e) {
                log.error("Failed to refresh dashboard", e);
                response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            }
            
        } else if ("getPredictions".equals(action)) {
            // Get latest predictions
            try {
                JurixApiClient.PredictionsResponse predictions = 
                    apiClient.getPredictions(projectKey).get();
                
                response.setContentType("application/json");
                response.getWriter().write(gson.toJson(predictions));
                
            } catch (InterruptedException | ExecutionException e) {
                log.error("Failed to get predictions", e);
                response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            }
            
        } else {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Invalid action");
        }
    }
    
    private void redirectToLogin(HttpServletRequest request, HttpServletResponse response) 
            throws IOException {
        response.sendRedirect(loginUriProvider.getLoginUri(getUri(request)).toASCIIString());
    }
    
    private URI getUri(HttpServletRequest request) {
        StringBuffer builder = request.getRequestURL();
        if (request.getQueryString() != null) {
            builder.append("?");
            builder.append(request.getQueryString());
        }
        return URI.create(builder.toString());
    }
    
    private String getWebSocketUrl(HttpServletRequest request) {
        String scheme = request.isSecure() ? "wss" : "ws";
        return String.format("%s://%s:%d%s/jurix-ws",
            scheme,
            request.getServerName(),
            request.getServerPort(),
            request.getContextPath()
        );
    }
    
    private String getApiBaseUrl(HttpServletRequest request) {
        return String.format("%s://%s:%d%s/rest/jurix-api/1.0",
            request.getScheme(),
            request.getServerName(),
            request.getServerPort(),
            request.getContextPath()
        );
    }
}
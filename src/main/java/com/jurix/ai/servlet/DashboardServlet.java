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
        
        // Prepare context for template - NO MORE MOCK DATA
        Map<String, Object> context = new HashMap<>();
        context.put("project", project);
        context.put("projectKey", projectKey);
        context.put("projectName", project.getName());
        
        // Remove all mock data - will be loaded from backend
        context.put("dashboardData", "{}"); // Empty JSON, will be loaded by JS
        
        // Backend API configuration
        context.put("apiBaseUrl", "http://localhost:5001");
        
        // Pass project key to JavaScript
        context.put("jsProjectKey", projectKey);
        
        response.setContentType("text/html;charset=utf-8");
        templateRenderer.render("templates/dashboard.vm", context, response.getWriter());
    }
}
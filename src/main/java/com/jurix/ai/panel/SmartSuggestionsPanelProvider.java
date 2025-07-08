package com.jurix.ai.panel;

import com.atlassian.jira.plugin.webfragment.contextproviders.AbstractJiraContextProvider;
import com.atlassian.jira.plugin.webfragment.model.JiraHelper;
import com.atlassian.jira.user.ApplicationUser;
import com.atlassian.jira.issue.Issue;

import javax.inject.Named;
import java.util.HashMap;
import java.util.Map;

@Named
public class SmartSuggestionsPanelProvider extends AbstractJiraContextProvider {
    
    @Override
    public Map<String, Object> getContextMap(ApplicationUser applicationUser, JiraHelper jiraHelper) {
        Map<String, Object> contextMap = new HashMap<>();
        
        Issue issue = (Issue) jiraHelper.getContextParams().get("issue");
        if (issue != null) {
            contextMap.put("issue", issue);
            contextMap.put("issueKey", issue.getKey());
            contextMap.put("issueSummary", issue.getSummary());
            contextMap.put("issueType", issue.getIssueType().getName());
            contextMap.put("issueStatus", issue.getStatus().getName());
            contextMap.put("smartSuggestionsEnabled", true);
        }
        
        return contextMap;
    }
}
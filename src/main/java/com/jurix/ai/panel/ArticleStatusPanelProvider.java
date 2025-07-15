package com.jurix.ai.panel;

import com.atlassian.jira.plugin.webfragment.contextproviders.AbstractJiraContextProvider;
import com.atlassian.jira.plugin.webfragment.model.JiraHelper;
import com.atlassian.jira.user.ApplicationUser;
import com.atlassian.jira.issue.Issue;
import com.jurix.ai.service.ArticleGenerationService;

import javax.inject.Inject;
import javax.inject.Named;
import java.util.HashMap;
import java.util.Map;

@Named
public class ArticleStatusPanelProvider extends AbstractJiraContextProvider {
    
    private final ArticleGenerationService articleService;
    
    @Inject
    public ArticleStatusPanelProvider(ArticleGenerationService articleService) {
        this.articleService = articleService;
    }
    
    @Override
    public Map<String, Object> getContextMap(ApplicationUser applicationUser, JiraHelper jiraHelper) {
        Map<String, Object> contextMap = new HashMap<>();
        
        Issue issue = (Issue) jiraHelper.getContextParams().get("issue");
        if (issue != null) {
            contextMap.put("issue", issue);
            contextMap.put("issueKey", issue.getKey());
            
            // Check if article exists
            ArticleGenerationService.ArticleData articleData = articleService.getArticleData(issue.getKey());
            
            if (articleData != null) {
                contextMap.put("hasArticle", true);
                contextMap.put("articleStatus", articleData.status);
                contextMap.put("articleVersion", articleData.version);
                
                if (articleData.article != null) {
                    contextMap.put("approvalStatus", articleData.article.get("approval_status"));
                }
            } else {
                contextMap.put("hasArticle", false);
            }
        }
        
        return contextMap;
    }
}
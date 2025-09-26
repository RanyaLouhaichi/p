# SmartSuggestionsPanelProvider

## Overview

`SmartSuggestionsPanelProvider` is a Jira context provider that supplies context data for displaying AI-powered smart suggestions in issue panels.

## Responsibilities

- Supplies context variables for issue panels, including suggested articles and relevance scores.
- Integrates with backend or service layer to fetch suggestions for the current issue.

## Main Method

- `getContextMap(ApplicationUser applicationUser, JiraHelper jiraHelper)`: Returns a map of context variables for the panel.

## Usage

Used in Jira web panels to display smart suggestions for the current issue.

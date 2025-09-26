# IssueEventListener

## Overview

`IssueEventListener` listens for Jira issue events and coordinates updates to the dashboard and article generation processes. It supports both in-memory and Redis-based tracking for article generation, and notifies the Python backend of relevant changes.

## Responsibilities

- Registers with Jira's event publisher to receive issue events.
- Handles dashboard update recording and notification to the backend.
- Optionally uses Redis for persistent tracking of article generation status.
- Cleans up stale in-progress entries and manages registration lifecycle.

## Usage

Automatically invoked by Jira when issue events occur. Used for real-time dashboard updates and integration with AI services.
- `onIssueEvent(IssueEvent event)`: Handles incoming Jira issue events.
- `handleDashboardUpdate(String projectKey, Issue issue, String eventType)`: Records updates and notifies backend.
- `notifyPythonBackend(String projectKey, String updateType, Issue issue)`: Sends update notifications to the Python backend.
- Redis/in-memory helpers for tracking article generation status.

## Usage

Automatically invoked by Jira when issue events occur. Used for real-time dashboard updates and integration with AI services.


# DashboardUpdate

## Overview

`DashboardUpdate` is an Active Objects (AO) interface representing a single update event for a Jira project or issue, used for dashboard activity tracking.

## Fields

- `projectKey` (String, Indexed): The Jira project key.
- `issueKey` (String): The Jira issue key related to the update.
- `eventType` (String): The type of event (e.g., created, updated, resolved).
- `status` (String): The status of the issue at the time of the event.
- `timestamp` (Long, Indexed): The time the update occurred (epoch ms).

## Usage

Used to persist update events for analytics, dashboard refresh, and audit purposes.

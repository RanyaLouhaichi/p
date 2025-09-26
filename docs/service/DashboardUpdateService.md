# DashboardUpdateService

## Overview

`DashboardUpdateService` tracks and manages update events for Jira projects. It provides in-memory storage for recent updates, supports efficient retrieval of updates since a given timestamp, and exposes data structures for project update information.

## Responsibilities

- Records update events (issue changes, status, event type, timestamp) for each project.
- Maintains a bounded list of recent updates per project.
- Provides methods to query updates since a specific timestamp.
- Supplies a `ProjectUpdateInfo` data structure for reporting and analytics.

## Main Methods

- `recordUpdate(String projectKey, UpdateEvent event)`
- `getUpdatesSince(String projectKey, long sinceTimestamp)`
- `getProjectUpdateInfo(String projectKey)`

## Data Structures

- **UpdateEvent**: Represents a single update event.
- **ProjectUpdateInfo**: Contains projectKey, recent updates, last update timestamp, and update count.

## Usage

Used by event listeners and REST resources to track and report on project activity and changes.


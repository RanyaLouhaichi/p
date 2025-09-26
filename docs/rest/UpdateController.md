# UpdateController

## Overview

`UpdateController` is a REST resource that provides endpoints for querying recent updates and activity for Jira projects. It is used to support real-time dashboard refresh and notification features.

## Endpoints

- `GET /update/{projectKey}`: Retrieves recent updates for a project.
- `GET /update/{projectKey}/since/{timestamp}`: Retrieves updates since a specific timestamp.

## Features

- Integrates with `DashboardUpdateService` to fetch update data.
- Returns structured JSON responses for frontend consumption.

## Usage

Used by the dashboard frontend and notification systems to display recent project activity.

# JurixRestResource

## Overview

`JurixRestResource` exposes REST endpoints for health checks, chat, dashboard refresh, and article generation triggers. It serves as a core integration point between Jira, the plugin, and the Python backend.

## Endpoints

- `GET /health`: Returns the health status of the plugin and backend connectivity.
- `POST /chat`: Forwards chat queries to the backend and returns AI responses.
- `POST /dashboard/refresh`: Refreshes dashboard data for a project.
- `POST /trigger-article/{issueKey}`: Triggers article generation for a Jira issue.

## Features

- Uses Java's `HttpURLConnection` for backend communication.
- Integrates with Jira's authentication and issue management APIs.
- Provides fallback responses and mock data in case of backend failures.

## Usage

Used by frontend and integrations for core plugin operations.
- Returns appropriate HTTP status codes and error messages for authentication failures, backend errors, and missing issues.
- Provides fallback mock data for dashboard refresh if backend is unavailable.



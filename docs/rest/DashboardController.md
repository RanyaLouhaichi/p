# DashboardController

## Overview

`DashboardController` is a REST resource that provides endpoints for retrieving dashboard data and generating forecasts for Jira projects. It acts as a proxy between the Jira plugin and the Python backend.

## Endpoints

- `GET /dashboard/{projectKey}`: Retrieves dashboard data for a project.
- `POST /dashboard/forecast/{projectKey}`: Generates a forecast for a project.
- `GET /dashboard/test`: Returns a status message for testing connectivity.

## Features

- Uses OkHttp for HTTP communication with the backend.
- Handles both GET and POST requests, forwarding payloads as needed.
- Provides anonymous access for dashboard data and forecasts.

## Usage

Used by the frontend dashboard to fetch project analytics and forecasts.
- Returns structured JSON error responses for backend failures.
- Handles connection timeouts and backend unavailability.



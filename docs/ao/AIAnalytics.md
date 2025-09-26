# AIAnalytics

## Overview

`AIAnalytics` is an Active Objects (AO) interface representing stored analytics data for a Jira project in the JURIX AI plugin.

## Fields

- `projectKey` (String): The Jira project key this analytics record belongs to.
- `metricsJson` (String): JSON-encoded metrics and analytics data.
- `createdAt` (Long): Timestamp when the analytics record was created.

## Usage

Used to persist AI-generated analytics and metrics for projects, enabling historical analysis and reporting.

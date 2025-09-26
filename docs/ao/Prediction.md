# Prediction

## Overview

`Prediction` is an Active Objects (AO) interface representing an AI-generated prediction for a Jira project.

## Fields

- `projectKey` (String): The Jira project key.
- `predictionType` (String): The type of prediction (e.g., sprint_completion, risk, velocity).
- `predictionJson` (String): JSON-encoded prediction data.
- `probability` (Double): Probability/confidence score for the prediction.
- `createdAt` (Long): Timestamp when the prediction was created.

## Usage

Used to persist AI predictions for analytics, dashboards, and historical review.

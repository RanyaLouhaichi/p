# article-review.js

## Overview

`article-review.js` implements the client-side logic for reviewing, approving, and providing feedback on AI-generated articles in Jira issues. It manages the UI for notifications, modals, and feedback submission.

## Features

- Displays notification bell and dropdown for AI article notifications.
- Detects when an article is available for the current issue and shows an indicator.
- Opens a modal to display the article, with options to approve, refine, or reject.
- Submits feedback to the backend and updates the UI based on responses.
- Handles loading, error, and approved states with dynamic UI updates.
- Provides basic Markdown-to-HTML conversion for article content.

## Usage

The component is initialized automatically on DOM ready and is globally accessible as `window.JurixArticleReview`.
- Uses AJS and jQuery for DOM manipulation and event handling.

## Usage

The component is initialized automatically on DOM ready and is globally accessible as `window.JurixArticleReview`.

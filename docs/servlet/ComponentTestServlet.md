# ComponentTestServlet

## Overview

`ComponentTestServlet` is a diagnostic servlet that displays the injection status of core plugin components and provides basic plugin context information for troubleshooting.

## Responsibilities

- Reports the injection status of `EventPublisher`, `DashboardUpdateService`, and `ArticleGenerationService`.
- Displays component details and plugin context in an HTML page.

## Usage

Access the servlet via its registered URL to view the status page.
Access the servlet via its registered URL to view the status page.

## Example Output

- Component injection status (INJECTED/NULL)
- EventPublisher class and hash
- Plugin load time and context path

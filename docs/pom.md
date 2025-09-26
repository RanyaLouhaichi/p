# pom.xml

**Location:** `pom.xml`

## Overview

The `pom.xml` file defines the Maven build configuration for the JURIX AI Plugin. It specifies project metadata, dependencies, plugins, and build settings required for compiling, packaging, and deploying the plugin within the Atlassian Jira ecosystem.

## Key Features

- Declares dependencies for Jira, Atlassian SDK, and third-party libraries (e.g., OkHttp, Gson, SLF4J).
- Configures plugin packaging and deployment settings.
- Defines build plugins for resource filtering, code scanning, and testing.
- Specifies project versioning, groupId, artifactId, and licensing information.

## Usage

This file is used by Maven to build and package the plugin. To build the project, run:

```sh
mvn clean install
```

## Customization

Update dependencies and plugin versions as needed to match Jira and Atlassian SDK requirements.

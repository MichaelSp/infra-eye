# GitHub Actions Workflows

This directory contains automated CI/CD workflows for the infra-eye project.

## Workflows

### 1. Docker Image Build and Publish (`docker-publish.yml`)

Builds and publishes the Docker image to GitHub Container Registry (ghcr.io).

**Triggers:**
- Push to `main` branch
- Git tags matching `v*.*.*` (e.g., v1.0.0)
- Pull requests to `main` (build only, no push)
- Manual workflow dispatch

**Features:**
- Multi-architecture builds (linux/amd64, linux/arm64)
- Automatic versioning using semantic versioning from git tags
- Layer caching for faster builds
- Tagged images:
  - `latest` (main branch)
  - Semantic versions from tags (e.g., `v1.0.0`, `v1.0`, `v1`)
  - Branch names for feature branches
  - Commit SHA for tracking

**Usage:**
```bash
# Pull the latest image
docker pull ghcr.io/michaelsp/infra-eye:latest

# Pull a specific version
docker pull ghcr.io/michaelsp/infra-eye:v1.0.0

# Run the container
docker run -p 3000:3000 ghcr.io/michaelsp/infra-eye:latest
```

### 2. Helm Chart Build and Publish (`helm-publish.yml`)

Packages and publishes the Helm chart to multiple destinations.

**Triggers:**
- Push to `main` branch (when chart files change)
- Git tags matching `v*.*.*`
- Pull requests to `main` (lint and test only)
- Manual workflow dispatch

**Features:**
- Helm chart linting and validation
- Automatic version management:
  - Tags: Uses git tag version (e.g., `v1.0.0` → `1.0.0`)
  - Main branch: Uses Chart.yaml version with commit SHA (e.g., `0.1.0-a1b2c3d`)
- Publishes to three locations:
  1. **OCI Registry (ghcr.io)** - Modern Helm chart distribution
  2. **GitHub Releases** - Downloadable chart archives (on tags)
  3. **GitHub Pages** - Traditional Helm repository

**Usage:**

#### Using OCI Registry (Recommended):
```bash
# Install from OCI registry
helm install infra-eye oci://ghcr.io/michaelsp/charts/infra-eye --version 1.0.0

# Upgrade
helm upgrade infra-eye oci://ghcr.io/michaelsp/charts/infra-eye --version 1.0.1
```

#### Using GitHub Pages:
```bash
# Add the Helm repository
helm repo add infra-eye https://michaelsp.github.io/infra-eye

# Update repo index
helm repo update

# Install the chart
helm install my-infra-eye infra-eye/infra-eye

# Search available versions
helm search repo infra-eye -l
```

#### Using GitHub Releases:
Download the chart archive from the [Releases page](https://github.com/MichaelSp/infra-eye/releases) and install:
```bash
helm install infra-eye ./infra-eye-1.0.0.tgz
```

## Release Process

To create a new release with both Docker image and Helm chart:

1. **Update version in Chart.yaml** (if needed):
   ```yaml
   version: 1.0.0
   appVersion: "1.0.0"
   ```

2. **Commit changes**:
   ```bash
   git add chart/infra-eye/Chart.yaml
   git commit -m "chore: bump version to 1.0.0"
   git push origin main
   ```

3. **Create and push a git tag**:
   ```bash
   git tag -a v1.0.0 -m "Release version 1.0.0"
   git push origin v1.0.0
   ```

4. **Workflows will automatically**:
   - Build and push Docker image with tag `v1.0.0`, `v1.0`, `v1`, and `latest`
   - Package and publish Helm chart version `1.0.0`
   - Create a GitHub Release with chart archive attached
   - Update GitHub Pages repository index

## Permissions Required

The workflows require the following GitHub permissions:
- `contents: write` - For creating releases and updating gh-pages
- `packages: write` - For publishing to GitHub Container Registry
- `pages: write` - For deploying to GitHub Pages
- `id-token: write` - For OIDC authentication

These are automatically granted through `GITHUB_TOKEN` in GitHub Actions.

## Configuration

### GitHub Pages Setup

To enable the GitHub Pages Helm repository:

1. Go to repository **Settings** → **Pages**
2. Under "Build and deployment":
   - Source: **Deploy from a branch**
   - Branch: **gh-pages** / **(root)**
3. Save changes

The Helm repository will be available at: `https://michaelsp.github.io/infra-eye`

### Container Registry Visibility

To make Docker images and Helm charts public:

1. Go to the [package settings](https://github.com/users/MichaelSp/packages)
2. Find `infra-eye` (Docker) and `charts/infra-eye` (Helm)
3. Click on each package → **Package settings**
4. Scroll to "Danger Zone" → **Change visibility** → Make public

## Troubleshooting

### Workflow fails with "403 Forbidden"
- Ensure GitHub Actions has permission to write to packages
- Check repository settings → Actions → General → Workflow permissions → Enable "Read and write permissions"

### Helm chart push fails
- Verify the chart version is not already published
- Ensure Chart.yaml has valid semantic versioning

### GitHub Pages not updating
- Check if gh-pages branch exists and has content
- Verify GitHub Pages is enabled in repository settings
- Allow a few minutes for GitHub Pages to deploy after the workflow completes

## Manual Workflow Execution

You can manually trigger workflows from the GitHub Actions tab:

1. Go to **Actions** tab
2. Select the workflow (Docker or Helm)
3. Click **Run workflow**
4. Choose the branch
5. Click **Run workflow** button

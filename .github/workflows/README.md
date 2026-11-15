# CI and releases

## Main builds and draft releases

`docker-publish.yml` lints, tests, and builds on every PR and push to `main`,
including chart changes. PRs build without pushing. Successful main builds push
multi-platform images (amd64/arm64) to `ghcr.io/michaelsp/infra-eye`, tagged with
`main`, `latest`, and the next `docker-vX.Y.Z` version.

The existing semver action calculates the version from conventional commits.
[Release Drafter](https://github.com/release-drafter/release-drafter) then creates
or updates one draft release with merged PR notes and the exact built commit SHA.
Until publication, later main builds may update the draft version and image.

## Weekly publication

`release-publish.yml` runs Mondays at **08:00 UTC** (09:00 CET / 10:00 CEST).
It can also be run manually on `main`. If no Docker draft exists, it does nothing.

For an existing draft, it:

1. Checks out the exact commit recorded in the draft.
2. Packages the Helm chart with version `X.Y.Z` and appVersion `docker-vX.Y.Z`,
   so the default deployment image matches the built Docker tag.
3. Uses the community Helm chart-releaser action to publish the chart archive
   and update the `gh-pages` Helm index; also pushes the chart to
   `oci://ghcr.io/michaelsp/infra-eye`.
4. Uses [softprops/action-gh-release](https://github.com/softprops/action-gh-release)
   to publish the existing Docker draft and mark it latest.

Publication and main image builds share a concurrency lock. Chart publication
happens first so a failure leaves the draft available for retry. Existing chart
releases are skipped on retry. Multiple Docker drafts fail explicitly rather
than choosing one arbitrarily.

Chart versions are set in the packaging workspace. No chart bump PR, auto-merge,
merge polling, or follow-up workflow dispatch is needed. Source Chart.yaml stays
as the development default.

`chart-0-test.yml` additionally lints and tests chart-related PRs.

## Permissions and setup

Main builds need `contents: write`, `packages: write`, and `pull-requests: read`
for drafts, images, and release notes. Weekly publishing needs `contents: write`
and `packages: write`. Both use the built-in `GITHUB_TOKEN`; no PAT is needed.

Configure GitHub Pages to publish from the `gh-pages` branch. The Helm repository
is available at https://michaelsp.github.io/infra-eye. Make GHCR packages public
if anonymous installs are required.

```sh
helm repo add infra-eye https://michaelsp.github.io/infra-eye
helm repo update
helm install infra-eye infra-eye/infra-eye --version X.Y.Z

# OCI alternative
helm install infra-eye oci://ghcr.io/michaelsp/infra-eye/infra-eye --version X.Y.Z
```

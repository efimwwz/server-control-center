# Public launch checklist

This document tracks launch work that requires repository changes, maintainer actions or validation on real hosts. It is not a claim that these checks have already been completed.

## Repository presentation

- [x] Replace the generic product descriptions in both README files.
- [x] Add clear English and Russian product overviews and local mock-preview instructions.
- [x] Add CI, release, license and stars badges to the README.
- [x] Document supported systems and the read-only / security boundaries.
- [x] Add contribution and security policies.
- [x] Add issue and pull-request templates.
- [ ] Update the GitHub repository **About** description to:  
  `Self-hosted Linux server monitoring dashboard for Ubuntu 24.04. Monitor CPU, memory, disks, Docker, Nginx, network, services and logs — private by default.`
- [ ] Add repository topics:  
  `linux`, `ubuntu`, `docker`, `server-monitoring`, `self-hosted`, `sysadmin`, `nginx`, `systemd`, `monitoring`.
- [x] Capture a genuine screenshot from the current SCC frontend in mock mode and embed it in both READMEs. The UI is real; telemetry is synthetic and contains no private host details.
- [ ] Create a social preview image from the genuine product identity and apply it in repository settings.
- [ ] Enable GitHub Discussions if the maintainer wants community Q&A.
- [ ] Enable private vulnerability reporting / Security Advisories.
- [ ] Configure branch protection or a ruleset for `main`: require CI checks, block force pushes and prevent accidental direct pushes.

## Technical readiness

- [x] Identify and fix the Express 5 wildcard fallback route incompatibility in the launch branch.
- [x] Add a CI smoke test for SPA root and nested routes.
- [x] Review the Express 5 upgrade and CI result before merging.
- [ ] Review the remaining Dependabot pull requests individually; do not merge the Express update until the launch branch fix passes CI.
- [ ] Complete CI clean-install and uninstall tests on Ubuntu 24.04 `amd64` and `arm64` runners. The matrix is now configured; keep this item open until both jobs pass.
- [ ] Verify uninstall and reinstall behaviour on disposable test hosts.
- [ ] Confirm GHCR contains the expected multi-platform image for the release tag.
- [ ] Push tag `v1.1.2` after the merge to trigger the release workflow; then verify the multi-platform GHCR image and GitHub Release assets.
- [ ] Publish a new stable release only after the checks above pass.

## First public outreach

- [x] Prepare technical Show HN, Reddit and Russian community announcement drafts.
- [ ] Publish a technical Show HN post with genuine dashboard screenshots and the exact supported OS.
- [ ] Share a transparent project introduction in relevant self-hosting / Linux communities, following each community's promotion rules.
- [ ] Recruit a small group of real administrators to test installation and report issues.
- [ ] Collect feedback before expanding OS support or adding remote administration features.

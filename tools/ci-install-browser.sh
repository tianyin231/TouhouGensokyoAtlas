#!/usr/bin/env bash
# Install Chromium and its system libraries for the WebGL jobs.
# Azure's Ubuntu mirror sometimes stalls and used to eat a job's whole time
# limit before any test started. Fail fast on a stalled connection, let apt
# move on to the next mirror, and retry the whole install twice.
set -u
printf 'Acquire::http::Timeout "20";\nAcquire::https::Timeout "20";\nAcquire::Retries "2";\n' \
  | sudo tee /etc/apt/apt.conf.d/99-ci-timeouts >/dev/null
for attempt in 1 2 3; do
  timeout 300 python3 -m playwright install --with-deps chromium && exit 0
  echo "Browser install attempt $attempt failed or timed out" >&2
done
exit 1

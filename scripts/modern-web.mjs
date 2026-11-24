// Pure helpers for the Modern Web Guidance check (kept separate so they can be unit tested).

/**
 * Flatten legacy-scan JSON results into one list of findings, minus the ones the project has accepted.
 * `scans` is an array of the tool's `--json` output (one per scanned folder); `allowed` is a list of
 * "guideId path" strings (line numbers are not used, they drift).
 */
export function unlistedFindings(scans, allowed = []) {
  const accepted = new Set(allowed);
  const out = [];
  for (const scan of scans) {
    for (const guide of scan.guides ?? []) {
      for (const rule of guide.rules ?? []) {
        for (const f of rule.findings ?? []) {
          const file = `${scan.targetDir}/${f.file}`.replaceAll('\\', '/');
          if (accepted.has(`${guide.guideId} ${file}`)) continue;
          out.push({ guideId: guide.guideId, file, line: f.line, message: f.message, retrieve: guide.retrieveCommand });
        }
      }
    }
  }
  return out;
}

/** Human-readable report; one block per guide so the fix guidance is one command away. */
export function formatReport(findings) {
  if (findings.length === 0) return 'No legacy web platform patterns found.';
  const byGuide = Map.groupBy(findings, (f) => f.guideId);
  return [...byGuide].map(([guide, list]) =>
    `${guide} (${list.length}): run \`${list[0].retrieve}\` for the modern approach\n` +
    list.map((f) => `  ${f.file}:${f.line}  ${String(f.message).slice(0, 140)}`).join('\n')).join('\n\n');
}

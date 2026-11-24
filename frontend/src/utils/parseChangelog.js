/**
 * Parse CHANGELOG.md into structured data
 * Format: Standard Keep a Changelog format
 */

const SECTION_KEYS = [
  ['added', 'features'],
  ['technical', 'technical'],
  ['security', 'security'],
  ['changed', 'changed'],
  ['fixed', 'fixed']
];

function newVersion(match) {
  return {
    version: `v${match[1]}`,
    date: match[2],
    title: '',
    features: [],
    technical: [],
    security: [],
    changed: [],
    fixed: [],
    status: 'released'
  };
}

/** Handle a "### Added - Title" line: remember the section and take the version title if unset. */
function readSectionHeader(sectionName, version) {
  // Parse section name and optional title
  const sectionParts = sectionName.split('-').map(s => s.trim());
  const sectionType = sectionParts[0].toLowerCase();
  const sectionTitle = sectionParts[1] || '';

  // Set title from first section if not already set
  if (!version.title && sectionTitle) {
    version.title = sectionTitle;
  }
  const found = SECTION_KEYS.find(([needle]) => sectionType.includes(needle));
  return found ? found[1] : null;
}

export function parseChangelog(markdownText) {
  const versions = [];
  let currentVersion = null;
  let currentSection = null;

  for (const rawLine of markdownText.split('\n')) {
    const line = rawLine.trim();

    // Match version header: ## [1.10.1] - 2026-02-24
    const versionMatch = line.match(/^##\s+\[(\d+\.\d+\.\d+)\]\s+-\s+(.+)$/);
    if (versionMatch) {
      if (currentVersion) versions.push(currentVersion);
      currentVersion = newVersion(versionMatch);
      currentSection = null;
      continue;
    }

    // Any other level 2 heading (Unversioned, a summary) ends the current version
    if (currentVersion && /^##\s/.test(line)) {
      versions.push(currentVersion);
      currentVersion = null;
      currentSection = null;
      continue;
    }

    // Skip if no current version
    if (!currentVersion) continue;

    // Match main section headers: ### Added, ### Changed, ### Fixed, ### Security
    const sectionMatch = line.match(/^###\s+(.+)$/);
    if (sectionMatch) {
      currentSection = readSectionHeader(sectionMatch[1].trim(), currentVersion);
      continue;
    }

    if (!currentSection || !currentVersion[currentSection]) continue;

    // Subsection headings (- **Title**:) are skipped; bullets, including nested ones, become items
    if (/^-\s+\*\*([^*]+)\*\*:?$/.test(line)) continue;
    const itemMatch = line.match(/^-\s+(.+)$/);
    if (itemMatch) {
      currentVersion[currentSection].push(itemMatch[1].trim());
    }
  }

  // Add the last version
  if (currentVersion) versions.push(currentVersion);
  return versions;
}

/**
 * Get version status based on date and content
 */
export function getVersionStatus(version) {
  if (version.title.toLowerCase().includes('planned')) {
    return 'planned';
  }
  if (version.title.toLowerCase().includes('beta')) {
    return 'beta';
  }
  return 'released';
}

/**
 * Format date for display
 */
export function formatDate(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return dateString; // Return as-is if invalid
  }
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

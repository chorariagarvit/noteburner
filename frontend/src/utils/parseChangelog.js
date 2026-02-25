/**
 * Parse CHANGELOG.md into structured data
 * Format: Standard Keep a Changelog format
 */

export function parseChangelog(markdownText) {
  const versions = [];
  const lines = markdownText.split('\n');
  
  let currentVersion = null;
  let currentSection = null;
  let currentSubsection = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Match version header: ## [1.10.1] - 2026-02-24
    const versionMatch = line.match(/^##\s+\[([^\]]+)\]\s+-\s+(.+)$/);
    if (versionMatch) {
      // Save previous version if exists
      if (currentVersion) {
        versions.push(currentVersion);
      }
      
      currentVersion = {
        version: `v${versionMatch[1]}`,
        date: versionMatch[2],
        title: '',
        features: [],
        technical: [],
        security: [],
        changed: [],
        fixed: [],
        status: 'released'
      };
      currentSection = null;
      currentSubsection = null;
      continue;
    }
    
    // Skip if no current version
    if (!currentVersion) continue;
    
    // Match main section headers: ### Added, ### Changed, ### Fixed, ### Security
    const sectionMatch = line.match(/^###\s+(.+)$/);
    if (sectionMatch) {
      const sectionName = sectionMatch[1].trim();
      
      // Parse section name and optional title
      const sectionParts = sectionName.split('-').map(s => s.trim());
      const sectionType = sectionParts[0].toLowerCase();
      const sectionTitle = sectionParts[1] || '';
      
      // Set title from first section if not already set
      if (!currentVersion.title && sectionTitle) {
        currentVersion.title = sectionTitle;
      }
      
      currentSection = sectionType.includes('added') ? 'features'
                     : sectionType.includes('technical') ? 'technical'
                     : sectionType.includes('security') ? 'security'
                     : sectionType.includes('changed') ? 'changed'
                     : sectionType.includes('fixed') ? 'fixed'
                     : null;
      currentSubsection = null;
      continue;
    }
    
    // Match subsection bullets: - **Title**:
    const subsectionMatch = line.match(/^-\s+\*\*([^*]+)\*\*:?$/);
    if (subsectionMatch && currentSection) {
      currentSubsection = subsectionMatch[1].trim();
      continue;
    }
    
    // Match feature bullets: - Feature description
    const featureMatch = line.match(/^-\s+(.+)$/);
    if (featureMatch && currentSection && currentVersion[currentSection]) {
      const feature = featureMatch[1].trim();
      currentVersion[currentSection].push(feature);
      continue;
    }
    
    // Match nested bullets (indented): spaces - Item
    const nestedMatch = line.match(/^\s{2,}-\s+(.+)$/);
    if (nestedMatch && currentSection && currentVersion[currentSection]) {
      const item = nestedMatch[1].trim();
      currentVersion[currentSection].push(item);
      continue;
    }
  }
  
  // Add the last version
  if (currentVersion) {
    versions.push(currentVersion);
  }
  
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
  if (isNaN(date.getTime())) {
    return dateString; // Return as-is if invalid
  }
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

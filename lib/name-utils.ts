/**
 * Utility functions for normalizing and matching profile names
 * Handles quotes, nicknames, and variations for better search results
 */

// Common nickname mappings
const NICKNAME_MAP: Record<string, string[]> = {
  'Sean': ['Diddy', 'Puff', 'P. Diddy', 'Puffy', 'Sean Combs', 'Sean "Diddy" Combs'],
  'Diddy': ['Sean', 'Puff', 'P. Diddy', 'Puffy', 'Sean Combs', 'Sean "Diddy" Combs'],
  'Jennifer': ['J.Lo', 'JLo', 'Jenny'],
  'Cassandra': ['Cassie'],
  'Aubrey': ['Aubrey O\'Day'],
  'Caresha': ['Yung Miami'],
  'Miami': ['Yung Miami', 'Caresha'],
  'Kim': ['Kimberly'],
  'Sarah': ['Sara'],
  'Misa': ['Misa Hylton-Brim', 'Misa Hylton']
};

// Reverse mapping for bidirectional lookup
const REVERSE_NICKNAME_MAP: Record<string, string[]> = {};
Object.entries(NICKNAME_MAP).forEach(([key, values]) => {
  values.forEach(value => {
    if (!REVERSE_NICKNAME_MAP[value]) {
      REVERSE_NICKNAME_MAP[value] = [];
    }
    REVERSE_NICKNAME_MAP[value].push(key);
  });
});

/**
 * Normalize a name by removing quotes, extra spaces, and converting to lowercase
 */
export function normalizeName(name: string): string {
  return name
    .replace(/["']/g, '') // Remove quotes
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim()
    .toLowerCase();
}

/**
 * Get all possible variations of a name including nicknames
 */
export function getNameVariations(name: string): string[] {
  const normalized = normalizeName(name);
  const variations = new Set([normalized, name.toLowerCase()]);
  
  // Add original name without quotes
  variations.add(name.replace(/["']/g, '').toLowerCase());
  
  // Split name into parts and check for nicknames
  const nameParts = normalized.split(' ');
  
  nameParts.forEach(part => {
    // Check direct nickname mappings
    if (NICKNAME_MAP[part]) {
      NICKNAME_MAP[part].forEach(nickname => {
        variations.add(normalizeName(nickname));
        // Also add the nickname replacing the original part
        const newName = normalized.replace(part, normalizeName(nickname));
        variations.add(newName);
      });
    }
    
    // Check reverse nickname mappings
    if (REVERSE_NICKNAME_MAP[part]) {
      REVERSE_NICKNAME_MAP[part].forEach(original => {
        variations.add(normalizeName(original));
        const newName = normalized.replace(part, normalizeName(original));
        variations.add(newName);
      });
    }
  });
  
  // Add partial matches (first name, last name)
  if (nameParts.length > 1) {
    variations.add(nameParts[0]); // First name only
    variations.add(nameParts[nameParts.length - 1]); // Last name only
  }
  
  return Array.from(variations).filter(v => v.length > 0);
}

/**
 * Check if two names match using fuzzy matching
 */
export function namesMatch(name1: string, name2: string): boolean {
  const variations1 = getNameVariations(name1);
  const variations2 = getNameVariations(name2);
  
  // Check for exact matches in variations
  for (const v1 of variations1) {
    for (const v2 of variations2) {
      if (v1 === v2) return true;
      // Also check if one contains the other (for partial matches)
      if (v1.includes(v2) || v2.includes(v1)) {
        // Only match if the shorter string is at least 3 characters
        const shorter = v1.length < v2.length ? v1 : v2;
        if (shorter.length >= 3) return true;
      }
    }
  }
  
  return false;
}

/**
 * Search for profiles by name with fuzzy matching
 */
export function searchProfilesByName(profiles: any[], searchQuery: string): any[] {
  if (!searchQuery.trim()) return [];
  
  const queryVariations = getNameVariations(searchQuery);
  
  return profiles.filter(profile => {
    const profileVariations = getNameVariations(profile.name);
    
    // Check for matches between query and profile variations
    for (const queryVar of queryVariations) {
      for (const profileVar of profileVariations) {
        if (queryVar === profileVar) return true;
        // Check partial matches
        if (queryVar.length >= 3 && profileVar.includes(queryVar)) return true;
        if (profileVar.length >= 3 && queryVar.includes(profileVar)) return true;
      }
    }
    
    return false;
  });
}

/**
 * Create search-friendly regex pattern from name
 */
export function createSearchRegex(name: string): RegExp {
  const variations = getNameVariations(name);
  
  // Escape special regex characters and create alternation pattern
  const escapedVariations = variations.map(v => 
    v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  );
  
  // Create pattern that matches any of the variations
  const pattern = escapedVariations.join('|');
  
  return new RegExp(pattern, 'i');
}

/**
 * Get similarity score between two names (0-1, higher is more similar)
 */
export function getNameSimilarity(name1: string, name2: string): number {
  const variations1 = getNameVariations(name1);
  const variations2 = getNameVariations(name2);
  
  let maxSimilarity = 0;
  
  for (const v1 of variations1) {
    for (const v2 of variations2) {
      if (v1 === v2) return 1; // Exact match
      
      // Calculate Levenshtein distance-based similarity
      const similarity = calculateStringSimilarity(v1, v2);
      maxSimilarity = Math.max(maxSimilarity, similarity);
    }
  }
  
  return maxSimilarity;
}

/**
 * Calculate string similarity using Levenshtein distance
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  
  if (len1 === 0) return len2 === 0 ? 1 : 0;
  if (len2 === 0) return 0;
  
  const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(null));
  
  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  
  const maxLen = Math.max(len1, len2);
  return (maxLen - matrix[len1][len2]) / maxLen;
}
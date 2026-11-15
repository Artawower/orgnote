export function searchFilter(searchQuery?: string, ...targets: (string | undefined)[]): boolean {
  if (!searchQuery?.length || !targets?.length) {
    return true;
  }
  const normalizedQuery = searchQuery.toLowerCase().trim();
  return targets.some((t) => t?.toLowerCase().includes(normalizedQuery));
}

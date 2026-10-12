import type { JournalEntry } from "./journalStorage";

export type JournalCase = {
  githubUrl: string;
  entries: JournalEntry[];
};

export function groupEntriesByUrl(entries: JournalEntry[]): JournalCase[] {
  const casesByUrl = new Map<string, JournalEntry[]>();

  for (const entry of entries) {
    const existingEntries = casesByUrl.get(entry.githubUrl) ?? [];

    casesByUrl.set(entry.githubUrl, [...existingEntries, entry]);
  }

  return Array.from(casesByUrl, ([githubUrl, caseEntries]) => {
    return {
      githubUrl,
      entries: caseEntries,
    };
  });
}

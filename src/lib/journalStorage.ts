export type JournalEntry = {
  id: string;
  githubUrl: string;
  createdAt: string;
  title?: string;
  body?: string;
  nextStep?: string;
};

const JOURNAL_STORAGE_KEY = "maintainersJournalEntries";

export function isJournalEntry(value: unknown): value is JournalEntry {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const entry = value as Partial<JournalEntry>;

  return (
    typeof entry.id === "string" &&
    typeof entry.githubUrl === "string" &&
    typeof entry.createdAt === "string" &&
    (entry.title === undefined || typeof entry.title === "string") &&
    (entry.body === undefined || typeof entry.body === "string") &&
    (entry.nextStep === undefined || typeof entry.nextStep === "string")
  );
}

export function loadJournalEntries(): JournalEntry[] {
  const storedEntries = localStorage.getItem(JOURNAL_STORAGE_KEY);

  if (storedEntries === null) {
    return [];
  }

  try {
    const parsedEntries: unknown = JSON.parse(storedEntries);

    if (!Array.isArray(parsedEntries)) {
      return [];
    }

    return parsedEntries.filter(isJournalEntry);
  } catch {
    return [];
  }
}

export function saveJournalEntries(entries: JournalEntry[]) {
  localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(entries));
}

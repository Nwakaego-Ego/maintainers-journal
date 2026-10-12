"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useState, useEffect } from "react";
import {
  isJournalEntry,
  loadJournalEntries,
  saveJournalEntries,
  type JournalEntry,
} from "../lib/journalStorage";

type JournalCase = {
  githubUrl: string;
  entries: JournalEntry[];
};

function groupEntriesByUrl(entries: JournalEntry[]): JournalCase[] {
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

export default function QuickCaptureForm() {
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [previousMatchCount, setPreviousMatchCount] = useState(0);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [updatingCaseUrl, setUpdatingCaseUrl] = useState<string | null>(null);
  const [editingNextStepId, setEditingNextStepId] = useState<string | null>(
    null,
  );
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const entries = loadJournalEntries();

    // eslint-disable-next-line react-hooks/set-state-in-effect -- Restore browser-only localStorage after hydration.
    setJournalEntries(entries);
  }, []);

  function persistJournalEntries(entries: JournalEntry[]) {
    saveJournalEntries(entries);
    setJournalEntries(entries);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const githubUrl = formData.get("githubUrl");
    if (typeof githubUrl !== "string") {
      return;
    }

    const title = formData.get("title");
    if (typeof title !== "string") {
      return;
    }
    const cleanTitle = title.trim();

    const body = formData.get("body");
    if (typeof body !== "string") {
      return;
    }
    const cleanBody = body.trim();

    const nextStep = formData.get("nextStep");

    if (typeof nextStep !== "string") {
      return;
    }

    const cleanNextStep = nextStep.trim();

    const entry: JournalEntry = {
      id: crypto.randomUUID(),
      githubUrl,
      createdAt: new Date().toISOString(),
      title: cleanTitle,
      body: cleanBody,
      nextStep: cleanNextStep,
    };

    const entries = loadJournalEntries();
    const matchingEntries = entries.filter(
      (existingEntry) => existingEntry.githubUrl === githubUrl,
    );

    setPreviousMatchCount(matchingEntries.length);

    entries.push(entry);

    persistJournalEntries(entries);
    event.currentTarget.reset();
  }

  function handleAddUpdate(
    event: FormEvent<HTMLFormElement>,
    githubUrl: string,
  ) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    const title = formData.get("title");
    if (typeof title !== "string") {
      return;
    }

    const body = formData.get("body");
    if (typeof body !== "string") {
      return;
    }

    const nextStep = formData.get("nextStep");
    if (typeof nextStep !== "string") {
      return;
    }

    const newEntry: JournalEntry = {
      id: crypto.randomUUID(),
      githubUrl,
      createdAt: new Date().toISOString(),
      title: title.trim(),
      body: body.trim(),
      nextStep: nextStep.trim(),
    };

    const updatedEntries = [...journalEntries, newEntry];

    persistJournalEntries(updatedEntries);
    setUpdatingCaseUrl(null);
  }

  function handleNextStepEditSubmit(
    event: FormEvent<HTMLFormElement>,
    entryId: string,
  ) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const nextStep = formData.get("nextStep");

    if (typeof nextStep !== "string") {
      return;
    }

    const updatedEntries = journalEntries.map((existingEntry) => {
      if (existingEntry.id !== entryId) {
        return existingEntry;
      }

      return {
        ...existingEntry,
        nextStep: nextStep.trim(),
      };
    });

    persistJournalEntries(updatedEntries);
    setEditingNextStepId(null);
  }

  function handleDelete(entryId: string) {
    const shouldDelete = window.confirm("Delete this journal entry?");
    if (!shouldDelete) {
      return;
    }
    const remainingEntries = journalEntries.filter((existingEntry) => {
      return existingEntry.id !== entryId;
    });

    persistJournalEntries(remainingEntries);
  }

  function handleEditSubmit(
    event: FormEvent<HTMLFormElement>,
    entryId: string,
  ) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const githubUrl = formData.get("githubUrl");

    if (typeof githubUrl !== "string") {
      return;
    }

    const title = formData.get("title");

    if (typeof title !== "string") {
      return;
    }

    const cleanTitle = title.trim();

    const body = formData.get("body");
    if (typeof body !== "string") {
      return;
    }
    const cleanBody = body.trim();

    const updatedEntries = journalEntries.map((existingEntry) => {
      if (existingEntry.id !== entryId) {
        return existingEntry;
      }

      return {
        ...existingEntry,
        githubUrl,
        title: cleanTitle,
        body: cleanBody,
      };
    });

    persistJournalEntries(updatedEntries);
    setEditingEntryId(null);
  }

  function handleExport() {
    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      entries: journalEntries,
    };

    const backupText = JSON.stringify(backup, null, 2);

    const backupFile = new Blob([backupText], {
      type: "application/json",
    });

    const downloadUrl = URL.createObjectURL(backupFile);
    const downloadLink = document.createElement("a");

    downloadLink.href = downloadUrl;
    downloadLink.download = `maintainers-journal-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;

    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();

    URL.revokeObjectURL(downloadUrl);
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const fileInput = event.currentTarget;
    const backupFile = fileInput.files?.[0];

    if (!backupFile) {
      return;
    }

    try {
      const backupText = await backupFile.text();
      const backup: unknown = JSON.parse(backupText);

      if (
        typeof backup !== "object" ||
        backup === null ||
        !("version" in backup) ||
        backup.version !== 1 ||
        !("entries" in backup) ||
        !Array.isArray(backup.entries) ||
        !backup.entries.every(isJournalEntry)
      ) {
        throw new Error("Invalid backup");
      }

      const entriesById = new Map(
        backup.entries.map((entry) => [entry.id, entry]),
      );

      for (const existingEntry of journalEntries) {
        entriesById.set(existingEntry.id, existingEntry);
      }

      const mergedEntries = Array.from(entriesById.values()).sort((a, b) => {
        return a.createdAt.localeCompare(b.createdAt);
      });
      persistJournalEntries(mergedEntries);
      window.alert(`Imported ${backup.entries.length} journal entries.`);
    } catch {
      window.alert("This is not a valid Maintainer's Journal backup file.");
    } finally {
      fileInput.value = "";
    }
  }

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const journalCases = groupEntriesByUrl(journalEntries);

  const visibleCases = journalCases.filter((journalCase) => {
    const searchableText = journalCase.entries
      .map((entry) => {
        return [
          entry.githubUrl,
          entry.title ?? "",
          entry.body ?? "",
          entry.nextStep ?? "",
        ].join(" ");
      })
      .join(" ")
      .toLowerCase();

    return searchableText.includes(normalizedSearchTerm);
  });

  return (
    <>
      <form onSubmit={handleSubmit}>
        <label htmlFor="github-url">GitHub URL</label>
        <input id="github-url" type="url" name="githubUrl" required={true} />
        <label htmlFor="title">Title</label>
        <input name="title" id="title" type="text" />
        <label htmlFor="body">Notes</label>
        <textarea id="body" name="body" rows={6} />
        <label htmlFor="next-step">Next step</label>
        <input id="next-step" type="text" name="nextStep" />
        <button type="submit">Submit</button>
      </form>
      <label htmlFor="journal-search">Search saved entries</label>
      <input
        id="journal-search"
        type="search"
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.currentTarget.value)}
        placeholder="Search by title, URL, notes, or next step"
      />
      {previousMatchCount > 0 && (
        <p role="status">
          Earlier entries found for this URL: {previousMatchCount}. The new
          entry was still saved.
        </p>
      )}
      <p>
        Saved {journalCases.length}{" "}
        {journalCases.length === 1 ? "case" : "cases"} containing{" "}
        {journalEntries.length}{" "}
        {journalEntries.length === 1 ? "entry" : "entries"}
      </p>
      <button
        type="button"
        onClick={handleExport}
        disabled={journalEntries.length === 0}
      >
        Export backup
      </button>
      <label>
        Import backup
        <input
          type="file"
          accept=".json,application/json"
          onChange={handleImport}
        />
      </label>
      {normalizedSearchTerm && visibleCases.length === 0 && (
        <p role="status">No saved entries match “{searchTerm.trim()}”.</p>
      )}
      <ul>
        {visibleCases.map((journalCase) => {
          const latestNextStepEntry = [...journalCase.entries]
            .reverse()
            .find((entry) => entry.nextStep?.trim());

          const currentNextStep = latestNextStepEntry?.nextStep;
          return (
            <li key={journalCase.githubUrl}>
              <a
                href={journalCase.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {journalCase.githubUrl}
              </a>

              {currentNextStep && latestNextStepEntry && (
                <>
                  <p>
                    <strong>Next step:</strong> {currentNextStep}
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingNextStepId(latestNextStepEntry.id);
                    }}
                  >
                    Edit next step
                  </button>

                  {editingNextStepId === latestNextStepEntry.id && (
                    <form
                      onSubmit={(event) => {
                        handleNextStepEditSubmit(event, latestNextStepEntry.id);
                      }}
                    >
                      <label>
                        Next step
                        <input
                          type="text"
                          name="nextStep"
                          defaultValue={currentNextStep}
                        />
                      </label>

                      <button type="submit">Save next step</button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingNextStepId(null);
                        }}
                      >
                        Cancel
                      </button>
                    </form>
                  )}
                </>
              )}
              <p>
                {journalCase.entries.length}{" "}
                {journalCase.entries.length === 1
                  ? "journal entry"
                  : "journal entries"}
              </p>
              <button
                type="button"
                onClick={() => {
                  setUpdatingCaseUrl(journalCase.githubUrl);
                }}
              >
                Add update
              </button>

              {updatingCaseUrl === journalCase.githubUrl && (
                <form
                  onSubmit={(event) => {
                    handleAddUpdate(event, journalCase.githubUrl);
                  }}
                >
                  <label>
                    Title
                    <input type="text" name="title" />
                  </label>

                  <label>
                    Notes
                    <textarea name="body" />
                  </label>

                  <label>
                    Next step
                    <input type="text" name="nextStep" />
                  </label>

                  <button type="submit">Save update</button>

                  <button
                    type="button"
                    onClick={() => {
                      setUpdatingCaseUrl(null);
                    }}
                  >
                    Cancel
                  </button>
                </form>
              )}
              <ol>
                {journalCase.entries.map((entry) => {
                  return (
                    <li key={entry.id}>
                      <p>{new Date(entry.createdAt).toLocaleString()}</p>

                      {entry.title && <p>{entry.title}</p>}

                      {entry.body && (
                        <p className="journal-entry-body">{entry.body}</p>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingEntryId(entry.id);
                        }}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          handleDelete(entry.id);
                        }}
                      >
                        Delete
                      </button>

                      {editingEntryId === entry.id && (
                        <form
                          onSubmit={(event) =>
                            handleEditSubmit(event, entry.id)
                          }
                        >
                          <label>
                            GitHub URL
                            <input
                              type="url"
                              name="githubUrl"
                              defaultValue={entry.githubUrl}
                              required
                            />
                          </label>

                          <label>
                            Title
                            <input
                              type="text"
                              name="title"
                              defaultValue={entry.title}
                            />
                          </label>

                          <label>
                            Notes
                            <textarea name="body" defaultValue={entry.body} />
                          </label>

                          <button type="submit">Save changes</button>

                          <button
                            type="button"
                            onClick={() => setEditingEntryId(null)}
                          >
                            Cancel
                          </button>
                        </form>
                      )}
                    </li>
                  );
                })}
              </ol>
            </li>
          );
        })}
      </ul>
    </>
  );
}

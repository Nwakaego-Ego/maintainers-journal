"use client";

import type { FormEvent } from "react";
import { useState, useEffect } from "react";

type JournalEntry = {
  id: string;
  githubUrl: string;
  createdAt: string;
  title?: string;
  body?: string;
  nextStep?: string;
};

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
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const storedEntries = localStorage.getItem("maintainersJournalEntries");

    let entries: JournalEntry[];
    if (storedEntries === null) {
      entries = [];
    } else {
      entries = JSON.parse(storedEntries);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Restore browser-only localStorage after hydration.
    setJournalEntries(entries);
  }, []);

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

    const storedEntries = localStorage.getItem("maintainersJournalEntries");

    let entries: JournalEntry[];
    if (storedEntries === null) {
      entries = [];
    } else {
      entries = JSON.parse(storedEntries);
    }

    const matchingEntries = entries.filter(
      (existingEntry) => existingEntry.githubUrl === githubUrl,
    );

    setPreviousMatchCount(matchingEntries.length);

    entries.push(entry);

    const serializedEntries = JSON.stringify(entries);
    localStorage.setItem("maintainersJournalEntries", serializedEntries);
    setJournalEntries(entries);
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

    localStorage.setItem(
      "maintainersJournalEntries",
      JSON.stringify(updatedEntries),
    );

    setJournalEntries(updatedEntries);
    setUpdatingCaseUrl(null);
  }

  function handleDelete(entryId: string) {
    const shouldDelete = window.confirm("Delete this journal entry?");
    if (!shouldDelete) {
      return;
    }
    const remainingEntries = journalEntries.filter((existingEntry) => {
      return existingEntry.id !== entryId;
    });

    const serializedEntries = JSON.stringify(remainingEntries);
    localStorage.setItem("maintainersJournalEntries", serializedEntries);
    setJournalEntries(remainingEntries);
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

    const nextStep = formData.get("nextStep");
    if (typeof nextStep !== "string") {
      return;
    }

    const cleanNextStep = nextStep.trim();

    const updatedEntries = journalEntries.map((existingEntry) => {
      if (existingEntry.id !== entryId) {
        return existingEntry;
      }

      return {
        ...existingEntry,
        githubUrl,
        title: cleanTitle,
        body: cleanBody,
        nextStep: cleanNextStep,
      };
    });
    localStorage.setItem(
      "maintainersJournalEntries",
      JSON.stringify(updatedEntries),
    );

    setJournalEntries(updatedEntries);
    setEditingEntryId(null);
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
      {normalizedSearchTerm && visibleCases.length === 0 && (
        <p role="status">No saved entries match “{searchTerm.trim()}”.</p>
      )}
      <ul>
        {visibleCases.map((journalCase) => {
          return (
            <li key={journalCase.githubUrl}>
              <a
                href={journalCase.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {journalCase.githubUrl}
              </a>

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
                      {entry.nextStep && (
                        <p>
                          <strong>Next step:</strong> {entry.nextStep}
                        </p>
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

                          <label>
                            Next step
                            <input
                              type="text"
                              name="nextStep"
                              defaultValue={entry.nextStep}
                            />
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

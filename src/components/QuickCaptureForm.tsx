"use client";

import type { FormEvent } from "react";
import { useState, useEffect } from "react";

type JournalEntry = {
  id: string;
  githubUrl: string;
  createdAt: string;
  title?: string;
  body?: string;
};

export default function QuickCaptureForm() {
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [previousMatchCount, setPreviousMatchCount] = useState(0);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
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

    const entry: JournalEntry = {
      id: crypto.randomUUID(),
      githubUrl,
      createdAt: new Date().toISOString(),
      title: cleanTitle,
      body: cleanBody,
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
    localStorage.setItem(
      "maintainersJournalEntries",
      JSON.stringify(updatedEntries),
    );

    setJournalEntries(updatedEntries);
    setEditingEntryId(null);
  }

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();

  const visibleEntries = journalEntries.filter((entry) => {
    const searchableText = [
      entry.githubUrl,
      entry.title ?? "",
      entry.body ?? "",
    ]
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
        <button type="submit">Submit</button>
      </form>
      <label htmlFor="journal-search">Search saved entries</label>
      <input
        id="journal-search"
        type="search"
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.currentTarget.value)}
        placeholder="Search by title, URL, or notes"
      />
      {previousMatchCount > 0 && (
        <p role="status">
          Earlier entries found for this URL: {previousMatchCount}. The new
          entry was still saved.
        </p>
      )}
      <p>Saved {journalEntries.length}</p>
      {normalizedSearchTerm && visibleEntries.length === 0 && (
        <p role="status">No saved entries match “{searchTerm.trim()}”.</p>
      )}
      <ul>
        {visibleEntries.map((entry) => {
          return (
            <li key={entry.id}>
              <a
                href={entry.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {entry.title || entry.githubUrl}
              </a>
              <p>{new Date(entry.createdAt).toLocaleString()}</p>
              {entry.body && <p className="journal-entry-body">{entry.body}</p>}
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
                <form onSubmit={(event) => handleEditSubmit(event, entry.id)}>
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

                  <button type="button" onClick={() => setEditingEntryId(null)}>
                    Cancel
                  </button>
                </form>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

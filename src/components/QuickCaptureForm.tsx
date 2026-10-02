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

  return (
    <>
      <form onSubmit={handleSubmit}>
        <label htmlFor="github-url">GitHub URL</label>
        <input id="github-url" type="url" name="githubUrl" required={true} />
        <label htmlFor="title">Title</label>
        <input name="title" id="title" type="text" />
        <label htmlFor="body">Journal Note</label>
        <textarea id="body" name="body" rows={6} />
        <button type="submit">Submit</button>
      </form>
      {previousMatchCount > 0 && (
        <p role="status">
          Earlier entries found for this URL: {previousMatchCount}. The new
          entry was still saved.
        </p>
      )}
      <p>Saved {journalEntries.length}</p>
      <ul>
        {journalEntries.map((entry) => {
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
            </li>
          );
        })}
      </ul>
    </>
  );
}

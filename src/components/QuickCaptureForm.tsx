"use client";

import type { FormEvent } from "react";
import { useState, useEffect } from "react";

type JournalEntry = {
  id: string;
  githubUrl: string;
  createdAt: string;
};

export default function QuickCaptureForm() {
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);

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

    const entry: JournalEntry = {
      id: crypto.randomUUID(),
      githubUrl,
      createdAt: new Date().toISOString(),
    };

    const storedEntries = localStorage.getItem("maintainersJournalEntries");

    let entries: JournalEntry[];
    if (storedEntries === null) {
      entries = [];
    } else {
      entries = JSON.parse(storedEntries);
    }
    entries.push(entry);

    const serializedEntries = JSON.stringify(entries);
    localStorage.setItem("maintainersJournalEntries", serializedEntries);
    setJournalEntries(entries);
  }

  return (
    <>
      <form onSubmit={handleSubmit}>
        <label htmlFor="github-url">GitHub URL</label>
        <input id="github-url" type="url" name="githubUrl" required={true} />
        <button type="submit">Submit</button>
      </form>
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
                {entry.githubUrl}
              </a>
              <p>{new Date(entry.createdAt).toLocaleString()}</p>
            </li>
          );
        })}
      </ul>
    </>
  );
}

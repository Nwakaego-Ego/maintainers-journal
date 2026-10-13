"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useState } from "react";
import { groupEntriesByUrl } from "../lib/journalCases";
import {
  isJournalEntry,
  loadJournalEntries,
  saveJournalEntries,
  type JournalEntry,
} from "../lib/journalStorage";
import JournalCaseCard from "./JournalCaseCard";

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

    const body = formData.get("body");

    if (typeof body !== "string") {
      return;
    }

    const nextStep = formData.get("nextStep");

    if (typeof nextStep !== "string") {
      return;
    }

    const entry: JournalEntry = {
      id: crypto.randomUUID(),
      githubUrl,
      createdAt: new Date().toISOString(),
      title: title.trim(),
      body: body.trim(),
      nextStep: nextStep.trim(),
    };

    const entries = loadJournalEntries();

    const matchingEntries = entries.filter((existingEntry) => {
      return existingEntry.githubUrl === githubUrl;
    });

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

  function handleUpdateEntryBody(entryId: string, body: string) {
    const updatedEntries = journalEntries.map((existingEntry) => {
      if (existingEntry.id !== entryId) {
        return existingEntry;
      }

      return {
        ...existingEntry,
        body,
      };
    });

    persistJournalEntries(updatedEntries);
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

    const body = formData.get("body");

    if (typeof body !== "string") {
      return;
    }

    const updatedEntries = journalEntries.map((existingEntry) => {
      if (existingEntry.id !== entryId) {
        return existingEntry;
      }

      return {
        ...existingEntry,
        githubUrl,
        title: title.trim(),
        body: body.trim(),
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
    <div className="journal-layout">
      <aside className="capture-panel">
        <div className="capture-panel-header">
          <p className="panel-kicker">Quick capture</p>
          <h2>Capture context</h2>
          <p>Save the details you will need when you return to this work.</p>
        </div>

        <form className="capture-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="github-url">GitHub URL</label>
            <input
              className="form-control"
              id="github-url"
              type="url"
              name="githubUrl"
              placeholder="https://github.com/owner/repo/issues/123"
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="title">Title</label>
            <input
              className="form-control"
              name="title"
              id="title"
              type="text"
              placeholder="Short, helpful title"
            />
          </div>

          <div className="form-field">
            <label htmlFor="body">Notes</label>
            <textarea
              className="form-control"
              id="body"
              name="body"
              rows={6}
              placeholder="What is the current situation? Record decisions, links, and trade-offs."
            />
          </div>

          <div className="form-field">
            <label htmlFor="next-step">Next step</label>
            <input
              className="form-control"
              id="next-step"
              type="text"
              name="nextStep"
              placeholder="What should happen next?"
            />
          </div>

          <button className="primary-button" type="submit">
            Save entry
          </button>
        </form>

        {previousMatchCount > 0 && (
          <p className="status-message" role="status">
            Earlier entries found for this URL: {previousMatchCount}. The new
            entry was still saved.
          </p>
        )}
      </aside>

      <section className="cases-panel" aria-label="Saved case histories">
        <div className="case-toolbar">
          <div className="search-field">
            <label htmlFor="journal-search">Search cases</label>
            <input
              className="form-control"
              id="journal-search"
              type="search"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.currentTarget.value);
              }}
              placeholder="Search cases, notes, or next steps"
            />
          </div>

          <div className="backup-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={handleExport}
              disabled={journalEntries.length === 0}
            >
              Export backup
            </button>

            <label className="secondary-button backup-file-button">
              Restore backup
              <input
                className="visually-hidden"
                type="file"
                accept=".json,application/json"
                onChange={handleImport}
              />
            </label>
          </div>
        </div>

        <p className="journal-summary">
          <strong>{journalCases.length}</strong>{" "}
          {journalCases.length === 1 ? "case" : "cases"}
          <span aria-hidden="true"> · </span>
          <strong>{journalEntries.length}</strong>{" "}
          {journalEntries.length === 1 ? "entry" : "entries"}
        </p>

        {normalizedSearchTerm && visibleCases.length === 0 && (
          <p className="empty-message" role="status">
            No saved entries match “{searchTerm.trim()}”.
          </p>
        )}

        <ul className="case-list">
          {visibleCases.map((journalCase) => {
            return (
              <JournalCaseCard
                key={journalCase.githubUrl}
                journalCase={journalCase}
                editingEntryId={editingEntryId}
                updatingCaseUrl={updatingCaseUrl}
                editingNextStepId={editingNextStepId}
                onStartEditingEntry={(entryId) => {
                  setEditingEntryId(entryId);
                }}
                onCancelEditingEntry={() => {
                  setEditingEntryId(null);
                }}
                onStartAddingUpdate={(githubUrl) => {
                  setUpdatingCaseUrl(githubUrl);
                }}
                onCancelAddingUpdate={() => {
                  setUpdatingCaseUrl(null);
                }}
                onStartEditingNextStep={(entryId) => {
                  setEditingNextStepId(entryId);
                }}
                onCancelEditingNextStep={() => {
                  setEditingNextStepId(null);
                }}
                onAddUpdate={handleAddUpdate}
                onEditNextStep={handleNextStepEditSubmit}
                onEditEntry={handleEditSubmit}
                onUpdateEntryBody={handleUpdateEntryBody}
                onDeleteEntry={handleDelete}
              />
            );
          })}
        </ul>
      </section>
    </div>
  );
}

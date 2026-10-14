"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { groupEntriesByUrl } from "../lib/journalCases";
import {
  isJournalEntry,
  loadJournalEntries,
  saveJournalEntries,
  type JournalEntry,
} from "../lib/journalStorage";
import JournalCaseCard from "./JournalCaseCard";
import WeeklyPlanView from "./WeeklyPlanView";

type WorkspaceView = "week" | "journals";

type NewJournalDetails = {
  githubUrl: string;
  title: string;
  body: string;
  nextStep: string;
};

function normalizeGitHubUrl(githubUrl: string) {
  return githubUrl.trim().replace(/\/+$/, "");
}

function getJournalKey(githubUrl: string) {
  try {
    const url = new URL(githubUrl.trim());

    const itemMatch = url.pathname.match(
      /^\/([^/]+)\/([^/]+)\/(pull|issues)\/(\d+)/i,
    );

    if (itemMatch) {
      const [, owner, repository, itemType, itemNumber] = itemMatch;

      return [
        url.hostname.toLowerCase(),
        owner.toLowerCase(),
        repository.toLowerCase(),
        itemType.toLowerCase(),
        itemNumber,
      ].join("/");
    }
  } catch {
    return normalizeGitHubUrl(githubUrl).toLowerCase();
  }

  return normalizeGitHubUrl(githubUrl).toLowerCase();
}

function getJournalElementId(githubUrl: string) {
  return `journal-${encodeURIComponent(getJournalKey(githubUrl))}`;
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
  const [activeView, setActiveView] = useState<WorkspaceView>("week");
  const [captureGithubUrl, setCaptureGithubUrl] = useState("");
  const [journalToStartUrl, setJournalToStartUrl] = useState<string | null>(
    null,
  );
  const [targetJournalUrl, setTargetJournalUrl] = useState<string | null>(null);

  const captureFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const entries = loadJournalEntries();

    // eslint-disable-next-line react-hooks/set-state-in-effect -- Restore browser-only localStorage after hydration.
    setJournalEntries(entries);
  }, []);

  useEffect(() => {
    if (activeView !== "journals") {
      return;
    }

    const animationFrame = window.requestAnimationFrame(() => {
      if (journalToStartUrl) {
        captureFormRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });

        const notesField =
          captureFormRef.current?.querySelector<HTMLTextAreaElement>("#body");

        notesField?.focus();
        return;
      }

      if (!targetJournalUrl) {
        return;
      }

      const journalElement = document.getElementById(
        getJournalElementId(targetJournalUrl),
      );

      journalElement?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

      journalElement?.focus({
        preventScroll: true,
      });
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [activeView, journalToStartUrl, targetJournalUrl]);

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

    const cleanGithubUrl = normalizeGitHubUrl(githubUrl);

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
      githubUrl: cleanGithubUrl,
      createdAt: new Date().toISOString(),
      title: title.trim(),
      body: body.trim(),
      nextStep: nextStep.trim(),
    };

    const entries = loadJournalEntries();

    const matchingEntries = entries.filter((existingEntry) => {
      return (
        getJournalKey(existingEntry.githubUrl) === getJournalKey(cleanGithubUrl)
      );
    });

    setPreviousMatchCount(matchingEntries.length);

    entries.push(entry);
    persistJournalEntries(entries);

    event.currentTarget.reset();
    setCaptureGithubUrl("");
    setJournalToStartUrl(null);
    setSearchTerm(cleanGithubUrl);
    setTargetJournalUrl(cleanGithubUrl);
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
        githubUrl: normalizeGitHubUrl(githubUrl),
        title: title.trim(),
        body: body.trim(),
      };
    });

    persistJournalEntries(updatedEntries);
    setEditingEntryId(null);
  }

  function handleCreateJournalFromWeeklyPlan(details: NewJournalDetails) {
    const journalAlreadyExists = journalEntries.some((entry) => {
      return (
        getJournalKey(entry.githubUrl) === getJournalKey(details.githubUrl)
      );
    });

    if (journalAlreadyExists) {
      return;
    }

    const newEntry: JournalEntry = {
      id: crypto.randomUUID(),
      githubUrl: normalizeGitHubUrl(details.githubUrl),
      createdAt: new Date().toISOString(),
      title: details.title,
      body: details.body,
      nextStep: details.nextStep,
    };

    persistJournalEntries([...journalEntries, newEntry]);
  }

  function handleOpenJournal(githubUrl: string) {
    const cleanGithubUrl = normalizeGitHubUrl(githubUrl);
    const journalKey = getJournalKey(cleanGithubUrl);

    const existingEntry = journalEntries.find((entry) => {
      return getJournalKey(entry.githubUrl) === journalKey;
    });

    setActiveView("journals");

    if (existingEntry) {
      setSearchTerm(existingEntry.githubUrl);
      setTargetJournalUrl(existingEntry.githubUrl);
      setCaptureGithubUrl("");
      setJournalToStartUrl(null);
      return;
    }

    setSearchTerm("");
    setTargetJournalUrl(null);
    setCaptureGithubUrl(cleanGithubUrl);
    setJournalToStartUrl(cleanGithubUrl);
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
  const journals = groupEntriesByUrl(journalEntries);

  const visibleJournals = journals.filter((journal) => {
    const searchableText = journal.entries
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
    <div className="workspace-view-shell">
      <div
        className="workspace-tabs"
        role="tablist"
        aria-label="Journal workspace views"
      >
        <button
          className={
            activeView === "week"
              ? "workspace-tab workspace-tab-active"
              : "workspace-tab"
          }
          id="this-week-tab"
          type="button"
          role="tab"
          aria-selected={activeView === "week"}
          aria-controls="this-week-panel"
          onClick={() => {
            setActiveView("week");
          }}
        >
          This Week
        </button>

        <button
          className={
            activeView === "journals"
              ? "workspace-tab workspace-tab-active"
              : "workspace-tab"
          }
          id="all-journals-tab"
          type="button"
          role="tab"
          aria-selected={activeView === "journals"}
          aria-controls="all-journals-panel"
          onClick={() => {
            setActiveView("journals");
          }}
        >
          All Journals
        </button>
      </div>

      {activeView === "week" ? (
        <div
          id="this-week-panel"
          role="tabpanel"
          aria-labelledby="this-week-tab"
        >
          <WeeklyPlanView
            journalEntries={journalEntries}
            onOpenJournal={handleOpenJournal}
            onCreateJournal={handleCreateJournalFromWeeklyPlan}
          />
        </div>
      ) : (
        <div
          id="all-journals-panel"
          role="tabpanel"
          aria-labelledby="all-journals-tab"
        >
          <div className="journal-layout">
            <aside className="capture-panel">
              <div className="capture-panel-header">
                <p className="panel-kicker">Quick capture</p>
                <h2>Capture context</h2>
                <p>
                  Save the details you will need when you return to this work.
                </p>
              </div>

              {journalToStartUrl && (
                <p className="status-message" role="status">
                  This GitHub item does not have a saved journal yet. Its URL is
                  ready below. Add the first entry to start its history.
                </p>
              )}

              <form
                ref={captureFormRef}
                className="capture-form"
                onSubmit={handleSubmit}
              >
                <div className="form-field">
                  <label htmlFor="github-url">GitHub URL</label>
                  <input
                    className="form-control"
                    id="github-url"
                    type="url"
                    name="githubUrl"
                    value={captureGithubUrl}
                    placeholder="https://github.com/owner/repo/issues/123"
                    required
                    onChange={(event) => {
                      setCaptureGithubUrl(event.currentTarget.value);
                    }}
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
                    placeholder="Record decisions, links, and trade-offs."
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
                  Earlier entries found for this URL: {previousMatchCount}. The
                  new entry was still saved.
                </p>
              )}
            </aside>

            <section
              className="cases-panel"
              aria-label="Saved journal histories"
            >
              <div className="case-toolbar">
                <div className="search-field">
                  <label htmlFor="journal-search">Search journals</label>

                  <input
                    className="form-control"
                    id="journal-search"
                    type="search"
                    value={searchTerm}
                    onChange={(event) => {
                      setSearchTerm(event.currentTarget.value);
                    }}
                    placeholder="Search journals, notes, or next steps"
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
                <strong>{journals.length}</strong>{" "}
                {journals.length === 1 ? "journal" : "journals"}
                <span aria-hidden="true"> · </span>
                <strong>{journalEntries.length}</strong>{" "}
                {journalEntries.length === 1 ? "entry" : "entries"}
              </p>

              {normalizedSearchTerm && visibleJournals.length === 0 && (
                <p className="empty-message" role="status">
                  No saved journals match “{searchTerm.trim()}”.
                </p>
              )}

              <ul className="case-list">
                {visibleJournals.map((journal) => {
                  return (
                    <JournalCaseCard
                      key={journal.githubUrl}
                      caseElementId={getJournalElementId(journal.githubUrl)}
                      journalCase={journal}
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
        </div>
      )}
    </div>
  );
}

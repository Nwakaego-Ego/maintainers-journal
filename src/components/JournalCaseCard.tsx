"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import type { JournalCase } from "../lib/journalCases";

type JournalCaseCardProps = {
  caseElementId: string;
  journalCase: JournalCase;
  editingEntryId: string | null;
  updatingCaseUrl: string | null;
  editingNextStepId: string | null;
  onStartEditingEntry: (entryId: string) => void;
  onCancelEditingEntry: () => void;
  onStartAddingUpdate: (githubUrl: string) => void;
  onCancelAddingUpdate: () => void;
  onStartEditingNextStep: (entryId: string) => void;
  onCancelEditingNextStep: () => void;
  onAddUpdate: (event: FormEvent<HTMLFormElement>, githubUrl: string) => void;
  onEditNextStep: (event: FormEvent<HTMLFormElement>, entryId: string) => void;
  onEditEntry: (event: FormEvent<HTMLFormElement>, entryId: string) => void;
  onUpdateEntryBody: (entryId: string, body: string) => void;
  onDeleteEntry: (entryId: string) => void;
};

export default function JournalCaseCard({
  caseElementId,
  journalCase,
  editingEntryId,
  updatingCaseUrl,
  editingNextStepId,
  onStartEditingEntry,
  onCancelEditingEntry,
  onStartAddingUpdate,
  onCancelAddingUpdate,
  onStartEditingNextStep,
  onCancelEditingNextStep,
  onAddUpdate,
  onEditNextStep,
  onEditEntry,
  onUpdateEntryBody,
  onDeleteEntry,
}: JournalCaseCardProps) {
  const [isCardExpanded, setIsCardExpanded] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [expandedNoteIds, setExpandedNoteIds] = useState<Set<string>>(
    () => new Set(),
  );

  const entriesNewestFirst = [...journalCase.entries].sort((a, b) => {
    return b.createdAt.localeCompare(a.createdAt);
  });

  const latestEntry = entriesNewestFirst[0];

  const latestNextStepEntry = entriesNewestFirst.find((entry) => {
    return entry.nextStep?.trim();
  });

  const currentNextStep = latestNextStepEntry?.nextStep;
  const hasMultipleEntries = journalCase.entries.length > 1;

  const visibleEntries = isHistoryExpanded
    ? entriesNewestFirst
    : entriesNewestFirst.slice(0, 1);

  function toggleNote(entryId: string) {
    setExpandedNoteIds((currentIds) => {
      const nextIds = new Set(currentIds);

      if (nextIds.has(entryId)) {
        nextIds.delete(entryId);
      } else {
        nextIds.add(entryId);
      }

      return nextIds;
    });
  }

  function toggleCard() {
    if (isCardExpanded) {
      setIsHistoryExpanded(false);
      setExpandedNoteIds(new Set());
    }

    setIsCardExpanded((currentValue) => !currentValue);
  }

  return (
    <li id={caseElementId} className="case-card" tabIndex={-1}>
      <header className="case-card-header">
        <div className="case-identity">
          <span className="case-status-dot" aria-hidden="true" />

          <div>
            <a
              className="case-url"
              href={journalCase.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {journalCase.githubUrl}
            </a>

            <p className="case-entry-count">
              {journalCase.entries.length}{" "}
              {journalCase.entries.length === 1
                ? "journal entry"
                : "journal entries"}
            </p>
          </div>
        </div>

        <div className="case-card-actions">
          <button
            type="button"
            className="case-action-button"
            onClick={() => {
              setIsCardExpanded(true);
              onStartAddingUpdate(journalCase.githubUrl);
            }}
          >
            Add update
          </button>

          <button
            type="button"
            className="case-action-button"
            aria-expanded={isCardExpanded}
            onClick={toggleCard}
          >
            {isCardExpanded ? "Show less" : "View journal"}
          </button>
        </div>
      </header>

      {currentNextStep && latestNextStepEntry && (
        <section className="next-step-panel">
          <div className="next-step-content">
            <p className="next-step-label">Next step</p>

            <p className="next-step-text" title={currentNextStep}>
              {currentNextStep}
            </p>
          </div>

          <button
            type="button"
            className="case-action-button next-step-button"
            onClick={() => {
              onStartEditingNextStep(latestNextStepEntry.id);
            }}
          >
            Edit next step
          </button>

          {editingNextStepId === latestNextStepEntry.id && (
            <form
              className="inline-form next-step-edit-form"
              onSubmit={(event) => {
                onEditNextStep(event, latestNextStepEntry.id);
              }}
            >
              <label className="form-field">
                <span>Next step</span>

                <input
                  className="form-control"
                  type="text"
                  name="nextStep"
                  defaultValue={currentNextStep}
                />
              </label>

              <div className="inline-form-actions">
                <button type="submit" className="primary-button">
                  Save next step
                </button>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={onCancelEditingNextStep}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      {updatingCaseUrl === journalCase.githubUrl && (
        <form
          className="inline-form add-update-form"
          onSubmit={(event) => {
            onAddUpdate(event, journalCase.githubUrl);
          }}
        >
          <h3>Add a new update</h3>

          <label className="form-field">
            <span>Title</span>

            <input className="form-control" type="text" name="title" />
          </label>

          <label className="form-field">
            <span>Notes</span>

            <textarea className="form-control" name="body" rows={4} />
          </label>

          <label className="form-field">
            <span>Next step</span>

            <input className="form-control" type="text" name="nextStep" />
          </label>

          <div className="inline-form-actions">
            <button type="submit" className="primary-button">
              Save update
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={onCancelAddingUpdate}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {!isCardExpanded && latestEntry && (
        <section className="journal-card-preview" aria-label="Latest update">
          <div className="journal-card-preview-heading">
            <strong>{latestEntry.title || "Latest update"}</strong>

            <time dateTime={latestEntry.createdAt}>
              {new Date(latestEntry.createdAt).toLocaleDateString()}
            </time>
          </div>

          <p className="journal-card-preview-note">
            {latestEntry.body?.trim() || "No notes added yet."}
          </p>
        </section>
      )}

      {isCardExpanded && (
        <>
          <div className="history-heading">
            {hasMultipleEntries ? (
              <button
                type="button"
                className="history-heading-button"
                aria-expanded={isHistoryExpanded}
                onClick={() => {
                  setIsHistoryExpanded((currentValue) => !currentValue);
                }}
              >
                <span>History</span>

                <span className="history-toggle-label">
                  {isHistoryExpanded
                    ? "Show latest only"
                    : `Show ${journalCase.entries.length - 1} earlier ${
                        journalCase.entries.length - 1 === 1
                          ? "update"
                          : "updates"
                      }`}
                </span>
              </button>
            ) : (
              <h3>History</h3>
            )}
          </div>

          <ol className="history-list">
            {visibleEntries.map((entry) => {
              const noteBody = entry.body ?? "";
              const isNoteExpanded = expandedNoteIds.has(entry.id);

              return (
                <li className="history-item" key={entry.id}>
                  <span className="history-marker" aria-hidden="true" />

                  <time className="history-date" dateTime={entry.createdAt}>
                    {new Date(entry.createdAt).toLocaleString()}
                  </time>

                  <article className="history-content">
                    {entry.title && (
                      <h4 className="history-title">{entry.title}</h4>
                    )}

                    <textarea
                      className={`history-note-editor ${
                        isNoteExpanded
                          ? "history-note-editor-expanded"
                          : "history-note-editor-collapsed"
                      }`}
                      aria-label={`Notes for ${entry.title || "journal entry"}`}
                      value={noteBody}
                      spellCheck
                      placeholder="Add notes for this update..."
                      onChange={(event) => {
                        onUpdateEntryBody(entry.id, event.currentTarget.value);
                      }}
                    />

                    {/* <p className="note-save-hint">Saved automatically</p> */}

                    <div className="entry-actions">
                      <button
                        type="button"
                        className="entry-action-button"
                        aria-expanded={isNoteExpanded}
                        onClick={() => {
                          toggleNote(entry.id);
                        }}
                      >
                        {isNoteExpanded ? "Show less" : "Show full note"}
                      </button>

                      <button
                        type="button"
                        className="entry-action-button"
                        onClick={() => {
                          onStartEditingEntry(entry.id);
                        }}
                      >
                        Edit details
                      </button>

                      <button
                        type="button"
                        className="entry-action-button danger-action"
                        onClick={() => {
                          onDeleteEntry(entry.id);
                        }}
                      >
                        Delete
                      </button>
                    </div>

                    {editingEntryId === entry.id && (
                      <form
                        className="inline-form entry-edit-form"
                        onSubmit={(event) => {
                          onEditEntry(event, entry.id);
                        }}
                      >
                        <input
                          type="hidden"
                          name="body"
                          value={entry.body ?? ""}
                        />

                        <label className="form-field">
                          <span>GitHub URL</span>

                          <input
                            className="form-control"
                            type="url"
                            name="githubUrl"
                            defaultValue={entry.githubUrl}
                            required
                          />
                        </label>

                        <label className="form-field">
                          <span>Title</span>

                          <input
                            className="form-control"
                            type="text"
                            name="title"
                            defaultValue={entry.title}
                          />
                        </label>

                        <div className="inline-form-actions">
                          <button type="submit" className="primary-button">
                            Save details
                          </button>

                          <button
                            type="button"
                            className="secondary-button"
                            onClick={onCancelEditingEntry}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </article>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </li>
  );
}

"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import type { JournalCase } from "../lib/journalCases";

type JournalCaseCardProps = {
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
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

  const latestNextStepEntry = [...journalCase.entries]
    .reverse()
    .find((entry) => entry.nextStep?.trim());

  const currentNextStep = latestNextStepEntry?.nextStep;
  const hasMultipleEntries = journalCase.entries.length > 1;

  const visibleEntries = isHistoryExpanded
    ? journalCase.entries
    : journalCase.entries.slice(-1);

  return (
    <li className="case-card">
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

        <button
          type="button"
          className="case-action-button"
          onClick={() => {
            onStartAddingUpdate(journalCase.githubUrl);
          }}
        >
          Add update
        </button>
      </header>

      {currentNextStep && latestNextStepEntry && (
        <section className="next-step-panel">
          <div className="next-step-content">
            <p className="next-step-label">Next step</p>
            <p className="next-step-text">{currentNextStep}</p>
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
            History
          </button>
        ) : (
          <h3>History</h3>
        )}
      </div>

      <ol className="history-list">
        {visibleEntries.map((entry) => {
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
                  className="history-note-editor"
                  aria-label={`Notes for ${entry.title || "journal entry"}`}
                  value={entry.body ?? ""}
                  rows={3}
                  spellCheck
                  placeholder="Add notes for this update..."
                  onChange={(event) => {
                    onUpdateEntryBody(entry.id, event.currentTarget.value);
                  }}
                />

                <p className="note-save-hint">Saved automatically</p>

                <div className="entry-actions">
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
                    <input type="hidden" name="body" value={entry.body ?? ""} />

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
    </li>
  );
}

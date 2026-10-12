"use client";

import type { FormEvent } from "react";
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
  onDeleteEntry,
}: JournalCaseCardProps) {
  const latestNextStepEntry = [...journalCase.entries]
    .reverse()
    .find((entry) => entry.nextStep?.trim());

  const currentNextStep = latestNextStepEntry?.nextStep;

  return (
    <li>
      <a href={journalCase.githubUrl} target="_blank" rel="noopener noreferrer">
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
              onStartEditingNextStep(latestNextStepEntry.id);
            }}
          >
            Edit next step
          </button>

          {editingNextStepId === latestNextStepEntry.id && (
            <form
              onSubmit={(event) => {
                onEditNextStep(event, latestNextStepEntry.id);
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

              <button type="button" onClick={onCancelEditingNextStep}>
                Cancel
              </button>
            </form>
          )}
        </>
      )}

      <p>
        {journalCase.entries.length}{" "}
        {journalCase.entries.length === 1 ? "journal entry" : "journal entries"}
      </p>

      <button
        type="button"
        onClick={() => {
          onStartAddingUpdate(journalCase.githubUrl);
        }}
      >
        Add update
      </button>

      {updatingCaseUrl === journalCase.githubUrl && (
        <form
          onSubmit={(event) => {
            onAddUpdate(event, journalCase.githubUrl);
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

          <button type="button" onClick={onCancelAddingUpdate}>
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

              {entry.body && <p className="journal-entry-body">{entry.body}</p>}

              <button
                type="button"
                onClick={() => {
                  onStartEditingEntry(entry.id);
                }}
              >
                Edit
              </button>

              <button
                type="button"
                onClick={() => {
                  onDeleteEntry(entry.id);
                }}
              >
                Delete
              </button>

              {editingEntryId === entry.id && (
                <form
                  onSubmit={(event) => {
                    onEditEntry(event, entry.id);
                  }}
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

                  <button type="button" onClick={onCancelEditingEntry}>
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
}

"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import type { JournalEntry } from "../lib/journalStorage";
import {
  getCurrentWeekStart,
  loadWeeklyPlans,
  saveWeeklyPlans,
  type WeeklyPlan,
  type WeeklyPlanItem,
} from "../lib/weeklyPlanStorage";

type NewJournalDetails = {
  githubUrl: string;
  title: string;
  body: string;
  nextStep: string;
};

type WeeklyPlanViewProps = {
  journalEntries: JournalEntry[];
  onOpenJournal: (githubUrl: string) => void;
  onCreateJournal: (details: NewJournalDetails) => void;
};

function extractGitHubUrls(value: string) {
  const matches = value.match(/https?:\/\/github\.com\/[^\s]+/gi) ?? [];

  const cleanedUrls = matches.map((url) => {
    return url.replace(/[),.;\]}]+$/, "");
  });

  return Array.from(new Set(cleanedUrls));
}

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

function getItemGitHubUrl(item: WeeklyPlanItem) {
  if (item.githubUrl) {
    return item.githubUrl;
  }

  return extractGitHubUrls(item.title)[0];
}

function getGitHubItemLabel(githubUrl: string) {
  if (/\/pull\/\d+/i.test(githubUrl)) {
    return "PR";
  }

  if (/\/issues\/\d+/i.test(githubUrl)) {
    return "Issue";
  }

  return "GitHub";
}

function getGitHubItemTitle(githubUrl: string, journalEntries: JournalEntry[]) {
  const journalKey = getJournalKey(githubUrl);

  const matchingEntries = journalEntries.filter((entry) => {
    return getJournalKey(entry.githubUrl) === journalKey;
  });

  const latestEntryWithTitle = [...matchingEntries]
    .reverse()
    .find((entry) => entry.title?.trim());

  if (latestEntryWithTitle?.title) {
    return latestEntryWithTitle.title;
  }

  const pullRequestMatch = githubUrl.match(/\/pull\/(\d+)/i);

  if (pullRequestMatch) {
    return `PR #${pullRequestMatch[1]}`;
  }

  const issueMatch = githubUrl.match(/\/issues\/(\d+)/i);

  if (issueMatch) {
    return `Issue #${issueMatch[1]}`;
  }

  return githubUrl;
}

function formatWeekRange(weekOf: string) {
  if (!weekOf) {
    return "";
  }

  const startDate = new Date(`${weekOf}T00:00:00`);
  const endDate = new Date(startDate);

  endDate.setDate(startDate.getDate() + 6);

  const startLabel = startDate.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  const endLabel = endDate.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `${startLabel} – ${endLabel}`;
}

function getNextWeek(weekOf: string) {
  const nextWeek = new Date(`${weekOf}T00:00:00`);

  nextWeek.setDate(nextWeek.getDate() + 7);

  const year = nextWeek.getFullYear();
  const month = String(nextWeek.getMonth() + 1).padStart(2, "0");
  const day = String(nextWeek.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function WeeklyPlanView({
  journalEntries,
  onOpenJournal,
  onCreateJournal,
}: WeeklyPlanViewProps) {
  const [weeklyPlans, setWeeklyPlans] = useState<WeeklyPlan[]>([]);
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeekStart);
  const [githubUrlText, setGithubUrlText] = useState("");
  const [standaloneTask, setStandaloneTask] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [startingJournalItemId, setStartingJournalItemId] = useState<
    string | null
  >(null);
  const [journalFormErrorItemId, setJournalFormErrorItemId] = useState<
    string | null
  >(null);

  useEffect(() => {
    const storedPlans = loadWeeklyPlans();

    // eslint-disable-next-line react-hooks/set-state-in-effect -- Restore browser-only localStorage after hydration.
    setWeeklyPlans(storedPlans);
  }, []);

  const currentPlan = weeklyPlans.find((plan) => {
    return plan.weekOf === selectedWeek;
  });

  const currentItems = currentPlan?.items ?? [];

  const completedCount = currentItems.filter((item) => {
    return item.completed;
  }).length;

  const progressPercentage =
    currentItems.length === 0
      ? 0
      : Math.round((completedCount / currentItems.length) * 100);

  const previousPlans = [...weeklyPlans].sort((a, b) => {
    return b.weekOf.localeCompare(a.weekOf);
  });

  function persistWeeklyPlans(plans: WeeklyPlan[]) {
    saveWeeklyPlans(plans);
    setWeeklyPlans(plans);
  }

  function replaceSelectedWeekItems(items: WeeklyPlanItem[]) {
    const existingPlan = weeklyPlans.find((plan) => {
      return plan.weekOf === selectedWeek;
    });

    if (existingPlan) {
      const updatedPlans = weeklyPlans.map((plan) => {
        if (plan.id !== existingPlan.id) {
          return plan;
        }

        return {
          ...plan,
          items,
        };
      });

      persistWeeklyPlans(updatedPlans);
      return;
    }

    const newPlan: WeeklyPlan = {
      id: crypto.randomUUID(),
      weekOf: selectedWeek,
      createdAt: new Date().toISOString(),
      items,
    };

    persistWeeklyPlans([...weeklyPlans, newPlan]);
  }

  function handleAddItems(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const urlsFromGitHubField = extractGitHubUrls(githubUrlText);
    const urlsFromStandaloneField = extractGitHubUrls(standaloneTask);

    const githubUrls = Array.from(
      new Set([...urlsFromGitHubField, ...urlsFromStandaloneField]),
    );

    const cleanStandaloneTask =
      urlsFromStandaloneField.length === 0 ? standaloneTask.trim() : "";

    if (githubUrls.length === 0 && !cleanStandaloneTask) {
      setStatusMessage("Add at least one GitHub URL or a standalone task.");
      return;
    }

    const existingJournalKeys = new Set(
      currentItems
        .map((item) => {
          const githubUrl = getItemGitHubUrl(item);

          return githubUrl ? getJournalKey(githubUrl) : undefined;
        })
        .filter((journalKey): journalKey is string => {
          return typeof journalKey === "string";
        }),
    );

    const newGitHubItems: WeeklyPlanItem[] = githubUrls
      .filter((githubUrl) => {
        return !existingJournalKeys.has(getJournalKey(githubUrl));
      })
      .map((githubUrl) => {
        return {
          id: crypto.randomUUID(),
          type: "github",
          title: getGitHubItemTitle(githubUrl, journalEntries),
          githubUrl: normalizeGitHubUrl(githubUrl),
          completed: false,
          createdAt: new Date().toISOString(),
        };
      });

    const newStandaloneItems: WeeklyPlanItem[] = cleanStandaloneTask
      ? [
          {
            id: crypto.randomUUID(),
            type: "standalone",
            title: cleanStandaloneTask,
            completed: false,
            createdAt: new Date().toISOString(),
          },
        ]
      : [];

    const addedCount = newGitHubItems.length + newStandaloneItems.length;

    if (addedCount === 0) {
      setStatusMessage("Those journals are already included in this week.");
      return;
    }

    replaceSelectedWeekItems([
      ...currentItems,
      ...newGitHubItems,
      ...newStandaloneItems,
    ]);

    setGithubUrlText("");
    setStandaloneTask("");

    setStatusMessage(
      addedCount === 1
        ? "Added 1 item to this week."
        : `Added ${addedCount} items to this week.`,
    );
  }

  function handleStartJournalSubmit(
    event: FormEvent<HTMLFormElement>,
    itemId: string,
    githubUrl: string,
  ) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const title = formData.get("title");
    const body = formData.get("body");
    const nextStep = formData.get("nextStep");

    if (
      typeof title !== "string" ||
      typeof body !== "string" ||
      typeof nextStep !== "string"
    ) {
      return;
    }

    const cleanTitle = title.trim();
    const cleanBody = body.trim();
    const cleanNextStep = nextStep.trim();

    if (!cleanTitle && !cleanBody && !cleanNextStep) {
      setJournalFormErrorItemId(itemId);
      return;
    }

    onCreateJournal({
      githubUrl: normalizeGitHubUrl(githubUrl),
      title: cleanTitle,
      body: cleanBody,
      nextStep: cleanNextStep,
    });

    event.currentTarget.reset();
    setJournalFormErrorItemId(null);
    setStartingJournalItemId(null);
    setStatusMessage("Journal started. You can now open its complete history.");
  }

  function handleToggleItem(itemId: string) {
    const updatedItems = currentItems.map((item) => {
      if (item.id !== itemId) {
        return item;
      }

      return {
        ...item,
        completed: !item.completed,
      };
    });

    replaceSelectedWeekItems(updatedItems);
  }

  function handleDeleteItem(itemId: string) {
    const shouldDelete = window.confirm(
      "Remove this item from the weekly plan?",
    );

    if (!shouldDelete) {
      return;
    }

    const remainingItems = currentItems.filter((item) => {
      return item.id !== itemId;
    });

    replaceSelectedWeekItems(remainingItems);

    if (startingJournalItemId === itemId) {
      setStartingJournalItemId(null);
      setJournalFormErrorItemId(null);
    }

    setStatusMessage("The item was removed from this week.");
  }

  function handleCarryForward() {
    const unfinishedItems = currentItems.filter((item) => {
      return !item.completed;
    });

    if (unfinishedItems.length === 0) {
      setStatusMessage("There are no unfinished items to carry forward.");
      return;
    }

    const nextWeek = getNextWeek(selectedWeek);

    const nextWeekPlan = weeklyPlans.find((plan) => {
      return plan.weekOf === nextWeek;
    });

    const nextWeekItems = nextWeekPlan?.items ?? [];

    const carriedItems = unfinishedItems.filter((unfinishedItem) => {
      const unfinishedUrl = getItemGitHubUrl(unfinishedItem);

      return !nextWeekItems.some((nextWeekItem) => {
        const nextWeekUrl = getItemGitHubUrl(nextWeekItem);

        if (unfinishedUrl && nextWeekUrl) {
          return getJournalKey(unfinishedUrl) === getJournalKey(nextWeekUrl);
        }

        return (
          unfinishedItem.type === "standalone" &&
          nextWeekItem.type === "standalone" &&
          unfinishedItem.title.toLowerCase() ===
            nextWeekItem.title.toLowerCase()
        );
      });
    });

    const copiedItems = carriedItems.map((item) => {
      const detectedGithubUrl = getItemGitHubUrl(item);

      if (detectedGithubUrl) {
        return {
          ...item,
          id: crypto.randomUUID(),
          type: "github" as const,
          githubUrl: detectedGithubUrl,
          completed: false,
          createdAt: new Date().toISOString(),
        };
      }

      return {
        ...item,
        id: crypto.randomUUID(),
        completed: false,
        createdAt: new Date().toISOString(),
      };
    });

    let updatedPlans: WeeklyPlan[];

    if (nextWeekPlan) {
      updatedPlans = weeklyPlans.map((plan) => {
        if (plan.id !== nextWeekPlan.id) {
          return plan;
        }

        return {
          ...plan,
          items: [...plan.items, ...copiedItems],
        };
      });
    } else {
      updatedPlans = [
        ...weeklyPlans,
        {
          id: crypto.randomUUID(),
          weekOf: nextWeek,
          createdAt: new Date().toISOString(),
          items: copiedItems,
        },
      ];
    }

    persistWeeklyPlans(updatedPlans);
    setSelectedWeek(nextWeek);
    setStartingJournalItemId(null);
    setJournalFormErrorItemId(null);

    setStatusMessage(
      copiedItems.length === 1
        ? "Carried 1 unfinished item into the next week."
        : `Carried ${copiedItems.length} unfinished items into the next week.`,
    );
  }

  return (
    <div className="weekly-plan-layout">
      <aside className="weekly-plan-editor">
        <div className="capture-panel-header">
          <p className="panel-kicker">Weekly plan</p>
          <h2>Plan this week</h2>
          <p>
            Collect the pull requests, issues, and other tasks you want to focus
            on this week.
          </p>
        </div>

        <form className="capture-form" onSubmit={handleAddItems}>
          <div className="form-field">
            <label htmlFor="weekly-plan-date">Week of</label>
            <input
              className="form-control"
              id="weekly-plan-date"
              type="date"
              value={selectedWeek}
              onChange={(event) => {
                setSelectedWeek(event.currentTarget.value);
                setStartingJournalItemId(null);
                setJournalFormErrorItemId(null);
                setStatusMessage("");
              }}
            />
          </div>

          <div className="form-field">
            <label htmlFor="weekly-github-urls">Paste GitHub URLs</label>
            <textarea
              className="form-control"
              id="weekly-github-urls"
              rows={7}
              value={githubUrlText}
              placeholder={`https://github.com/owner/repo/pull/123
https://github.com/owner/repo/issues/456`}
              onChange={(event) => {
                setGithubUrlText(event.currentTarget.value);
              }}
            />

            <p className="field-help">
              You can paste several URLs at once, including URLs mixed into
              other text.
            </p>
          </div>

          <div className="form-field">
            <label htmlFor="standalone-weekly-task">Standalone task</label>
            <input
              className="form-control"
              id="standalone-weekly-task"
              type="text"
              value={standaloneTask}
              placeholder="For example: follow up with Dora"
              onChange={(event) => {
                setStandaloneTask(event.currentTarget.value);
              }}
            />
          </div>

          <button className="primary-button" type="submit">
            Add to this week
          </button>
        </form>

        {statusMessage && (
          <p className="status-message" role="status">
            {statusMessage}
          </p>
        )}
      </aside>

      <section className="weekly-plan-board" aria-label="Weekly work plan">
        <div className="weekly-plan-heading">
          <div>
            <p className="panel-kicker">This week</p>
            <h2>{formatWeekRange(selectedWeek)}</h2>
          </div>

          <div className="weekly-plan-actions">
            <button
              className="secondary-button"
              type="button"
              disabled={currentItems.length === 0}
              onClick={handleCarryForward}
            >
              Carry unfinished forward
            </button>

            {previousPlans.length > 0 && (
              <label className="previous-weeks-field">
                Previous weeks
                <select
                  className="form-control"
                  value={selectedWeek}
                  onChange={(event) => {
                    setSelectedWeek(event.currentTarget.value);
                    setStartingJournalItemId(null);
                    setJournalFormErrorItemId(null);
                    setStatusMessage("");
                  }}
                >
                  {!previousPlans.some((plan) => {
                    return plan.weekOf === selectedWeek;
                  }) && (
                    <option value={selectedWeek}>
                      {formatWeekRange(selectedWeek)}
                    </option>
                  )}

                  {previousPlans.map((plan) => {
                    return (
                      <option key={plan.id} value={plan.weekOf}>
                        {formatWeekRange(plan.weekOf)}
                      </option>
                    );
                  })}
                </select>
              </label>
            )}
          </div>
        </div>

        <div className="weekly-progress">
          <div className="weekly-progress-copy">
            <span>
              {completedCount} of {currentItems.length} completed
            </span>
            <strong>{progressPercentage}%</strong>
          </div>

          <div
            className="weekly-progress-track"
            role="progressbar"
            aria-label="Weekly plan progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPercentage}
          >
            <span
              style={{
                width: `${progressPercentage}%`,
              }}
            />
          </div>
        </div>

        {currentItems.length === 0 ? (
          <div className="weekly-empty-state">
            <h3>No items planned for this week</h3>
            <p>Add GitHub URLs or a standalone task using the form.</p>
          </div>
        ) : (
          <ul className="weekly-item-list">
            {currentItems.map((item) => {
              const itemGithubUrl = getItemGitHubUrl(item);

              const journalExists = itemGithubUrl
                ? journalEntries.some((entry) => {
                    return (
                      getJournalKey(entry.githubUrl) ===
                      getJournalKey(itemGithubUrl)
                    );
                  })
                : false;

              const isStartingJournal = startingJournalItemId === item.id;

              return (
                <li
                  className={
                    item.completed
                      ? "weekly-item weekly-item-completed"
                      : "weekly-item"
                  }
                  key={item.id}
                >
                  <label className="weekly-item-checkbox">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => {
                        handleToggleItem(item.id);
                      }}
                    />

                    <span className="visually-hidden">
                      Mark {item.title} as completed
                    </span>
                  </label>

                  <div className="weekly-item-content">
                    <div className="weekly-item-title-row">
                      <h3>{item.title}</h3>

                      <span className="weekly-item-type">
                        {itemGithubUrl
                          ? getGitHubItemLabel(itemGithubUrl)
                          : "Task"}
                      </span>
                    </div>

                    {itemGithubUrl && (
                      <a
                        className="weekly-item-url"
                        href={itemGithubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {itemGithubUrl}
                      </a>
                    )}

                    <div className="weekly-item-buttons">
                      {itemGithubUrl && journalExists && (
                        <button
                          className="text-button"
                          type="button"
                          onClick={() => {
                            onOpenJournal(itemGithubUrl);
                          }}
                        >
                          Open journal
                        </button>
                      )}

                      {itemGithubUrl && !journalExists && (
                        <button
                          className="text-button"
                          type="button"
                          aria-expanded={isStartingJournal}
                          onClick={() => {
                            setJournalFormErrorItemId(null);

                            setStartingJournalItemId(
                              isStartingJournal ? null : item.id,
                            );
                          }}
                        >
                          Start journal
                        </button>
                      )}

                      <button
                        className="danger-text-button"
                        type="button"
                        onClick={() => {
                          handleDeleteItem(item.id);
                        }}
                      >
                        Remove
                      </button>
                    </div>

                    {itemGithubUrl && !journalExists && isStartingJournal && (
                      <form
                        className="weekly-journal-form"
                        onSubmit={(event) => {
                          handleStartJournalSubmit(
                            event,
                            item.id,
                            itemGithubUrl,
                          );
                        }}
                      >
                        <div className="form-field">
                          <label htmlFor={`weekly-journal-title-${item.id}`}>
                            Title
                          </label>

                          <input
                            className="form-control"
                            id={`weekly-journal-title-${item.id}`}
                            type="text"
                            name="title"
                            placeholder="Add a short title"
                          />
                        </div>

                        <div className="form-field">
                          <label htmlFor={`weekly-journal-body-${item.id}`}>
                            Notes
                          </label>

                          <textarea
                            className="form-control"
                            id={`weekly-journal-body-${item.id}`}
                            name="body"
                            rows={5}
                            placeholder="Record the current context, decisions, or research."
                          />
                        </div>

                        <div className="form-field">
                          <label
                            htmlFor={`weekly-journal-next-step-${item.id}`}
                          >
                            Next step
                          </label>

                          <input
                            className="form-control"
                            id={`weekly-journal-next-step-${item.id}`}
                            type="text"
                            name="nextStep"
                            placeholder="What should happen next?"
                          />
                        </div>

                        {journalFormErrorItemId === item.id && (
                          <p className="inline-error-message" role="status">
                            Add a title, note, or next step before saving the
                            journal.
                          </p>
                        )}

                        <div className="weekly-journal-form-actions">
                          <button className="primary-button" type="submit">
                            Save journal
                          </button>

                          <button
                            className="secondary-button"
                            type="button"
                            onClick={() => {
                              setStartingJournalItemId(null);
                              setJournalFormErrorItemId(null);
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

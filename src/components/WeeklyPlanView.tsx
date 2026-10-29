"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import type { JournalEntry } from "../lib/journalStorage";
import {
  loadWeeklyPlans,
  saveWeeklyPlans,
  type WeeklyPlan,
  type WeeklyPlanItem,
} from "../lib/weeklyPlanStorage";
import CopyLinkButton from "./CopyLinkButton";
type NewJournalDetails = {
  githubUrl: string;
  title: string;
  body: string;
  nextStep: string;
};

type WeeklyPlanViewProps = {
  journalEntries: JournalEntry[];
  selectedWeek: string;
  onSelectedWeekChange: (weekOf: string) => void;
  onOpenJournal: (githubUrl: string) => void;
  onCreateJournal: (details: NewJournalDetails) => void;
  onDueReminderCountChange: (count: number) => void;
};

type DueReminder = {
  item: WeeklyPlanItem;
  planId: string;
  weekOf: string;
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

function formatReminderDate(reminderAt: string) {
  return new Date(reminderAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getReminderInputValue(reminderAt?: string) {
  if (!reminderAt) {
    return "";
  }

  const reminderDate = new Date(reminderAt);

  if (Number.isNaN(reminderDate.getTime())) {
    return "";
  }

  const timezoneOffset = reminderDate.getTimezoneOffset() * 60_000;

  return new Date(reminderDate.getTime() - timezoneOffset)
    .toISOString()
    .slice(0, 16);
}

function removeReminderFromItem(item: WeeklyPlanItem) {
  const itemWithoutReminder = { ...item };

  delete itemWithoutReminder.reminderAt;

  return itemWithoutReminder;
}

export default function WeeklyPlanView({
  journalEntries,
  selectedWeek,
  onSelectedWeekChange,
  onOpenJournal,
  onCreateJournal,
  onDueReminderCountChange,
}: WeeklyPlanViewProps) {
  const [weeklyPlans, setWeeklyPlans] = useState<WeeklyPlan[]>([]);

  const [githubUrlText, setGithubUrlText] = useState("");
  const [standaloneTask, setStandaloneTask] = useState("");
  const [newItemReminderAt, setNewItemReminderAt] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [showStandaloneOnly, setShowStandaloneOnly] = useState(false);
  const [startingJournalItemId, setStartingJournalItemId] = useState<
    string | null
  >(null);
  const [journalFormErrorItemId, setJournalFormErrorItemId] = useState<
    string | null
  >(null);
  const [editingReminderItemId, setEditingReminderItemId] = useState<
    string | null
  >(null);
  const [editingTaskItemId, setEditingTaskItemId] = useState<string | null>(
    null,
  );
  const [targetWeeklyItemId, setTargetWeeklyItemId] = useState<string | null>(
    null,
  );
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const storedPlans = loadWeeklyPlans();

    // eslint-disable-next-line react-hooks/set-state-in-effect -- Restore browser-only localStorage after hydration.
    setWeeklyPlans(storedPlans);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 60_000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const currentPlan = weeklyPlans.find((plan) => {
    return plan.weekOf === selectedWeek;
  });

  const currentItems = currentPlan?.items ?? [];

  const githubItems = currentItems.filter((item) => {
    return Boolean(getItemGitHubUrl(item));
  });

  const standaloneItems = currentItems.filter((item) => {
    return !getItemGitHubUrl(item);
  });

  const isStandaloneFilterActive =
    showStandaloneOnly && standaloneItems.length > 0;

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

  const dueReminders = weeklyPlans
    .flatMap((plan) => {
      return plan.items
        .filter((item) => {
          if (!item.reminderAt || item.completed) {
            return false;
          }

          const reminderTime = new Date(item.reminderAt).getTime();

          return !Number.isNaN(reminderTime) && reminderTime <= currentTime;
        })
        .map((item) => {
          return {
            item,
            planId: plan.id,
            weekOf: plan.weekOf,
          };
        });
    })
    .sort((a, b) => {
      return (a.item.reminderAt ?? "").localeCompare(b.item.reminderAt ?? "");
    });

  useEffect(() => {
    onDueReminderCountChange(dueReminders.length);
  }, [dueReminders.length, onDueReminderCountChange]);

  useEffect(() => {
    if (!targetWeeklyItemId) {
      return;
    }

    const animationFrame = window.requestAnimationFrame(() => {
      const weeklyItem = document.getElementById(
        `weekly-item-${targetWeeklyItemId}`,
      );

      weeklyItem?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      weeklyItem?.focus({ preventScroll: true });
      setTargetWeeklyItemId(null);
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [selectedWeek, targetWeeklyItemId]);

  function persistWeeklyPlans(plans: WeeklyPlan[]) {
    saveWeeklyPlans(plans);
    setWeeklyPlans(plans);
  }

  function updatePlanItem(
    planId: string,
    itemId: string,
    updateItem: (item: WeeklyPlanItem) => WeeklyPlanItem,
  ) {
    const updatedPlans = weeklyPlans.map((plan) => {
      if (plan.id !== planId) {
        return plan;
      }

      return {
        ...plan,
        items: plan.items.map((item) => {
          return item.id === itemId ? updateItem(item) : item;
        }),
      };
    });

    persistWeeklyPlans(updatedPlans);
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
    const reminderAt = newItemReminderAt
      ? new Date(newItemReminderAt).toISOString()
      : undefined;

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
          reminderAt,
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
            reminderAt,
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
    setNewItemReminderAt("");

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

  function handleReminderSubmit(
    event: FormEvent<HTMLFormElement>,
    itemId: string,
  ) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const reminderAt = formData.get("reminderAt");

    if (typeof reminderAt !== "string" || !reminderAt) {
      return;
    }

    const reminderDate = new Date(reminderAt);

    if (Number.isNaN(reminderDate.getTime())) {
      return;
    }

    const updatedItems = currentItems.map((item) => {
      if (item.id !== itemId) {
        return item;
      }

      return {
        ...item,
        reminderAt: reminderDate.toISOString(),
      };
    });

    replaceSelectedWeekItems(updatedItems);
    setEditingReminderItemId(null);
    setStatusMessage("Reminder saved.");
  }

  function handleRemoveReminder(itemId: string) {
    const updatedItems = currentItems.map((item) => {
      if (item.id !== itemId) {
        return item;
      }

      return removeReminderFromItem(item);
    });

    replaceSelectedWeekItems(updatedItems);
    setEditingReminderItemId(null);
    setStatusMessage("Reminder removed.");
  }

  function handleTaskEditSubmit(
    event: FormEvent<HTMLFormElement>,
    itemId: string,
  ) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const title = formData.get("title");

    if (typeof title !== "string" || !title.trim()) {
      return;
    }

    const updatedItems = currentItems.map((item) => {
      if (item.id !== itemId) {
        return item;
      }

      return {
        ...item,
        title: title.trim(),
      };
    });

    replaceSelectedWeekItems(updatedItems);
    setEditingTaskItemId(null);
    setStatusMessage("Task updated.");
  }

  function handleOpenReminder(reminder: DueReminder) {
    const githubUrl = getItemGitHubUrl(reminder.item);

    if (githubUrl) {
      onOpenJournal(githubUrl);
      return;
    }

    onSelectedWeekChange(reminder.weekOf);
    setShowStandaloneOnly(true);
    setTargetWeeklyItemId(reminder.item.id);
  }

  function handleSnoozeReminder(reminder: DueReminder) {
    const snoozedUntil = new Date(currentTime);

    snoozedUntil.setDate(snoozedUntil.getDate() + 1);

    updatePlanItem(reminder.planId, reminder.item.id, (item) => {
      return {
        ...item,
        reminderAt: snoozedUntil.toISOString(),
      };
    });

    setStatusMessage(
      `Reminder snoozed until ${formatReminderDate(snoozedUntil.toISOString())}.`,
    );
  }

  function handleCompleteReminder(reminder: DueReminder) {
    updatePlanItem(reminder.planId, reminder.item.id, (item) => {
      return {
        ...item,
        completed: true,
      };
    });

    setStatusMessage("Item marked as completed.");
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
      const itemWithoutReminder = removeReminderFromItem(item);

      if (detectedGithubUrl) {
        return {
          ...itemWithoutReminder,
          id: crypto.randomUUID(),
          type: "github" as const,
          githubUrl: detectedGithubUrl,
          completed: false,
          createdAt: new Date().toISOString(),
        };
      }

      return {
        ...itemWithoutReminder,
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
    onSelectedWeekChange(nextWeek);
    setShowStandaloneOnly(false);
    setStartingJournalItemId(null);
    setJournalFormErrorItemId(null);

    setStatusMessage(
      copiedItems.length === 1
        ? "Carried 1 unfinished item into the next week."
        : `Carried ${copiedItems.length} unfinished items into the next week.`,
    );
  }

  function renderWeeklyItem(item: WeeklyPlanItem, isStandalone = false) {
    const itemGithubUrl = getItemGitHubUrl(item);

    const journalExists = itemGithubUrl
      ? journalEntries.some((entry) => {
          return (
            getJournalKey(entry.githubUrl) === getJournalKey(itemGithubUrl)
          );
        })
      : false;

    const isStartingJournal = startingJournalItemId === item.id;

    const itemClassName = [
      "weekly-item",
      isStandalone ? "weekly-item-standalone" : "",
      item.completed ? "weekly-item-completed" : "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <li
        className={itemClassName}
        id={`weekly-item-${item.id}`}
        key={item.id}
        tabIndex={-1}
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

            <span
              className={
                isStandalone
                  ? "weekly-item-type weekly-item-type-standalone"
                  : "weekly-item-type"
              }
            >
              {itemGithubUrl ? getGitHubItemLabel(itemGithubUrl) : "Task"}
            </span>
          </div>

          {itemGithubUrl && (
            <div className="weekly-item-url-row">
              <a
                className="weekly-item-url"
                href={itemGithubUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {itemGithubUrl}
              </a>

              <CopyLinkButton value={itemGithubUrl} />
            </div>
          )}

          {item.reminderAt && (
            <p className="weekly-item-reminder">
              <span aria-hidden="true">●</span> Reminder:{" "}
              {formatReminderDate(item.reminderAt)}
            </p>
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

                  setStartingJournalItemId(isStartingJournal ? null : item.id);
                }}
              >
                Start journal
              </button>
            )}

            <button
              className="text-button"
              type="button"
              aria-expanded={editingReminderItemId === item.id}
              onClick={() => {
                setEditingReminderItemId(
                  editingReminderItemId === item.id ? null : item.id,
                );
              }}
            >
              {item.reminderAt ? "Change reminder" : "Set reminder"}
            </button>
            {isStandalone && (
              <button
                className="text-button"
                type="button"
                aria-expanded={editingTaskItemId === item.id}
                onClick={() => {
                  setEditingTaskItemId(
                    editingTaskItemId === item.id ? null : item.id,
                  );
                }}
              >
                Edit task
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
          {isStandalone && editingTaskItemId === item.id && (
            <form
              className="weekly-task-edit-form"
              onSubmit={(event) => {
                handleTaskEditSubmit(event, item.id);
              }}
            >
              <label htmlFor={`weekly-task-title-${item.id}`}>Task</label>

              <input
                className="form-control"
                id={`weekly-task-title-${item.id}`}
                name="title"
                type="text"
                defaultValue={item.title}
                required
              />

              <div className="weekly-task-edit-actions">
                <button
                  className="secondary-button compact-button"
                  type="submit"
                >
                  Save changes
                </button>

                <button
                  className="text-button"
                  type="button"
                  onClick={() => {
                    setEditingTaskItemId(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
          {editingReminderItemId === item.id && (
            <form
              className="weekly-reminder-form"
              onSubmit={(event) => {
                handleReminderSubmit(event, item.id);
              }}
            >
              <label htmlFor={`weekly-reminder-${item.id}`}>Remind me on</label>

              <input
                className="form-control"
                id={`weekly-reminder-${item.id}`}
                name="reminderAt"
                type="datetime-local"
                defaultValue={getReminderInputValue(item.reminderAt)}
                required
              />

              <div className="weekly-reminder-form-actions">
                <button
                  className="secondary-button compact-button"
                  type="submit"
                >
                  Save reminder
                </button>

                {item.reminderAt && (
                  <button
                    className="danger-text-button"
                    type="button"
                    onClick={() => {
                      handleRemoveReminder(item.id);
                    }}
                  >
                    Remove reminder
                  </button>
                )}

                <button
                  className="text-button"
                  type="button"
                  onClick={() => {
                    setEditingReminderItemId(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {itemGithubUrl && !journalExists && isStartingJournal && (
            <form
              className="weekly-journal-form"
              onSubmit={(event) => {
                handleStartJournalSubmit(event, item.id, itemGithubUrl);
              }}
            >
              <div className="form-field">
                <label htmlFor={`weekly-journal-title-${item.id}`}>Title</label>

                <input
                  className="form-control"
                  id={`weekly-journal-title-${item.id}`}
                  type="text"
                  name="title"
                  placeholder="Add a short title"
                />
              </div>

              <div className="form-field">
                <label htmlFor={`weekly-journal-body-${item.id}`}>Notes</label>

                <textarea
                  className="form-control"
                  id={`weekly-journal-body-${item.id}`}
                  name="body"
                  rows={5}
                  placeholder="Record the current context, decisions, or research."
                />
              </div>

              <div className="form-field">
                <label htmlFor={`weekly-journal-next-step-${item.id}`}>
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
                  Add a title, note, or next step before saving the journal.
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
                onSelectedWeekChange(event.currentTarget.value);
                setShowStandaloneOnly(false);
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

          <div className="form-field">
            <label htmlFor="weekly-item-reminder">
              Remind me on (optional)
            </label>
            <input
              className="form-control"
              id="weekly-item-reminder"
              type="datetime-local"
              value={newItemReminderAt}
              onChange={(event) => {
                setNewItemReminderAt(event.currentTarget.value);
              }}
            />
            <p className="field-help">
              This reminder will apply to everything added from this form.
            </p>
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
        {dueReminders.length > 0 && (
          <section
            className="due-reminders"
            aria-labelledby="due-reminders-title"
          >
            <div className="due-reminders-heading">
              <span className="due-reminders-dot" aria-hidden="true" />
              <h2 id="due-reminders-title">Due reminders</h2>
              <span className="due-reminders-count">{dueReminders.length}</span>
            </div>

            <ul className="due-reminder-list">
              {dueReminders.map((reminder) => {
                const githubUrl = getItemGitHubUrl(reminder.item);

                return (
                  <li
                    className="due-reminder-item"
                    key={`${reminder.planId}-${reminder.item.id}`}
                  >
                    <div className="due-reminder-content">
                      <strong>{reminder.item.title}</strong>
                      <span>
                        Scheduled for{" "}
                        {formatReminderDate(reminder.item.reminderAt ?? "")}
                      </span>
                    </div>

                    <div className="due-reminder-actions">
                      <button
                        className="secondary-button compact-button"
                        type="button"
                        onClick={() => {
                          handleOpenReminder(reminder);
                        }}
                      >
                        {githubUrl ? "Open journal" : "View task"}
                      </button>

                      <button
                        className="secondary-button compact-button"
                        type="button"
                        onClick={() => {
                          handleSnoozeReminder(reminder);
                        }}
                      >
                        Snooze 1 day
                      </button>

                      <button
                        className="primary-button compact-button"
                        type="button"
                        onClick={() => {
                          handleCompleteReminder(reminder);
                        }}
                      >
                        Mark done
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <div className="weekly-plan-heading">
          <div>
            <p className="panel-kicker">This week</p>
            <h2>{formatWeekRange(selectedWeek)}</h2>
            <p className="weekly-plan-summary">
              {githubItems.length} GitHub{" "}
              {githubItems.length === 1 ? "item" : "items"}
              <span aria-hidden="true"> · </span>
              {standaloneItems.length} standalone{" "}
              {standaloneItems.length === 1 ? "task" : "tasks"}
            </p>
          </div>

          <div className="weekly-plan-actions">
            {standaloneItems.length > 0 && (
              <button
                className={`secondary-button standalone-filter-button ${
                  isStandaloneFilterActive
                    ? "standalone-filter-button-active"
                    : ""
                }`}
                type="button"
                aria-pressed={isStandaloneFilterActive}
                onClick={() => {
                  setShowStandaloneOnly((currentValue) => !currentValue);
                }}
              >
                {isStandaloneFilterActive
                  ? "Show all tasks"
                  : `Standalone tasks (${standaloneItems.length})`}
              </button>
            )}

            <button
              className="secondary-button"
              type="button"
              disabled={currentItems.length === 0}
              onClick={handleCarryForward}
            >
              Add unfinished tasks
            </button>

            {previousPlans.length > 0 && (
              <label className="previous-weeks-field">
                Saved weeks
                <select
                  className="form-control"
                  value={selectedWeek}
                  onChange={(event) => {
                    onSelectedWeekChange(event.currentTarget.value);
                    setShowStandaloneOnly(false);
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
          <div className="weekly-item-groups">
            {!isStandaloneFilterActive && githubItems.length > 0 && (
              <ul className="weekly-item-list">
                {githubItems.map((item) => {
                  return renderWeeklyItem(item);
                })}
              </ul>
            )}

            {standaloneItems.length > 0 && (
              <section
                className="standalone-task-section"
                aria-labelledby="standalone-task-heading"
              >
                <h3
                  className="standalone-task-heading"
                  id="standalone-task-heading"
                >
                  Standalone tasks
                </h3>

                <ul className="weekly-item-list standalone-task-list">
                  {standaloneItems.map((item) => {
                    return renderWeeklyItem(item, true);
                  })}
                </ul>
              </section>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

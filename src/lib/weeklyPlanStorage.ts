export type WeeklyPlanItem = {
  id: string;
  type: "github" | "standalone";
  title: string;
  githubUrl?: string;
  completed: boolean;
  createdAt: string;
};

export type WeeklyPlan = {
  id: string;
  weekOf: string;
  focus?: string;
  createdAt: string;
  items: WeeklyPlanItem[];
};

const WEEKLY_PLANS_STORAGE_KEY = "maintainersJournalWeeklyPlans";

function isWeeklyPlanItem(value: unknown): value is WeeklyPlanItem {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const item = value as Partial<WeeklyPlanItem>;

  return (
    typeof item.id === "string" &&
    (item.type === "github" || item.type === "standalone") &&
    typeof item.title === "string" &&
    (item.githubUrl === undefined || typeof item.githubUrl === "string") &&
    typeof item.completed === "boolean" &&
    typeof item.createdAt === "string"
  );
}

export function isWeeklyPlan(value: unknown): value is WeeklyPlan {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const plan = value as Partial<WeeklyPlan>;

  return (
    typeof plan.id === "string" &&
    typeof plan.weekOf === "string" &&
    (plan.focus === undefined || typeof plan.focus === "string") &&
    typeof plan.createdAt === "string" &&
    Array.isArray(plan.items) &&
    plan.items.every(isWeeklyPlanItem)
  );
}

export function loadWeeklyPlans(): WeeklyPlan[] {
  const storedPlans = localStorage.getItem(WEEKLY_PLANS_STORAGE_KEY);

  if (storedPlans === null) {
    return [];
  }

  try {
    const parsedPlans: unknown = JSON.parse(storedPlans);

    if (!Array.isArray(parsedPlans)) {
      return [];
    }

    return parsedPlans.filter(isWeeklyPlan);
  } catch {
    return [];
  }
}

export function saveWeeklyPlans(plans: WeeklyPlan[]) {
  localStorage.setItem(WEEKLY_PLANS_STORAGE_KEY, JSON.stringify(plans));
}

export function getCurrentWeekStart(date = new Date()) {
  const weekStart = new Date(date);
  const dayOfWeek = weekStart.getDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  weekStart.setDate(weekStart.getDate() - daysSinceMonday);
  weekStart.setHours(0, 0, 0, 0);

  const year = weekStart.getFullYear();
  const month = String(weekStart.getMonth() + 1).padStart(2, "0");
  const day = String(weekStart.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

import { prisma } from "@/lib/prisma";
import { getActiveConfig, getConfigVersion } from "@/lib/config";
import type { CalendarPayload, TatProfilePayload } from "@/lib/validation/config";
import type { Department, RequestType } from "@/lib/domain/enums";

/**
 * TAT (turnaround time) engine.
 *
 * Two elapsed-time figures are always computable with no configuration:
 * raw wall-clock elapsed time for the total application age, the current
 * stage, and the current cycle. Business-hours elapsed time, and any
 * compliant/warning/breached classification, additionally require an
 * ACTIVE TAT_PROFILE (and, if referenced, an ACTIVE CALENDAR) — without
 * one, callers must render "TAT not configured" rather than guessing at a
 * default profile or inferring compliance. This function never falls back
 * to an invented threshold.
 *
 * The working-hours calculation below is a day-granular approximation
 * (weekend + holiday days excluded, a flat daily working window applied to
 * partial start/end days). Pause/resume semantics during queries, exact
 * business-calendar edge cases, and the definition of "approval duration"
 * start/end are explicitly TBC in the requirements register — this
 * implementation is a provisional, clearly labeled placeholder for those
 * rules, not a claim that banking-approved TAT policy has been encoded.
 */

export type TatStatus = "NOT_CONFIGURED" | "OK" | "WARNING" | "BREACHED";

export type TatEvaluation = {
  status: TatStatus;
  rawElapsedHours: number;
  businessElapsedHours: number | null;
  warningThresholdHours: number | null;
  escalationThresholdHours: number | null;
  configVersionId: string | null;
  calendarVersionId: string | null;
  message: string;
};

async function findTatProfile(
  requestType: RequestType,
  department: Department
): Promise<{ payload: TatProfilePayload; configVersionId: string } | null> {
  const active = await prisma.configVersion.findMany({
    where: { configType: "TAT_PROFILE", status: "ACTIVE" },
  });
  let best: { payload: TatProfilePayload; configVersionId: string; specific: boolean } | null = null;
  for (const row of active) {
    try {
      const payload = JSON.parse(row.payloadJson) as TatProfilePayload;
      if (payload.stage !== department) continue;
      if (payload.requestType === requestType) {
        best = { payload, configVersionId: row.id, specific: true };
        break;
      }
      if (payload.requestType === "ALL" && !best) {
        best = { payload, configVersionId: row.id, specific: false };
      }
    } catch {
      continue;
    }
  }
  return best ? { payload: best.payload, configVersionId: best.configVersionId } : null;
}

async function findCalendar(calendarConfigVersionId?: string): Promise<CalendarPayload | null> {
  if (calendarConfigVersionId) {
    const version = await getConfigVersion(calendarConfigVersionId);
    if (version) {
      try {
        return JSON.parse(version.payloadJson) as CalendarPayload;
      } catch {
        return null;
      }
    }
  }
  const active = await getActiveConfig("CALENDAR");
  if (!active) return null;
  try {
    return JSON.parse(active.payloadJson) as CalendarPayload;
  } catch {
    return null;
  }
}

function rawHoursBetween(start: Date, end: Date): number {
  return Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60));
}

function isNonWorkingDay(date: Date, calendar: CalendarPayload): boolean {
  const iso = date.toISOString().slice(0, 10);
  if (calendar.weekend.includes(date.getUTCDay())) return true;
  if (calendar.holidays.includes(iso)) return true;
  return false;
}

/** Day-granular business-hours elapsed time between two instants (UTC-based approximation). */
function businessHoursElapsed(
  start: Date,
  end: Date,
  calendar: CalendarPayload,
  workingHourStart: string,
  workingHourEnd: string
): number {
  const [startH, startM] = workingHourStart.split(":").map(Number);
  const [endH, endM] = workingHourEnd.split(":").map(Number);
  const dailyWindowHours = endH + endM / 60 - (startH + startM / 60);
  if (dailyWindowHours <= 0) return 0;

  let total = 0;
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const endDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));

  while (cursor.getTime() <= endDay.getTime()) {
    if (!isNonWorkingDay(cursor, calendar)) {
      const dayWindowStart = new Date(cursor);
      dayWindowStart.setUTCHours(startH, startM, 0, 0);
      const dayWindowEnd = new Date(cursor);
      dayWindowEnd.setUTCHours(endH, endM, 0, 0);

      const overlapStart = start > dayWindowStart ? start : dayWindowStart;
      const overlapEnd = end < dayWindowEnd ? end : dayWindowEnd;
      if (overlapEnd > overlapStart) {
        total += (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60);
      }
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return total;
}

export async function evaluateTat(
  requestType: RequestType,
  department: Department,
  start: Date,
  end: Date = new Date()
): Promise<TatEvaluation> {
  const rawElapsedHours = rawHoursBetween(start, end);
  const profile = await findTatProfile(requestType, department);

  if (!profile) {
    return {
      status: "NOT_CONFIGURED",
      rawElapsedHours,
      businessElapsedHours: null,
      warningThresholdHours: null,
      escalationThresholdHours: null,
      configVersionId: null,
      calendarVersionId: null,
      message: "TAT not configured for this stage and request type.",
    };
  }

  const calendar = await findCalendar(profile.payload.calendarConfigVersionId);
  if (!calendar) {
    return {
      status: "NOT_CONFIGURED",
      rawElapsedHours,
      businessElapsedHours: null,
      warningThresholdHours: profile.payload.warningThresholdHours,
      escalationThresholdHours: profile.payload.escalationThresholdHours,
      configVersionId: profile.configVersionId,
      calendarVersionId: null,
      message: "A TAT profile is configured but no active business calendar is available.",
    };
  }

  const businessElapsedHours = businessHoursElapsed(
    start,
    end,
    calendar,
    profile.payload.workingHourStart,
    profile.payload.workingHourEnd
  );

  let status: TatStatus = "OK";
  if (businessElapsedHours >= profile.payload.escalationThresholdHours) status = "BREACHED";
  else if (businessElapsedHours >= profile.payload.warningThresholdHours) status = "WARNING";

  return {
    status,
    rawElapsedHours,
    businessElapsedHours,
    warningThresholdHours: profile.payload.warningThresholdHours,
    escalationThresholdHours: profile.payload.escalationThresholdHours,
    configVersionId: profile.configVersionId,
    calendarVersionId: profile.payload.calendarConfigVersionId ?? null,
    message:
      status === "BREACHED"
        ? "Business-hours elapsed time has passed the configured escalation threshold."
        : status === "WARNING"
          ? "Business-hours elapsed time has passed the configured warning threshold."
          : "Within configured TAT thresholds.",
  };
}

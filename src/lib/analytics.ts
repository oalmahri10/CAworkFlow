import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { DEPARTMENTS, type Department, type RequestType } from "@/lib/domain/enums";
import { evaluateTat } from "@/lib/tat";

/**
 * All figures here are computed directly from persisted records under the
 * caller-supplied visibility `where` clause — nothing is cached, seeded, or
 * hard-coded. Populations follow these explicit definitions so the
 * dashboard's totals always reconcile with each other:
 *
 *   Circulated = every application ever created (creation IS submission —
 *                see src/lib/applications.ts — so this equals "ever submitted").
 *   Active     = Circulated minus Completed.
 *   Completed  = currentDepartment === "COMPLETED".
 *   Returned   = substage === "QUERY_RETURNED_TO_RM" right now (a live
 *                count of applications currently sitting with the RM due to
 *                an open query, not a lifetime count of every return that
 *                ever happened).
 *
 * Any panel with fewer than a handful of underlying records renders
 * "Not available" for rate/percentage figures rather than a statistically
 * meaningless number — see `MIN_SAMPLE_FOR_RATE`.
 */

const MIN_SAMPLE_FOR_RATE = 5;

type Where = Prisma.ApplicationWhereInput;

export async function getLifecycleCounts(where: Where) {
  const [circulated, completed, returned, ca, at, activeCa, activeAt] = await Promise.all([
    prisma.application.count({ where }),
    prisma.application.count({ where: { ...where, currentDepartment: "COMPLETED" } }),
    prisma.application.count({ where: { ...where, substage: "QUERY_RETURNED_TO_RM" } }),
    prisma.application.count({ where: { ...where, requestType: "CA" } }),
    prisma.application.count({ where: { ...where, requestType: "AT" } }),
    prisma.application.count({
      where: { ...where, requestType: "CA", currentDepartment: { not: "COMPLETED" } },
    }),
    prisma.application.count({
      where: { ...where, requestType: "AT", currentDepartment: { not: "COMPLETED" } },
    }),
  ]);
  return {
    circulated,
    active: circulated - completed,
    completed,
    returned,
    ca, // all circulated CA, active or not — labelled explicitly in the UI
    at,
    activeCa,
    activeAt,
  };
}

export async function getDepartmentDistribution(where: Where) {
  const now = Date.now();
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now - 14 * 24 * 60 * 60 * 1000);

  const results: {
    department: Department;
    inQueue: number;
    avgAgeHours: number | null;
    trend: "Increasing" | "Decreasing" | "Stable" | "Not available";
  }[] = [];

  for (const department of DEPARTMENTS) {
    const openIntervals = await prisma.stageInterval.findMany({
      where: { department, endedAt: null, application: where },
      select: { startedAt: true },
    });
    const inQueue = openIntervals.length;
    const avgAgeHours =
      inQueue === 0
        ? null
        : openIntervals.reduce((sum, i) => sum + (now - i.startedAt.getTime()) / 3.6e6, 0) / inQueue;

    const [recentArrivals, priorArrivals] = await Promise.all([
      prisma.stageInterval.count({
        where: { department, startedAt: { gte: sevenDaysAgo }, application: where },
      }),
      prisma.stageInterval.count({
        where: { department, startedAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo }, application: where },
      }),
    ]);

    let trend: "Increasing" | "Decreasing" | "Stable" | "Not available" = "Not available";
    if (recentArrivals + priorArrivals >= MIN_SAMPLE_FOR_RATE) {
      if (recentArrivals > priorArrivals * 1.15) trend = "Increasing";
      else if (recentArrivals < priorArrivals * 0.85) trend = "Decreasing";
      else trend = "Stable";
    }

    results.push({ department, inQueue, avgAgeHours, trend });
  }
  return results;
}

export async function getBottleneckRadar(where: Where) {
  const distribution = await getDepartmentDistribution(where);
  const maxQueue = Math.max(1, ...distribution.map((d) => d.inQueue));

  const radar = await Promise.all(
    distribution.map(async (d) => {
      const repeatQueryCycles = await prisma.reviewCycle.count({
        where: { cycleNumber: { gt: 1 }, application: { ...where, currentDepartment: d.department } },
      });
      const longInactive = await prisma.stageInterval.count({
        where: {
          department: d.department,
          endedAt: null,
          startedAt: { lt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
          application: where,
        },
      });
      return {
        department: d.department,
        queueGrowth: d.inQueue / maxQueue,
        repeatQueryCycles,
        longInactivePeriods: longInactive,
      };
    })
  );
  return radar;
}

export async function getAgingBands(where: Where) {
  const apps = await prisma.application.findMany({
    where: { ...where, currentDepartment: { not: "COMPLETED" } },
    select: { createdAt: true },
  });
  const bands = { "0-2 days": 0, "3-5 days": 0, "6-10 days": 0, "11+ days": 0 };
  const now = Date.now();
  for (const a of apps) {
    const days = (now - a.createdAt.getTime()) / 86_400_000;
    if (days <= 2) bands["0-2 days"]++;
    else if (days <= 5) bands["3-5 days"]++;
    else if (days <= 10) bands["6-10 days"]++;
    else bands["11+ days"]++;
  }
  return bands;
}

export async function getTurnaroundComparison(where: Where) {
  const completed = await prisma.application.findMany({
    where: { ...where, currentDepartment: "COMPLETED", submissionAt: { not: null }, completedAt: { not: null } },
    select: { requestType: true, submissionAt: true, completedAt: true },
  });

  function summarize(requestType: "CA" | "AT") {
    const subset = completed.filter((c) => c.requestType === requestType);
    if (subset.length < MIN_SAMPLE_FOR_RATE) {
      return { sampleSize: subset.length, avgHours: null as number | null, note: "Not available — fewer than 5 completed cases." };
    }
    const totalHours = subset.reduce(
      (sum, c) => sum + (c.completedAt!.getTime() - c.submissionAt!.getTime()) / 3.6e6,
      0
    );
    return { sampleSize: subset.length, avgHours: totalHours / subset.length, note: null };
  }

  return { ca: summarize("CA"), at: summarize("AT") };
}

export async function getRepeatQueryApplications(where: Where) {
  return prisma.application.findMany({
    where: { ...where, reviewCycles: { some: { cycleNumber: { gt: 1 } } } },
    select: {
      id: true,
      croReference: true,
      customerName: true,
      requestType: true,
      currentDepartment: true,
      substage: true,
      _count: { select: { reviewCycles: true, queries: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });
}

export async function getRecentMovements(where: Where, limit = 20) {
  return prisma.workflowEvent.findMany({
    where: { application: where },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      application: { select: { croReference: true, customerName: true, requestType: true } },
      actor: { select: { name: true } },
    },
  });
}

/**
 * TAT Health: the share of currently active applications within configured
 * TAT thresholds, computed per-application against whatever TAT_PROFILE
 * applies to its request type and current stage. If no application in the
 * visible set has an applicable configured profile, this is explicitly
 * "not available" rather than a fabricated percentage.
 */
export async function getTatHealthSummary(where: Where) {
  const apps = await prisma.application.findMany({
    where: { ...where, currentDepartment: { not: "COMPLETED" } },
    include: { stageIntervals: { where: { endedAt: null }, take: 1 } },
  });

  let ok = 0;
  let warning = 0;
  let breached = 0;
  let notConfigured = 0;

  for (const app of apps) {
    const openInterval = app.stageIntervals[0];
    if (!openInterval) {
      notConfigured++;
      continue;
    }
    const evaluation = await evaluateTat(
      app.requestType as RequestType,
      app.currentDepartment as Department,
      openInterval.startedAt
    );
    if (evaluation.status === "NOT_CONFIGURED") notConfigured++;
    else if (evaluation.status === "OK") ok++;
    else if (evaluation.status === "WARNING") warning++;
    else breached++;
  }

  const configuredTotal = ok + warning + breached;
  if (configuredTotal === 0) {
    return { available: false, ok, warning, breached, notConfigured, percentOk: null as number | null };
  }
  return {
    available: true,
    ok,
    warning,
    breached,
    notConfigured,
    percentOk: Math.round((ok / configuredTotal) * 100),
  };
}

const MAX_MARKERS_PER_STATION = 14;

/**
 * Per-station marker data for the Credit Journey / Application Flow 3D
 * scenes: a capped list of individual applications currently resting at
 * each department (each becomes one CA cube or AT marker, clickable through
 * to its Credit Passport), plus an overflow count so large queues render as
 * a single "+N more" cluster instead of thousands of meshes.
 */
export async function getStationMarkers(where: Where) {
  const now = Date.now();
  const result: Record<
    Department,
    {
      markers: {
        id: string;
        croReference: string;
        requestType: string;
        substage: string;
        stageAgeHours: number;
        hasOpenQuery: boolean;
      }[];
      overflowCount: number;
    }
  > = {} as never;

  for (const department of DEPARTMENTS) {
    const total = await prisma.application.count({ where: { ...where, currentDepartment: department } });
    const apps = await prisma.application.findMany({
      where: { ...where, currentDepartment: department },
      orderBy: { updatedAt: "desc" },
      take: MAX_MARKERS_PER_STATION,
      include: { stageIntervals: { where: { endedAt: null }, take: 1 } },
    });
    result[department] = {
      markers: apps.map((a) => ({
        id: a.id,
        croReference: a.croReference,
        requestType: a.requestType,
        substage: a.substage,
        stageAgeHours: a.stageIntervals[0] ? (now - a.stageIntervals[0].startedAt.getTime()) / 3.6e6 : 0,
        hasOpenQuery: a.actionOwnerDept !== null && a.actionOwnerDept !== a.currentDepartment,
      })),
      overflowCount: Math.max(0, total - apps.length),
    };
  }
  return result;
}

export async function getSubtypePatterns(where: Where) {
  const groups = await prisma.application.groupBy({
    by: ["subtype", "requestType"],
    where,
    _count: { _all: true },
  });
  return groups.map((g) => ({ subtype: g.subtype, requestType: g.requestType, count: g._count._all }));
}

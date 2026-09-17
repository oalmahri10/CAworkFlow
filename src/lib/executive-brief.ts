import type { Prisma } from "@prisma/client";
import {
  getBottleneckRadar,
  getDepartmentDistribution,
  getLifecycleCounts,
  getRepeatQueryApplications,
  getTatHealthSummary,
} from "@/lib/analytics";
import { DEPARTMENT_LABELS } from "@/lib/domain/enums";

export type BriefLine = { text: string; sourceRefs: string[] };

/**
 * A deterministic, source-linked narrative built entirely from the same
 * aggregate queries the dashboard panels use — no free-text generation, no
 * invented figures. Every line states the record(s) it derives from so it
 * can be labelled "rule-based" rather than "AI-generated" and traced back
 * to source data, per the requirements for intelligence panels.
 */
export async function generateExecutiveBrief(where: Prisma.ApplicationWhereInput): Promise<BriefLine[]> {
  const [lifecycle, distribution, radar, repeatQuery, tatHealth] = await Promise.all([
    getLifecycleCounts(where),
    getDepartmentDistribution(where),
    getBottleneckRadar(where),
    getRepeatQueryApplications(where),
    getTatHealthSummary(where),
  ]);

  const lines: BriefLine[] = [];

  const busiest = [...distribution].sort((a, b) => b.inQueue - a.inQueue)[0];
  if (busiest && busiest.inQueue > 0) {
    const trendText =
      busiest.trend === "Not available" ? "" : ` and the queue is currently ${busiest.trend.toLowerCase()}`;
    lines.push({
      text: `${DEPARTMENT_LABELS[busiest.department]} holds the largest queue at ${busiest.inQueue} application(s)${trendText}.`,
      sourceRefs: ["department-distribution"],
    });
  }

  const highestRepeat = [...radar].sort((a, b) => b.repeatQueryCycles - a.repeatQueryCycles)[0];
  if (highestRepeat && highestRepeat.repeatQueryCycles > 0) {
    lines.push({
      text: `Repeat query cycles are concentrated in ${DEPARTMENT_LABELS[highestRepeat.department]} (${highestRepeat.repeatQueryCycles} case(s) with more than one review cycle).`,
      sourceRefs: ["bottleneck-radar"],
    });
  }

  if (repeatQuery.length > 0) {
    lines.push({
      text: `${repeatQuery.length} application(s) organization-wide have been returned for query more than once.`,
      sourceRefs: repeatQuery.slice(0, 5).map((a) => a.croReference),
    });
  }

  if (tatHealth.available) {
    lines.push({
      text: `${tatHealth.percentOk}% of active applications are within configured TAT thresholds (${tatHealth.warning} warning, ${tatHealth.breached} breached).`,
      sourceRefs: ["tat-health"],
    });
  } else {
    lines.push({
      text: "TAT health is not available — no active application currently has a configured TAT profile for its stage.",
      sourceRefs: ["tat-health"],
    });
  }

  lines.push({
    text: `${lifecycle.active} application(s) are currently active out of ${lifecycle.circulated} ever circulated; ${lifecycle.completed} are completed and ${lifecycle.returned} are currently with the RM on an open query.`,
    sourceRefs: ["lifecycle-counts"],
  });

  return lines;
}

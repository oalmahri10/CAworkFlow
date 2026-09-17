import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { DEPARTMENTS, DEPARTMENT_LABELS, type Department } from "@/lib/domain/enums";

export type NextBestAction = {
  department: Department;
  title: string;
  detail: string;
  applicationIds: string[];
};

/**
 * Rule-based "next best actions" derived strictly from workflow state and
 * outstanding tasks (repeat-query cases, long-inactive queue items) — never
 * a model prediction. Each action links back to the specific applications
 * that produced it.
 */
export async function generateNextBestActions(
  where: Prisma.ApplicationWhereInput
): Promise<NextBestAction[]> {
  const actions: NextBestAction[] = [];

  for (const department of DEPARTMENTS) {
    const repeatCases = await prisma.application.findMany({
      where: {
        ...where,
        currentDepartment: department,
        reviewCycles: { some: { cycleNumber: { gt: 1 } } },
      },
      select: { id: true, croReference: true },
      take: 10,
    });
    if (repeatCases.length > 0) {
      actions.push({
        department,
        title: `For ${DEPARTMENT_LABELS[department]}`,
        detail: `Review ${repeatCases.length} application(s) with multiple query cycles.`,
        applicationIds: repeatCases.map((c) => c.id),
      });
    }

    const staleCases = await prisma.application.findMany({
      where: {
        ...where,
        currentDepartment: department,
        stageIntervals: {
          some: {
            department,
            endedAt: null,
            startedAt: { lt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
          },
        },
      },
      select: { id: true, croReference: true },
      take: 10,
    });
    if (staleCases.length > 0) {
      actions.push({
        department,
        title: `For ${DEPARTMENT_LABELS[department]}`,
        detail: `Check ${staleCases.length} item(s) that have been pending for more than 5 days.`,
        applicationIds: staleCases.map((c) => c.id),
      });
    }
  }

  return actions;
}

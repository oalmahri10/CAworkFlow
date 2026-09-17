import { NextRequest, NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth";
import { applicationVisibilityWhere } from "@/lib/authz";
import {
  getBottleneckRadar,
  getDepartmentDistribution,
  getRepeatQueryApplications,
  getStationMarkers,
} from "@/lib/analytics";
import { generateExecutiveBrief } from "@/lib/executive-brief";
import { generateNextBestActions } from "@/lib/next-best-actions";
import { handleApiError } from "@/lib/api-error";
import { serializeBigInts } from "@/lib/money";
import type { Prisma } from "@prisma/client";

/** Credit Intelligence data: Bottleneck Radar, Application Flow, forecast attention list, brief, actions. */
export async function GET(req: NextRequest) {
  try {
    const user = await requireCapability("VIEW_ANALYTICS");
    const { searchParams } = new URL(req.url);
    const requestType = searchParams.get("requestType"); // CA | AT | null (both)
    const department = searchParams.get("department");

    const filters: Prisma.ApplicationWhereInput[] = [applicationVisibilityWhere(user)];
    if (requestType) filters.push({ requestType });
    if (department) filters.push({ currentDepartment: department });
    const where: Prisma.ApplicationWhereInput = { AND: filters };

    const [distribution, radar, repeatQuery, brief, nextActions, stationMarkers] = await Promise.all([
      getDepartmentDistribution(where),
      getBottleneckRadar(where),
      getRepeatQueryApplications(where),
      generateExecutiveBrief(where),
      generateNextBestActions(where),
      getStationMarkers(where),
    ]);

    // "AI Forecast" is intentionally NOT fabricated: without a validated
    // rule set or model, we return an explicit unavailable state rather
    // than confidence percentages, per the "Intelligence without
    // fabricated AI" requirement.
    const forecastAvailable = false;

    return NextResponse.json(
      serializeBigInts({
        distribution,
        radar,
        repeatQuery,
        brief,
        nextActions,
        stationMarkers,
        forecast: forecastAvailable
          ? []
          : { available: false, reason: "No validated rule set or model is configured for TAT-risk forecasting." },
      })
    );
  } catch (error) {
    return handleApiError(error);
  }
}

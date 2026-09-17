import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth";
import { applicationVisibilityWhere } from "@/lib/authz";
import {
  getBottleneckRadar,
  getDepartmentDistribution,
  getLifecycleCounts,
  getRecentMovements,
  getStationMarkers,
  getTatHealthSummary,
} from "@/lib/analytics";
import { generateExecutiveBrief } from "@/lib/executive-brief";
import { handleApiError } from "@/lib/api-error";
import { serializeBigInts } from "@/lib/money";

/** Executive Control Tower data: KPI cards, Credit Journey stations, bottom cards. */
export async function GET() {
  try {
    const user = await requireCapability("VIEW_ANALYTICS");
    const where = applicationVisibilityWhere(user);

    const [lifecycle, distribution, radar, tatHealth, brief, recentMovements, stationMarkers] = await Promise.all([
      getLifecycleCounts(where),
      getDepartmentDistribution(where),
      getBottleneckRadar(where),
      getTatHealthSummary(where),
      generateExecutiveBrief(where),
      getRecentMovements(where, 10),
      getStationMarkers(where),
    ]);

    return NextResponse.json(
      serializeBigInts({ lifecycle, distribution, radar, tatHealth, brief, recentMovements, stationMarkers })
    );
  } catch (error) {
    return handleApiError(error);
  }
}

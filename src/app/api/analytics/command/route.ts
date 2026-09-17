import { NextRequest, NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth";
import { applicationVisibilityWhere } from "@/lib/authz";
import { parseCommand } from "@/lib/command-bar";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api-error";
import { serializeBigInts } from "@/lib/money";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

const bodySchema = z.object({ query: z.string().min(1) });

export async function POST(req: NextRequest) {
  try {
    const user = await requireCapability("VIEW_ANALYTICS");
    const { query } = bodySchema.parse(await req.json());
    const result = parseCommand(query);

    if (!result.matched) {
      return NextResponse.json({ matched: false, message: result.message });
    }

    const where: Prisma.ApplicationWhereInput = { AND: [applicationVisibilityWhere(user), result.where] };
    const items = await prisma.application.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: {
        id: true,
        croReference: true,
        customerName: true,
        requestType: true,
        currentDepartment: true,
        substage: true,
        approvalRoutingExposureMinor: true,
        currency: true,
      },
    });

    return NextResponse.json(serializeBigInts({ matched: true, description: result.description, items }));
  } catch (error) {
    return handleApiError(error);
  }
}

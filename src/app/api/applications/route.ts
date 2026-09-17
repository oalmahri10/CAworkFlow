import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/auth";
import { applicationVisibilityWhere } from "@/lib/authz";
import { handleApiError } from "@/lib/api-error";
import { serializeBigInts } from "@/lib/money";
import { createApplication } from "@/lib/applications";
import { createApplicationSchema } from "@/lib/validation/application";
import type { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const user = await requireCapability("VIEW_APPLICATIONS");
    const { searchParams } = new URL(req.url);

    const search = searchParams.get("search")?.trim();
    const requestType = searchParams.get("requestType");
    const department = searchParams.get("department");
    const subtype = searchParams.get("subtype");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10) || 20));
    const sortBy = searchParams.get("sortBy") ?? "updatedAt";
    const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";

    const where: Prisma.ApplicationWhereInput = { AND: [applicationVisibilityWhere(user)] };
    const andArr = where.AND as Prisma.ApplicationWhereInput[];
    if (search) {
      andArr.push({ OR: [{ croReference: { contains: search } }, { customerName: { contains: search } }] });
    }
    if (requestType) andArr.push({ requestType });
    if (department) andArr.push({ currentDepartment: department });
    if (subtype) andArr.push({ subtype });

    const allowedSort = new Set(["updatedAt", "createdAt", "customerName", "croReference", "approvalRoutingExposureMinor"]);
    const orderBy = { [allowedSort.has(sortBy) ? sortBy : "updatedAt"]: sortDir };

    const [total, items] = await Promise.all([
      prisma.application.count({ where }),
      prisma.application.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          initiatingRm: { select: { id: true, name: true } },
          actionOwner: { select: { id: true, name: true } },
        },
      }),
    ]);

    return NextResponse.json(
      serializeBigInts({ items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) })
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireCapability("CREATE_APPLICATION");
    const body = createApplicationSchema.parse(await req.json());
    const app = await createApplication(user, body);
    return NextResponse.json(serializeBigInts(app), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

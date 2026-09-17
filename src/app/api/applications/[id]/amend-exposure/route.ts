import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { serializeBigInts } from "@/lib/money";
import { amendExposure } from "@/lib/applications";
import { amendExposureSchema } from "@/lib/validation/application";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireUser();
    const { id } = await params;
    const body = amendExposureSchema.parse(await req.json());
    const updated = await amendExposure(actor, id, body);
    return NextResponse.json(serializeBigInts(updated));
  } catch (error) {
    return handleApiError(error);
  }
}

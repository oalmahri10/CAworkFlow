import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth";
import { getApplicationDetail } from "@/lib/application-detail";
import { handleApiError } from "@/lib/api-error";
import { serializeBigInts } from "@/lib/money";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireCapability("VIEW_APPLICATIONS");
    const { id } = await params;
    const detail = await getApplicationDetail(user, id);
    return NextResponse.json(serializeBigInts(detail));
  } catch (error) {
    return handleApiError(error);
  }
}

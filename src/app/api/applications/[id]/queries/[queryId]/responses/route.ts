import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { serializeBigInts } from "@/lib/money";
import { respondToQuery } from "@/lib/queries";
import { queryResponseSchema } from "@/lib/validation/application";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; queryId: string }> }
) {
  try {
    const actor = await requireUser();
    const { queryId } = await params;
    const body = queryResponseSchema.parse(await req.json());
    const response = await respondToQuery(actor, queryId, body.message);
    return NextResponse.json(serializeBigInts(response), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

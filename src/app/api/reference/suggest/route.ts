import { NextRequest, NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth";
import { suggestNextReference } from "@/lib/applications";
import { handleApiError } from "@/lib/api-error";
import { isRequestType } from "@/lib/domain/enums";

export async function GET(req: NextRequest) {
  try {
    await requireCapability("CREATE_APPLICATION");
    const type = new URL(req.url).searchParams.get("type") ?? "CA";
    if (!isRequestType(type)) {
      return NextResponse.json({ error: "type must be CA or AT" }, { status: 400 });
    }
    const reference = await suggestNextReference(type);
    return NextResponse.json({ reference });
  } catch (error) {
    return handleApiError(error);
  }
}

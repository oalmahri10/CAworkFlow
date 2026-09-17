import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth";
import { activateConfigVersion } from "@/lib/config";
import { handleApiError } from "@/lib/api-error";

export async function POST(_req: Request, { params }: { params: Promise<{ type: string; versionId: string }> }) {
  try {
    const actor = await requireCapability("MANAGE_CONFIG");
    const { versionId } = await params;
    const activated = await activateConfigVersion(versionId, actor.id);
    return NextResponse.json(activated);
  } catch (error) {
    return handleApiError(error);
  }
}

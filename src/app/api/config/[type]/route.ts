import { NextRequest, NextResponse } from "next/server";
import { requireCapability, requireUser } from "@/lib/auth";
import { createDraftConfig, getActiveConfig, listConfigVersions } from "@/lib/config";
import { handleApiError } from "@/lib/api-error";
import { CONFIG_TYPES, type ConfigType } from "@/lib/domain/enums";
import { WorkflowError } from "@/lib/workflow";

function assertConfigType(type: string): ConfigType {
  if (!(CONFIG_TYPES as readonly string[]).includes(type)) {
    throw new WorkflowError(`Unknown configuration type "${type}". Known: ${CONFIG_TYPES.join(", ")}.`, 400);
  }
  return type as ConfigType;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  try {
    // Reading configuration (including whether something is TBC) only
    // requires being signed in — operational screens need to render TBC
    // banners without every user holding MANAGE_CONFIG.
    await requireUser();
    const { type } = await params;
    const configType = assertConfigType(type);
    const [active, versions] = await Promise.all([
      getActiveConfig(configType),
      listConfigVersions(configType),
    ]);
    return NextResponse.json({ active, versions });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  try {
    const actor = await requireCapability("MANAGE_CONFIG");
    const { type } = await params;
    const configType = assertConfigType(type);
    const body = await req.json();
    const created = await createDraftConfig(configType, body.payload, actor.id, body.notes);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

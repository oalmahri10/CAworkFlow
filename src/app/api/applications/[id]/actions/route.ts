import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { serializeBigInts } from "@/lib/money";
import { WORKFLOW_HANDLERS, WorkflowError } from "@/lib/workflow";
import { workflowActionSchema } from "@/lib/validation/application";
import { WORKFLOW_ACTIONS, type WorkflowAction } from "@/lib/domain/enums";

/**
 * Single dispatcher for every workflow transition (steps 3–17 of the shared
 * CA/AT workflow). The action name selects the handler in
 * src/lib/workflow.ts, which enforces the legal-transition and capability
 * checks; this route only handles parsing, dispatch and error translation.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireUser();
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action") as WorkflowAction | null;

    if (!action || !(WORKFLOW_ACTIONS as readonly string[]).includes(action)) {
      throw new WorkflowError(
        `Unknown or missing action. Supported: ${WORKFLOW_ACTIONS.join(", ")}.`,
        400
      );
    }

    const body = workflowActionSchema.parse(await req.json());
    const handler = WORKFLOW_HANDLERS[action];
    const result = await handler({ applicationId: id, actor, ...body });

    return NextResponse.json(serializeBigInts(result));
  } catch (error) {
    return handleApiError(error);
  }
}

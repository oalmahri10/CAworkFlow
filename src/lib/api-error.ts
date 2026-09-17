import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError } from "@/lib/auth";
import { WorkflowError } from "@/lib/workflow";
import { ConfigValidationError } from "@/lib/config";

/** Uniform error → JSON response mapping for every API route. */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof WorkflowError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ConfigValidationError) {
    return NextResponse.json({ error: error.message, issues: error.issues }, { status: 422 });
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Validation failed.", issues: error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) },
      { status: 422 }
    );
  }
  console.error(error);
  return NextResponse.json({ error: "An unexpected server error occurred." }, { status: 500 });
}

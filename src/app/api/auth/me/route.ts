import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ user: null });
    return NextResponse.json({ user });
  } catch (error) {
    return handleApiError(error);
  }
}

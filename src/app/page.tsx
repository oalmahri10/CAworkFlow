import { redirect } from "next/navigation";
import { getCurrentUser, isSetupComplete } from "@/lib/auth";

export default async function RootPage() {
  const complete = await isSetupComplete();
  if (!complete) redirect("/setup");

  const user = await getCurrentUser();
  redirect(user ? "/dashboard" : "/login");
}

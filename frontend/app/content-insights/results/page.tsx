import { redirect } from "next/navigation";

export default function LegacyResultsPage() {
  redirect("/?view=analysis");
}

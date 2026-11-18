import { redirect } from "next/navigation";

// The old Workflows page only showed example runs, not real ones. Real automations live on the Automations page.
export default function WorkflowsPage() {
  redirect("/automations");
}

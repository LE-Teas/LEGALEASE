import { redirect } from "next/navigation";

export default function CitizenResourcesRedirect() {
  redirect("/citizen/dashboard");
}

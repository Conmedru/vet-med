import { redirect } from "next/navigation";

/** The article list lives in the queue; /admin/articles is a natural URL to type, so send it there */
export default function AdminArticlesIndex() {
  redirect("/admin/queue");
}

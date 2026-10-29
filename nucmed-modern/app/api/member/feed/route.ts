import { NextRequest, NextResponse } from "next/server";
import { MemberAuthError, requireMember } from "@/lib/auth/member-session";
import { getArticlesByRubrics, getPublishedArticles } from "@/lib/articles";

/**
 * GET /api/member/feed — personal feed of a registered vet.
 *
 * Articles of the member's rubrics (any match); farm-only articles appear only when
 * the farm-animals rubric is chosen. Without rubrics — the general feed, so a fresh
 * account does not look broken.
 */
export async function GET(request: NextRequest) {
  try {
    const member = await requireMember();
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit")) || 20, 50);
    const rubrics = member.rubrics ?? [];

    const articles = rubrics.length > 0 ? await getArticlesByRubrics(rubrics, limit) : await getPublishedArticles(limit);

    return NextResponse.json({ articles, rubrics, personalized: rubrics.length > 0 });
  } catch (e) {
    if (e instanceof MemberAuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}

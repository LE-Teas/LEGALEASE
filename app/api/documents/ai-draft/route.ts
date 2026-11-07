import { NextResponse } from "next/server";
import { getAuthState } from "@/lib/auth/profile";
import { chatCompletion } from "@/lib/ai/gemini";
import { getErrorMessage } from "@/lib/errors";

export async function POST(request: Request) {
  try {
    const { user } = await getAuthState();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { documentType, title, facts, parties, jurisdiction, specialClauses } = body;

    if (!documentType || !title) {
      return NextResponse.json({ error: "Document type and title are required" }, { status: 400 });
    }

    const systemPrompt = `You are an expert Pakistani legal document draftsman with deep expertise in Pakistani statutory law (Contract Act 1872, Code of Civil Procedure 1908, Specific Relief Act 1877, relevant provincial tenancy and family laws).
Draft formal, professional, court-ready or legally enforceable legal documents in clean, formal legal English. Include customary preamble, recital of facts, operative terms/clauses, jurisdiction, dispute resolution, and execution blocks.`;

    const userPrompt = `Draft the following Pakistani legal document:
- Document Title: ${title}
- Document Type: ${documentType}
- Parties Involved: ${parties || "Party A and Party B"}
- Underlying Facts & Context: ${facts || "Standard legal agreement / notice based on stated title"}
- Jurisdiction & Applicable Law: ${jurisdiction || "Pakistan"}
${specialClauses ? `- Specific Clauses/Requirements: ${specialClauses}` : ""}

Return only the formal drafted text without markdown code blocks, ready for printing, signing, or notarization.`;

    const res = await chatCompletion([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ], {
      temperature: 0.2,
      maxTokens: 3000,
    });

    return NextResponse.json({
      success: true,
      draft: res.content,
      model: res.model,
    });
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}


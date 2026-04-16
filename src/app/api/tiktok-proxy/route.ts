import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    // 1. Read the form data that NextAuth sends us
    const formData = await req.formData();
    const bodyParams = new URLSearchParams();

    // 2. Transfer all parameters, but rename client_id to client_key
    formData.forEach((value, key) => {
      if (key === "client_id") {
        bodyParams.append("client_key", value.toString());
      } else if (key !== "code_verifier") {
        // Drop code_verifier since TikTok doesn't support PKCE
        bodyParams.append(key, value.toString());
      }
    });

    // Just in case it's missing somehow
    if (!bodyParams.has("client_key")) {
       bodyParams.append("client_key", process.env.AUTH_TIKTOK_ID!);
    }

    // 3. Forward the fixed request to actual TikTok API
    const response = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cache-Control": "no-cache",
      },
      body: bodyParams.toString(),
    });

    // 4. Return the exact response back to NextAuth
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("TikTok Proxy Error:", error);
    return NextResponse.json(
      { error: "invalid_request", error_description: "Proxy failed" },
      { status: 500 }
    );
  }
}

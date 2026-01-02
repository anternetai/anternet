import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, ...data } = body;

    // Log submission (visible in Vercel logs)
    console.log("VSL Submission:", {
      type,
      name: data.name,
      email: data.email,
      businessName: data.businessName,
      serviceType: data.serviceType,
      serviceArea: data.serviceArea,
      currentLeads: data.currentLeads,
      phone: data.phone,
      timestamp: data.timestamp,
    });

    // TODO: Add Supabase when service role key is configured
    // TODO: Add Resend email notification

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

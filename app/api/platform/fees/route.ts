import { NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const consultationFee = parseFloat(searchParams.get("fee") || "0");

    const supabase = await createClient();
    if (supabase) {
      const { data, error } = await supabase.rpc("calculate_appointment_fees", {
        p_consultation_fee: consultationFee,
      });

      if (!error && data && data.length > 0) {
        return NextResponse.json({ success: true, fees: data[0] });
      }
    }

    // Fallback calculation in case RPC is not yet applied
    const platformFee = Math.round(consultationFee * 0.1);
    const taxAmount = 0;
    const totalAmount = consultationFee + platformFee + taxAmount;
    const lawyerReceivable = consultationFee;

    return NextResponse.json({
      success: true,
      fees: {
        consultation_fee: consultationFee,
        platform_fee: platformFee,
        platform_fee_type: "percentage",
        tax_amount: taxAmount,
        total_amount: totalAmount,
        lawyer_receivable: lawyerReceivable,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

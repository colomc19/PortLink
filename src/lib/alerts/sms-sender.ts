/**
 * Twilio SMS sender.
 *
 * Uses the Twilio REST API directly (no npm package required) to send SMS.
 * Falls back to console logging when Twilio env vars are not configured,
 * allowing local development without a Twilio account.
 */

export interface SMSResult {
  success: boolean;
  sid?: string;
  error?: string;
}

/**
 * Sends an SMS message via Twilio.
 *
 * Returns { success: true, sid } on success.
 * Returns { success: false, error } on failure.
 *
 * When TWILIO_ACCOUNT_SID is not configured, logs the message to the console
 * instead of sending. This allows testing the alert engine without Twilio.
 */
export async function sendSMS(to: string, message: string): Promise<SMSResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  // Fallback: log instead of sending when not configured
  if (!accountSid || !authToken || !fromNumber) {
    console.log(
      `[SMS UNSENT — Twilio not configured] To: ${to} | Message: ${message}`
    );
    return { success: true, sid: "dev-noop" };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  const body = new URLSearchParams({
    To: to,
    From: fromNumber,
    Body: message,
  });

  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString(
    "base64"
  );

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[sendSMS] Network error:", message);
    return { success: false, error: `Network error: ${message}` };
  }

  let json: Record<string, unknown>;
  try {
    json = (await response.json()) as Record<string, unknown>;
  } catch {
    return {
      success: false,
      error: `Twilio returned non-JSON response (status ${response.status})`,
    };
  }

  if (!response.ok) {
    const errorMessage =
      typeof json.message === "string"
        ? json.message
        : `HTTP ${response.status}`;
    console.error("[sendSMS] Twilio error:", errorMessage, json);
    return { success: false, error: errorMessage };
  }

  const sid = typeof json.sid === "string" ? json.sid : undefined;
  return { success: true, sid };
}

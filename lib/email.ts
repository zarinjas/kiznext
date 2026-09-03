import { Resend } from "resend"
import { prisma } from "@/lib/db"

/**
 * Outbound email via Resend. Used only for account verification — the app
 * has no other mail (no SMTP). Everything renders from the public origin so
 * links and images work both on the live host (mykiz.my) and in local dev.
 *
 * The API key + sender can be set two ways, DB wins over env so admins can
 * configure Resend from App Settings without touching the server:
 *   1. AppSetting keys `resend_api_key` / `resend_from` (see urus-tetapan)
 *   2. `RESEND_API_KEY` / `RESEND_FROM` in `.env`
 */

export const BRAND_NAME = "KIZ Super App"

const RESEND_API_KEY_SETTING = "resend_api_key"
const RESEND_FROM_SETTING = "resend_from"

/** The public origin used to build absolute URLs for links and images. */
export function appOrigin(): string {
  return (process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/+$/, "")
}

async function apiKey(): Promise<string | null> {
  const stored = await prisma.appSetting.findUnique({ where: { key: RESEND_API_KEY_SETTING } })
  if (stored?.value?.trim()) return stored.value.trim()
  return process.env.RESEND_API_KEY ?? null
}

async function sender(): Promise<string> {
  const stored = await prisma.appSetting.findUnique({ where: { key: RESEND_FROM_SETTING } })
  return stored?.value?.trim() || process.env.RESEND_FROM || "KIZ Super App <no-reply@mykiz.my>"
}

async function resendClient(): Promise<Resend | null> {
  const key = await apiKey()
  if (!key) return null
  return new Resend(key)
}

export interface VerificationMail {
  to: string
  name: string
  matricId: string
  verifyUrl: string
}

/**
 * Sends the email-verification message. In local dev without an API key the
 * verification link is written to the server console instead of sent, so the
 * flow stays testable offline.
 */
export async function sendVerificationEmail({ to, name, matricId, verifyUrl }: VerificationMail): Promise<void> {
  const client = await resendClient()

  if (!client) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[email:dev] verification link for ${to}: ${verifyUrl}`)
      return
    }
    throw new Error("Email is not configured. Set your Resend API key in App Settings.")
  }

  const html = await buildVerificationHtml({ name, matricId, verifyUrl })

  const { error } = await client.emails.send({
    from: await sender(),
    to,
    subject: "Confirm your email — KIZ Super App",
    html,
  })

  if (error) throw new Error(error.message)
}

/**
 * Inline-styled, single-column HTML that renders cleanly in every major mail
 * client. The header logo is the admin-uploaded app logo served by
 * `/api/app-icon` (falls back to the default icon when none is set).
 */
async function buildVerificationHtml({
  name,
  matricId,
  verifyUrl,
}: {
  name: string
  matricId: string
  verifyUrl: string
}): Promise<string> {
  const origin = appOrigin()
  const logoUrl = `${origin}/api/app-icon`
  const brand = BRAND_NAME

  const escapeHtml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background-color:#f4f5f7;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background-color:#ffffff;border:1px solid #e6e8ec;border-radius:16px;overflow:hidden;">

            <!-- Header -->
            <tr>
              <td style="padding:28px 32px 8px 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="vertical-align:middle;">
                      <img src="${logoUrl}" alt="${escapeHtml(brand)}" width="44" height="44" style="display:block;border-radius:10px;object-fit:contain;" />
                    </td>
                    <td align="right" style="vertical-align:middle;">
                      <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:#8a8f98;letter-spacing:0.02em;">KOLEJ IBU ZAIN</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:24px 32px 8px 32px;">
                <h1 style="margin:0 0 8px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:21px;line-height:1.3;color:#111827;letter-spacing:-0.01em;">Confirm your email</h1>
                <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#4b5563;">
                  Hi ${escapeHtml(name)},<br />
                  You're one step away from your KIZ account. Confirm that
                  <strong style="color:#111827;">${escapeHtml(matricId)}</strong> belongs to you to finish
                  setting up your account.
                </p>
              </td>
            </tr>

            <!-- CTA -->
            <tr>
              <td align="center" style="padding:24px 32px;">
                <a href="${escapeHtml(verifyUrl)}" style="display:inline-block;background-color:#0891b2;color:#ffffff;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;padding:12px 28px;border-radius:10px;">
                  Verify my email
                </a>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:8px 32px 12px 32px;">
                <p style="margin:0 0 6px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:#8a8f98;">
                  This link expires in 24 hours. If you didn't create this account, you can safely ignore this email.
                </p>
                <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;color:#8a8f98;">
                  Need help? Contact the KIZ management office.
                </p>
              </td>
            </tr>

            <tr>
              <td style="border-top:1px solid #eef0f3;padding:14px 32px;">
                <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;color:#b0b5bd;">
                  © ${new Date().getFullYear()} ${escapeHtml(brand)} · Kolej Ibu Zain, Universiti Kebangsaan Malaysia
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

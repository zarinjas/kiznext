/**
 * Web entry point for the rich-text helpers. The canonical implementation is
 * shared with the mobile app (`packages/shared/src/rich-text.ts`) so the
 * sanitiser can never drift between platforms.
 */
export { sanitizeRichText, richTextToPlainText } from "@/packages/shared/src/rich-text"

// Public WhatsApp Business number, digits only (no '+'). Override per-env with VITE_WHATSAPP_NUMBER.
export const WHATSAPP_NUMBER =
	import.meta.env["VITE_WHATSAPP_NUMBER"] ?? "84906432245"

export const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}`

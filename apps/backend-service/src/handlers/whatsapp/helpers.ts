export type SendTextParams = {
    env: Env;
    waId: string;
    text: string;
  };
  
  export async function sendWhatsAppText({ env, waId, text }: SendTextParams): Promise<Response> {
    const url = `https://graph.facebook.com/v19.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
    const body = {
      messaging_product: "whatsapp",
      to: waId,
      type: "text",
      text: { body: text },
    };
    return fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }
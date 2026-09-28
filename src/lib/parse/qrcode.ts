export type QrcodeData = {
  payload: string | null;
};

const STRIP_PREFIX = /^\s*(?:generate|make|create|give me|i need)?\s*(?:a\s+)?qr\s*code\s*(?:for|of|to|:)?\s*/i;
const BARE_QR = /^\s*qr\s*:?\s*/i;

export function parseQrcode(text: string): QrcodeData {
  let payload = text.trim();
  if (STRIP_PREFIX.test(payload)) payload = payload.replace(STRIP_PREFIX, "");
  else if (BARE_QR.test(payload)) payload = payload.replace(BARE_QR, "");
  payload = payload.replace(/^["']|["']$/g, "").trim();
  return { payload: payload || null };
}

export function completeQrcode(d: QrcodeData) {
  return d.payload ? 1 : 0;
}

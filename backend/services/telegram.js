/**
 * Propósito: único adaptador del backend hacia Telegram.
 * Responsabilidades: leer secretos solo desde entorno, enviar mensajes y dejar
 * un punto de extensión para resolver el grupo de cada negocio en el futuro.
 * Dependencias: Node fetch y variables TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID.
 */

const TELEGRAM_TIMEOUT_MS = 10_000

/** Resuelve el destino actual; businessId queda reservado para multi-negocio. */
function resolveTelegramDestination({ chatId, businessId } = {}) {
  void businessId
  return chatId || process.env.TELEGRAM_CHAT_ID || null
}

/**
 * Envía un mensaje a un grupo de Telegram.
 *
 * @param {string} chatId - ID del grupo de Telegram
 * @param {string} message - Mensaje que se enviará
 */
async function sendTelegramMessage(chatId, message) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN no está configurado en .env');
  }

  const destination = resolveTelegramDestination({ chatId })
  if (!destination) {
    throw new Error('No se proporcionó el chat_id de Telegram');
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TELEGRAM_TIMEOUT_MS)
  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: destination, text: message }),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}))

    if (!response.ok || !data.ok) {
      throw new Error(`Error de Telegram: ${data.description || 'Error desconocido'}`)
    }

    return data
  } finally {
    clearTimeout(timeoutId)
  }
}

module.exports = {
  sendTelegramMessage,
  resolveTelegramDestination,
};

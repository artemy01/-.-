const API_BASE = "api";

async function apiRequest(path, options = {}) {
  const response = await fetch(API_BASE + path, {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok && !data.message) {
    data.message = "Ошибка сервера. Запустите сайт командой: npm start";
  }

  return { ok: response.ok, data };
}

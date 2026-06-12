/** Admin panel API koruması — şifre, deploy sırasında env'e yazılır
 *  ve restoran sahibine Telegram'dan iletilir. */

export function isAdmin(request) {
  const key = request.headers.get("x-admin-key") || "";
  return Boolean(process.env.ADMIN_PANEL_KEY) && key === process.env.ADMIN_PANEL_KEY;
}

export function unauthorized() {
  return Response.json({ error: "Nicht autorisiert." }, { status: 401 });
}

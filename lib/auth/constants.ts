/** Nama cookie sesi. Modul ringan (tanpa node:crypto) agar aman diimpor
 *  dari Edge middleware maupun Node route handlers. */
export const SESSION_COOKIE = "aidm_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 hari

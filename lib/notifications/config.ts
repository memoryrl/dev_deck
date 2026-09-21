/** 새 알림을 확인하는 주기. 서버는 이 주기로만 조회되므로 1분이면 충분하다. */
export const NOTIFICATION_POLL_INTERVAL_MS = 60_000

/** 새 알림 토스트가 자동으로 사라지는 시간 */
export const NOTIFICATION_TOAST_MS = 8_000

/** 알림 목록 한 번에 가져오는 최대 개수 */
export const NOTIFICATION_LIST_LIMIT = 30

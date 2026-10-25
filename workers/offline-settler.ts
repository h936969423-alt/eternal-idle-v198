/** Retired: offline income is settled atomically by the login/game request.
 * Keep a harmless handler for an old deployed Cron Trigger until redeployed.
 */
export default {
 async scheduled(){ /* No database reads, writes, timers or combat replay. */ }
};

declare namespace Cloudflare {
  interface Env {
    GM_OWNER_EMAIL?: string;
    DB?: D1Database;
    BUCKET?: R2Bucket;
    PRIVATE_POLYMORPH?: R2Bucket;
    PRIVATE_POLYMORPH_OWNER?: string;
  }
}

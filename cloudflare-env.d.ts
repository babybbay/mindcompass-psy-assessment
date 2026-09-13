declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    APP_ORIGIN?: string;
    ADMIN_PASSWORD?: string;
    RESEARCH_CONTACT_EMAIL?: string;
  }
}

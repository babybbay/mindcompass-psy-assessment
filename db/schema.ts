import { integer, real, sqliteTable, text, primaryKey, uniqueIndex, index, foreignKey, check } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
export const responses = sqliteTable("responses", { id: integer("id").primaryKey({ autoIncrement: true }), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`), ageBand: text("age_band"), answers: text("answers").notNull(), extraversion: real("extraversion").notNull(), agreeableness: real("agreeableness").notNull(), conscientiousness: real("conscientiousness").notNull(), neuroticism: real("neuroticism").notNull(), openness: real("openness").notNull(), aiAttitude: real("ai_attitude").notNull() });

// V2 schema; runtime uses prepared D1 SQL for atomic compare-and-swap operations.
// CHECK constraints, composite keys and partial unique index are authoritative in 0001_study.sql.
export const participants = sqliteTable("mc_participants", {
 id:text("id").primaryKey(),tokenHash:text("token_hash").notNull().unique(),createdAt:integer("created_at").notNull(),expiresAt:integer("expires_at").notNull(),
});
export const consents=sqliteTable("mc_consents",{
 participantId:text("participant_id").primaryKey().references(()=>participants.id,{onDelete:"cascade"}),version:text("version").notNull(),acceptedAt:integer("accepted_at").notNull(),adultConfirmed:integer("adult_confirmed").notNull(),
},t=>[check("adult_confirmed",sql`${t.adultConfirmed}=1`)]);
export const scaleVersions=sqliteTable("mc_scale_versions",{
 scaleId:text("scale_id").notNull(),version:text("version").notNull(),configJson:text("config_json").notNull(),configHash:text("config_hash").notNull(),
},t=>[primaryKey({columns:[t.scaleId,t.version]}),check("config_json_valid",sql`json_valid(${t.configJson})`)]);
export const attempts=sqliteTable("mc_attempts",{
 id:text("id").primaryKey(),participantId:text("participant_id").notNull().references(()=>participants.id,{onDelete:"cascade"}),scaleId:text("scale_id").notNull(),scaleVersion:text("scale_version").notNull(),consentVersion:text("consent_version").notNull(),requestId:text("request_id").notNull(),status:text("status").notNull().default("draft"),answersJson:text("answers_json").notNull().default("{}"),scoresJson:text("scores_json"),cursor:integer("cursor").notNull().default(0),revision:integer("revision").notNull().default(0),startedAt:integer("started_at").notNull(),updatedAt:integer("updated_at").notNull(),completedAt:integer("completed_at"),
},t=>[
 uniqueIndex("mc_request_unique").on(t.participantId,t.scaleId,t.requestId),
 uniqueIndex("mc_one_draft").on(t.participantId,t.scaleId).where(sql`${t.status}='draft'`),
 index("mc_analysis").on(t.scaleId,t.scaleVersion,t.status,t.startedAt),
 foreignKey({columns:[t.scaleId,t.scaleVersion],foreignColumns:[scaleVersions.scaleId,scaleVersions.version]}),
 check("status_valid",sql`${t.status} IN ('draft','completed','withdrawn','expired')`),
 check("cursor_valid",sql`${t.cursor}>=0`),
 check("answers_valid",sql`json_valid(${t.answersJson})`),
 check("scores_valid",sql`${t.scoresJson} IS NULL OR json_valid(${t.scoresJson})`),
 check("completion_valid",sql`(${t.status}='completed' AND ${t.scoresJson} IS NOT NULL AND ${t.completedAt} IS NOT NULL) OR (${t.status}<>'completed' AND ${t.scoresJson} IS NULL)`),
]);
export const feedback=sqliteTable("mc_feedback",{
 id:text("id").primaryKey(),participantId:text("participant_id").notNull().references(()=>participants.id,{onDelete:"cascade"}),category:text("category").notNull(),createdAt:integer("created_at").notNull(),
},t=>[check("feedback_category",sql`${t.category} IN ('wording','navigation','saving','results','privacy')`)]);
export const maintenance=sqliteTable("mc_maintenance",{
 key:text("key").primaryKey(),ranAt:integer("ran_at").notNull(),expiredDrafts:integer("expired_drafts").notNull().default(0),deletedAttempts:integer("deleted_attempts").notNull().default(0),deletedFeedback:integer("deleted_feedback").notNull().default(0),deletedParticipants:integer("deleted_participants").notNull().default(0),
},t=>[check("maintenance_key",sql`${t.key} IN ('scheduled','manual')`)]);

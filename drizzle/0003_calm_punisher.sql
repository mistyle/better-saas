CREATE TABLE "blog_post" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"locale" text DEFAULT 'zh' NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"content" text,
	"html_content" text,
	"cover_image" text,
	"author" text,
	"tags" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"published_at" timestamp,
	"author_id" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "blog_post_slug_locale_unique" UNIQUE("slug","locale")
);
--> statement-breakpoint
ALTER TABLE "blog_post" ADD CONSTRAINT "blog_post_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
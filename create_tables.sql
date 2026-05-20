-- Better SaaS PostgreSQL idempotent schema.
-- This file is generated from src/server/db/schema.ts and can be executed repeatedly.

CREATE SCHEMA IF NOT EXISTS public;

CREATE TABLE IF NOT EXISTS public."user" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "email_verified" boolean NOT NULL,
  "image" text,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL,
  "role" text,
  "banned" boolean,
  "ban_reason" text,
  "ban_expires" timestamp,
  "stripe_customer_id" text,
  "payment_provider" text,
  CONSTRAINT "user_email_unique" UNIQUE ("email")
);

CREATE TABLE IF NOT EXISTS public."verification" (
  "id" text PRIMARY KEY NOT NULL,
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp,
  "updated_at" timestamp
);

CREATE TABLE IF NOT EXISTS public."blog_category" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "description" text,
  "locale" text DEFAULT 'zh' NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL,
  CONSTRAINT "blog_category_slug_locale_unique" UNIQUE ("slug", "locale")
);

CREATE TABLE IF NOT EXISTS public."session" (
  "id" text PRIMARY KEY NOT NULL,
  "expires_at" timestamp NOT NULL,
  "token" text NOT NULL,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL,
  "ip_address" text,
  "user_agent" text,
  "user_id" text NOT NULL,
  "impersonated_by" text,
  CONSTRAINT "session_token_unique" UNIQUE ("token")
);

CREATE TABLE IF NOT EXISTS public."account" (
  "id" text PRIMARY KEY NOT NULL,
  "account_id" text NOT NULL,
  "provider_id" text NOT NULL,
  "user_id" text NOT NULL,
  "access_token" text,
  "refresh_token" text,
  "id_token" text,
  "access_token_expires_at" timestamp,
  "refresh_token_expires_at" timestamp,
  "scope" text,
  "password" text,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL
);

CREATE TABLE IF NOT EXISTS public."file" (
  "id" text PRIMARY KEY NOT NULL,
  "filename" text NOT NULL,
  "original_name" text NOT NULL,
  "mime_type" text NOT NULL,
  "size" integer NOT NULL,
  "width" integer,
  "height" integer,
  "r2_key" text NOT NULL,
  "thumbnail_key" text,
  "upload_user_id" text NOT NULL,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL
);

CREATE TABLE IF NOT EXISTS public."payment" (
  "id" text PRIMARY KEY NOT NULL,
  "price_id" text NOT NULL,
  "type" text NOT NULL,
  "interval" text,
  "provider" text DEFAULT 'stripe' NOT NULL,
  "user_id" text NOT NULL,
  "customer_id" text NOT NULL,
  "subscription_id" text,
  "status" text NOT NULL,
  "period_start" timestamp,
  "period_end" timestamp,
  "cancel_at_period_end" boolean,
  "trial_start" timestamp,
  "trial_end" timestamp,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL
);

CREATE TABLE IF NOT EXISTS public."payment_event" (
  "id" text PRIMARY KEY NOT NULL,
  "payment_id" text NOT NULL,
  "event_type" text NOT NULL,
  "provider_event_id" text,
  "event_data" text,
  "created_at" timestamp NOT NULL,
  CONSTRAINT "payment_event_provider_event_id_unique" UNIQUE ("provider_event_id")
);

CREATE TABLE IF NOT EXISTS public."user_credits" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "balance" integer DEFAULT 0 NOT NULL,
  "total_earned" integer DEFAULT 0 NOT NULL,
  "total_spent" integer DEFAULT 0 NOT NULL,
  "frozen_balance" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL,
  CONSTRAINT "user_credits_user_id_unique" UNIQUE ("user_id")
);

CREATE TABLE IF NOT EXISTS public."credit_transactions" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "type" text NOT NULL,
  "amount" integer NOT NULL,
  "balance_after" integer NOT NULL,
  "source" text NOT NULL,
  "description" text,
  "reference_id" text,
  "metadata" text,
  "created_at" timestamp NOT NULL,
  CONSTRAINT "credit_user_reference_unique" UNIQUE ("user_id", "reference_id")
);

CREATE TABLE IF NOT EXISTS public."blog_post" (
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
  "category_id" text,
  "status" text DEFAULT 'draft' NOT NULL,
  "published_at" timestamp,
  "author_id" text NOT NULL,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL,
  CONSTRAINT "blog_post_slug_locale_unique" UNIQUE ("slug", "locale")
);

CREATE TABLE IF NOT EXISTS public."api_key" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "hashed_key" text NOT NULL,
  "user_id" text NOT NULL,
  "expires_at" timestamp,
  "last_used_at" timestamp,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL,
  CONSTRAINT "api_key_hashed_key_unique" UNIQUE ("hashed_key")
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_email_unique" ON public."user" ("email");
CREATE UNIQUE INDEX IF NOT EXISTS "session_token_unique" ON public."session" ("token");
CREATE UNIQUE INDEX IF NOT EXISTS "payment_event_provider_event_id_unique" ON public."payment_event" ("provider_event_id");
CREATE UNIQUE INDEX IF NOT EXISTS "user_credits_user_id_unique" ON public."user_credits" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "credit_user_reference_unique" ON public."credit_transactions" ("user_id", "reference_id");
CREATE UNIQUE INDEX IF NOT EXISTS "blog_category_slug_locale_unique" ON public."blog_category" ("slug", "locale");
CREATE UNIQUE INDEX IF NOT EXISTS "blog_post_slug_locale_unique" ON public."blog_post" ("slug", "locale");
CREATE UNIQUE INDEX IF NOT EXISTS "api_key_hashed_key_unique" ON public."api_key" ("hashed_key");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'session_user_id_user_id_fk'
      AND conrelid = 'public."session"'::regclass
  ) THEN
    ALTER TABLE public."session"
      ADD CONSTRAINT "session_user_id_user_id_fk"
      FOREIGN KEY ("user_id") REFERENCES public."user" ("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'account_user_id_user_id_fk'
      AND conrelid = 'public."account"'::regclass
  ) THEN
    ALTER TABLE public."account"
      ADD CONSTRAINT "account_user_id_user_id_fk"
      FOREIGN KEY ("user_id") REFERENCES public."user" ("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'file_upload_user_id_user_id_fk'
      AND conrelid = 'public."file"'::regclass
  ) THEN
    ALTER TABLE public."file"
      ADD CONSTRAINT "file_upload_user_id_user_id_fk"
      FOREIGN KEY ("upload_user_id") REFERENCES public."user" ("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'payment_user_id_user_id_fk'
      AND conrelid = 'public."payment"'::regclass
  ) THEN
    ALTER TABLE public."payment"
      ADD CONSTRAINT "payment_user_id_user_id_fk"
      FOREIGN KEY ("user_id") REFERENCES public."user" ("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'payment_event_payment_id_payment_id_fk'
      AND conrelid = 'public."payment_event"'::regclass
  ) THEN
    ALTER TABLE public."payment_event"
      ADD CONSTRAINT "payment_event_payment_id_payment_id_fk"
      FOREIGN KEY ("payment_id") REFERENCES public."payment" ("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_credits_user_id_user_id_fk'
      AND conrelid = 'public."user_credits"'::regclass
  ) THEN
    ALTER TABLE public."user_credits"
      ADD CONSTRAINT "user_credits_user_id_user_id_fk"
      FOREIGN KEY ("user_id") REFERENCES public."user" ("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'credit_transactions_user_id_user_id_fk'
      AND conrelid = 'public."credit_transactions"'::regclass
  ) THEN
    ALTER TABLE public."credit_transactions"
      ADD CONSTRAINT "credit_transactions_user_id_user_id_fk"
      FOREIGN KEY ("user_id") REFERENCES public."user" ("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'blog_post_category_id_blog_category_id_fk'
      AND conrelid = 'public."blog_post"'::regclass
  ) THEN
    ALTER TABLE public."blog_post"
      ADD CONSTRAINT "blog_post_category_id_blog_category_id_fk"
      FOREIGN KEY ("category_id") REFERENCES public."blog_category" ("id")
      ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'blog_post_author_id_user_id_fk'
      AND conrelid = 'public."blog_post"'::regclass
  ) THEN
    ALTER TABLE public."blog_post"
      ADD CONSTRAINT "blog_post_author_id_user_id_fk"
      FOREIGN KEY ("author_id") REFERENCES public."user" ("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'api_key_user_id_user_id_fk'
      AND conrelid = 'public."api_key"'::regclass
  ) THEN
    ALTER TABLE public."api_key"
      ADD CONSTRAINT "api_key_user_id_user_id_fk"
      FOREIGN KEY ("user_id") REFERENCES public."user" ("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;

COMMENT ON TABLE public."user" IS '用户表';
COMMENT ON COLUMN public."user"."id" IS '用户ID';
COMMENT ON COLUMN public."user"."name" IS '用户名称';
COMMENT ON COLUMN public."user"."email" IS '邮箱';
COMMENT ON COLUMN public."user"."email_verified" IS '邮箱是否已验证';
COMMENT ON COLUMN public."user"."image" IS '头像图片地址';
COMMENT ON COLUMN public."user"."created_at" IS '创建时间';
COMMENT ON COLUMN public."user"."updated_at" IS '更新时间';
COMMENT ON COLUMN public."user"."role" IS '用户角色';
COMMENT ON COLUMN public."user"."banned" IS '是否封禁';
COMMENT ON COLUMN public."user"."ban_reason" IS '封禁原因';
COMMENT ON COLUMN public."user"."ban_expires" IS '封禁到期时间';
COMMENT ON COLUMN public."user"."stripe_customer_id" IS 'Stripe 客户ID';
COMMENT ON COLUMN public."user"."payment_provider" IS '当前支付服务商';

COMMENT ON TABLE public."session" IS '登录会话表';
COMMENT ON COLUMN public."session"."id" IS '会话ID';
COMMENT ON COLUMN public."session"."expires_at" IS '过期时间';
COMMENT ON COLUMN public."session"."token" IS '会话令牌';
COMMENT ON COLUMN public."session"."created_at" IS '创建时间';
COMMENT ON COLUMN public."session"."updated_at" IS '更新时间';
COMMENT ON COLUMN public."session"."ip_address" IS 'IP 地址';
COMMENT ON COLUMN public."session"."user_agent" IS '用户代理';
COMMENT ON COLUMN public."session"."user_id" IS '所属用户ID';
COMMENT ON COLUMN public."session"."impersonated_by" IS '代登录操作者ID';

COMMENT ON TABLE public."account" IS '第三方账号绑定表';
COMMENT ON COLUMN public."account"."id" IS '账号记录ID';
COMMENT ON COLUMN public."account"."account_id" IS '第三方平台账号ID';
COMMENT ON COLUMN public."account"."provider_id" IS '第三方登录提供方ID';
COMMENT ON COLUMN public."account"."user_id" IS '所属用户ID';
COMMENT ON COLUMN public."account"."access_token" IS '访问令牌';
COMMENT ON COLUMN public."account"."refresh_token" IS '刷新令牌';
COMMENT ON COLUMN public."account"."id_token" IS '身份令牌';
COMMENT ON COLUMN public."account"."access_token_expires_at" IS '访问令牌过期时间';
COMMENT ON COLUMN public."account"."refresh_token_expires_at" IS '刷新令牌过期时间';
COMMENT ON COLUMN public."account"."scope" IS '授权范围';
COMMENT ON COLUMN public."account"."password" IS '密码哈希';
COMMENT ON COLUMN public."account"."created_at" IS '创建时间';
COMMENT ON COLUMN public."account"."updated_at" IS '更新时间';

COMMENT ON TABLE public."verification" IS '验证令牌表';
COMMENT ON COLUMN public."verification"."id" IS '验证记录ID';
COMMENT ON COLUMN public."verification"."identifier" IS '验证标识';
COMMENT ON COLUMN public."verification"."value" IS '验证值';
COMMENT ON COLUMN public."verification"."expires_at" IS '过期时间';
COMMENT ON COLUMN public."verification"."created_at" IS '创建时间';
COMMENT ON COLUMN public."verification"."updated_at" IS '更新时间';

COMMENT ON TABLE public."file" IS '文件资源表';
COMMENT ON COLUMN public."file"."id" IS '文件ID';
COMMENT ON COLUMN public."file"."filename" IS '存储文件名';
COMMENT ON COLUMN public."file"."original_name" IS '原始文件名';
COMMENT ON COLUMN public."file"."mime_type" IS 'MIME 类型';
COMMENT ON COLUMN public."file"."size" IS '文件大小';
COMMENT ON COLUMN public."file"."width" IS '图片宽度';
COMMENT ON COLUMN public."file"."height" IS '图片高度';
COMMENT ON COLUMN public."file"."r2_key" IS 'R2 存储键';
COMMENT ON COLUMN public."file"."thumbnail_key" IS '缩略图存储键';
COMMENT ON COLUMN public."file"."upload_user_id" IS '上传用户ID';
COMMENT ON COLUMN public."file"."created_at" IS '创建时间';
COMMENT ON COLUMN public."file"."updated_at" IS '更新时间';

COMMENT ON TABLE public."payment" IS '支付记录表';
COMMENT ON COLUMN public."payment"."id" IS '支付记录ID';
COMMENT ON COLUMN public."payment"."price_id" IS '价格ID';
COMMENT ON COLUMN public."payment"."type" IS '支付类型';
COMMENT ON COLUMN public."payment"."interval" IS '订阅周期';
COMMENT ON COLUMN public."payment"."provider" IS '支付服务商';
COMMENT ON COLUMN public."payment"."user_id" IS '用户ID';
COMMENT ON COLUMN public."payment"."customer_id" IS '支付平台客户ID';
COMMENT ON COLUMN public."payment"."subscription_id" IS '订阅ID';
COMMENT ON COLUMN public."payment"."status" IS '支付或订阅状态';
COMMENT ON COLUMN public."payment"."period_start" IS '周期开始时间';
COMMENT ON COLUMN public."payment"."period_end" IS '周期结束时间';
COMMENT ON COLUMN public."payment"."cancel_at_period_end" IS '是否在周期结束时取消';
COMMENT ON COLUMN public."payment"."trial_start" IS '试用开始时间';
COMMENT ON COLUMN public."payment"."trial_end" IS '试用结束时间';
COMMENT ON COLUMN public."payment"."created_at" IS '创建时间';
COMMENT ON COLUMN public."payment"."updated_at" IS '更新时间';

COMMENT ON TABLE public."payment_event" IS '支付事件表';
COMMENT ON COLUMN public."payment_event"."id" IS '支付事件ID';
COMMENT ON COLUMN public."payment_event"."payment_id" IS '关联支付记录ID';
COMMENT ON COLUMN public."payment_event"."event_type" IS '事件类型';
COMMENT ON COLUMN public."payment_event"."provider_event_id" IS '支付服务商事件ID';
COMMENT ON COLUMN public."payment_event"."event_data" IS '事件原始数据（JSON 字符串）';
COMMENT ON COLUMN public."payment_event"."created_at" IS '创建时间';

COMMENT ON TABLE public."user_credits" IS '用户积分余额表';
COMMENT ON COLUMN public."user_credits"."id" IS '积分账户ID';
COMMENT ON COLUMN public."user_credits"."user_id" IS '用户ID';
COMMENT ON COLUMN public."user_credits"."balance" IS '当前可用余额';
COMMENT ON COLUMN public."user_credits"."total_earned" IS '累计获得积分';
COMMENT ON COLUMN public."user_credits"."total_spent" IS '累计消费积分';
COMMENT ON COLUMN public."user_credits"."frozen_balance" IS '冻结积分余额';
COMMENT ON COLUMN public."user_credits"."created_at" IS '创建时间';
COMMENT ON COLUMN public."user_credits"."updated_at" IS '更新时间';

COMMENT ON TABLE public."credit_transactions" IS '积分交易流水表';
COMMENT ON COLUMN public."credit_transactions"."id" IS '积分流水ID';
COMMENT ON COLUMN public."credit_transactions"."user_id" IS '用户ID';
COMMENT ON COLUMN public."credit_transactions"."type" IS '交易类型';
COMMENT ON COLUMN public."credit_transactions"."amount" IS '变动积分数量';
COMMENT ON COLUMN public."credit_transactions"."balance_after" IS '变动后余额';
COMMENT ON COLUMN public."credit_transactions"."source" IS '积分来源';
COMMENT ON COLUMN public."credit_transactions"."description" IS '描述';
COMMENT ON COLUMN public."credit_transactions"."reference_id" IS '关联业务ID';
COMMENT ON COLUMN public."credit_transactions"."metadata" IS '元数据（JSON 字符串）';
COMMENT ON COLUMN public."credit_transactions"."created_at" IS '创建时间';

COMMENT ON TABLE public."blog_category" IS '博客分类表';
COMMENT ON COLUMN public."blog_category"."id" IS '分类ID';
COMMENT ON COLUMN public."blog_category"."name" IS '分类名称';
COMMENT ON COLUMN public."blog_category"."slug" IS '分类别名';
COMMENT ON COLUMN public."blog_category"."description" IS '分类描述';
COMMENT ON COLUMN public."blog_category"."locale" IS '语言区域';
COMMENT ON COLUMN public."blog_category"."sort_order" IS '排序值';
COMMENT ON COLUMN public."blog_category"."created_at" IS '创建时间';
COMMENT ON COLUMN public."blog_category"."updated_at" IS '更新时间';

COMMENT ON TABLE public."blog_post" IS '博客文章表';
COMMENT ON COLUMN public."blog_post"."id" IS '文章ID';
COMMENT ON COLUMN public."blog_post"."slug" IS '文章别名';
COMMENT ON COLUMN public."blog_post"."locale" IS '语言区域';
COMMENT ON COLUMN public."blog_post"."title" IS '标题';
COMMENT ON COLUMN public."blog_post"."description" IS '摘要';
COMMENT ON COLUMN public."blog_post"."content" IS 'Tiptap 内容 JSON';
COMMENT ON COLUMN public."blog_post"."html_content" IS '预渲染 HTML 内容';
COMMENT ON COLUMN public."blog_post"."cover_image" IS '封面图地址';
COMMENT ON COLUMN public."blog_post"."author" IS '作者名称';
COMMENT ON COLUMN public."blog_post"."tags" IS '标签 JSON 数组';
COMMENT ON COLUMN public."blog_post"."category_id" IS '分类ID';
COMMENT ON COLUMN public."blog_post"."status" IS '发布状态';
COMMENT ON COLUMN public."blog_post"."published_at" IS '发布时间';
COMMENT ON COLUMN public."blog_post"."author_id" IS '作者用户ID';
COMMENT ON COLUMN public."blog_post"."created_at" IS '创建时间';
COMMENT ON COLUMN public."blog_post"."updated_at" IS '更新时间';

COMMENT ON TABLE public."api_key" IS 'API 密钥表';
COMMENT ON COLUMN public."api_key"."id" IS 'API 密钥ID';
COMMENT ON COLUMN public."api_key"."name" IS '密钥名称';
COMMENT ON COLUMN public."api_key"."hashed_key" IS '密钥哈希';
COMMENT ON COLUMN public."api_key"."user_id" IS '所属用户ID';
COMMENT ON COLUMN public."api_key"."expires_at" IS '过期时间';
COMMENT ON COLUMN public."api_key"."last_used_at" IS '最后使用时间';
COMMENT ON COLUMN public."api_key"."created_at" IS '创建时间';
COMMENT ON COLUMN public."api_key"."updated_at" IS '更新时间';

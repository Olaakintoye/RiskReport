CREATE TABLE "banks" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"rating" numeric NOT NULL,
	"fdic_insured" boolean DEFAULT true NOT NULL,
	"logo_type" text NOT NULL,
	"color" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cd_products" (
	"id" serial PRIMARY KEY NOT NULL,
	"bank_id" integer NOT NULL,
	"name" text NOT NULL,
	"term_months" integer NOT NULL,
	"apy" numeric NOT NULL,
	"minimum_deposit" numeric NOT NULL,
	"early_withdrawal_penalty" text NOT NULL,
	"description" text,
	"is_featured" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "investments" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"cd_product_id" integer NOT NULL,
	"amount" numeric NOT NULL,
	"start_date" timestamp DEFAULT now() NOT NULL,
	"maturity_date" timestamp NOT NULL,
	"interest_earned" numeric DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" text NOT NULL,
	"message" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"related_investment_id" integer,
	"related_cd_product_id" integer
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" text NOT NULL,
	"amount" numeric NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"related_investment_id" integer
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"dark_mode" boolean DEFAULT false NOT NULL,
	"push_notifications" boolean DEFAULT true NOT NULL,
	"email_notifications" boolean DEFAULT true NOT NULL,
	"maturity_preference" text DEFAULT 'notify' NOT NULL,
	CONSTRAINT "user_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"email" text NOT NULL,
	"full_name" text NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);

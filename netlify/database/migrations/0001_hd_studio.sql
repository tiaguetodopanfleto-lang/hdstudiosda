CREATE TABLE "coupons" (
	"code" text PRIMARY KEY NOT NULL,
	"percent" integer NOT NULL,
	"active" integer DEFAULT 1 NOT NULL
);

CREATE TABLE "customers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"created" text NOT NULL
);

CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"product_id" text NOT NULL,
	"product_name" text NOT NULL,
	"subtotal" integer NOT NULL,
	"total" integer NOT NULL,
	"cost" integer NOT NULL,
	"coupon" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"delivery" text DEFAULT '' NOT NULL,
	"created" text NOT NULL,
	"paid" text
);

CREATE INDEX "idx_orders_customer" ON "orders" ("customer_id");
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"price" integer NOT NULL,
	"cost" integer DEFAULT 0 NOT NULL,
	"active" integer DEFAULT 1 NOT NULL,
	"delivery" text DEFAULT '' NOT NULL,
	"created" text NOT NULL
);

CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);

CREATE TABLE "ticket_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"ticket_id" text NOT NULL,
	"sender" text NOT NULL,
	"body" text NOT NULL,
	"created" bigint NOT NULL
);

CREATE INDEX "idx_messages_ticket_created" ON "ticket_messages" ("ticket_id","created");
CREATE TABLE "tickets" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"customer_name" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created" bigint NOT NULL,
	"updated" bigint NOT NULL,
	"owner_typing" bigint DEFAULT 0 NOT NULL,
	"customer_typing" bigint DEFAULT 0 NOT NULL
);

CREATE INDEX "idx_tickets_customer" ON "tickets" ("customer_id");
CREATE INDEX "idx_tickets_updated" ON "tickets" ("updated");
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password" text NOT NULL,
	"role" text DEFAULT 'customer' NOT NULL,
	"recovery" text NOT NULL,
	"created" bigint NOT NULL
);

CREATE UNIQUE INDEX "accounts_email_unique" ON "accounts" ("email");
CREATE TABLE "auth_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"expires" bigint NOT NULL
);

CREATE TABLE "account_sessions" (
	"token" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"expires" bigint NOT NULL
);

CREATE INDEX "idx_sessions_account" ON "account_sessions" ("account_id");
CREATE TABLE "pending_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password" text NOT NULL,
	"code" text NOT NULL,
	"expires" bigint NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL
);

CREATE UNIQUE INDEX "pending_accounts_email_unique" ON "pending_accounts" ("email");
CREATE UNIQUE INDEX idx_tickets_one_open ON tickets(customer_id) WHERE status='open';

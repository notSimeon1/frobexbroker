import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  adminAdjustBalance,
  adminDecideDeposit,
  adminDecideKyc,
  adminDecideWithdrawal,
  adminGetKycDocumentUrl,
  adminGetOverview,
  adminPostNews,
  adminToggleAccountMode,
  adminToggleSuspend,
  adminUpdateChart,
  adminUpdateComplaint,
  adminUpdateSetting,
  closeUserPosition,
  openUserPosition,
} from "./admin.server";

const decisionSchema = z.object({ id: z.string().uuid(), status: z.enum(["approved", "rejected"]) });
const chartSchema = z.object({ userId: z.string().uuid(), mode: z.enum(["profit", "loss", "flat"]), intensity: z.number().min(0.1).max(5) });
const balanceSchema = z.object({ userId: z.string().uuid(), amount: z.number().positive().max(1_000_000), direction: z.enum(["credit", "debit"]) });
const complaintSchema = z.object({ id: z.string().uuid(), status: z.enum(["pending", "resolved"]) });
const settingSchema = z.object({ key: z.string().min(1).max(80), value: z.string().min(1).max(300) });
const modeSchema = z.object({ userId: z.string().uuid(), mode: z.enum(["demo", "live"]) });
const suspendSchema = z.object({ userId: z.string().uuid(), suspended: z.boolean() });
const kycSchema = z.object({ id: z.string().uuid(), status: z.enum(["approved", "rejected"]), note: z.string().max(500).optional() });
const newsSchema = z.object({
  title: z.string().min(1).max(160),
  body: z.string().max(2000).default(""),
  impact: z.enum(["low", "medium", "high"]).default("medium"),
  source: z.string().max(120).default("Frobex Desk"),
});
const docSchema = z.object({ path: z.string().min(1).max(500) });
const openPositionSchema = z.object({
  asset: z.string().min(1).max(40),
  side: z.enum(["buy", "sell"]),
  quantity: z.number().positive(),
  leverage: z.number().min(1).max(100),
  margin: z.number().positive().max(1_000_000),
  entryPrice: z.number().positive(),
  accountMode: z.enum(["demo", "live"]),
});
const closePositionSchema = z.object({ id: z.string().uuid(), closePrice: z.number().positive() });

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => adminGetOverview(context.userId));

export const decideAdminDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => decisionSchema.parse(input))
  .handler(async ({ data, context }) => adminDecideDeposit(context.userId, data.id, data.status));

export const decideAdminWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => decisionSchema.parse(input))
  .handler(async ({ data, context }) => adminDecideWithdrawal(context.userId, data.id, data.status));

export const updateAdminChart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => chartSchema.parse(input))
  .handler(async ({ data, context }) => adminUpdateChart(context.userId, data.userId, data.mode, data.intensity));

export const adjustAdminBalance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => balanceSchema.parse(input))
  .handler(async ({ data, context }) => adminAdjustBalance(context.userId, data.userId, data.amount, data.direction));

export const updateAdminComplaint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => complaintSchema.parse(input))
  .handler(async ({ data, context }) => adminUpdateComplaint(context.userId, data.id, data.status));

export const updateAdminSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => settingSchema.parse(input))
  .handler(async ({ data, context }) => adminUpdateSetting(context.userId, data.key, data.value));

export const toggleAdminAccountMode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => modeSchema.parse(input))
  .handler(async ({ data, context }) => adminToggleAccountMode(context.userId, data.userId, data.mode));

export const toggleAdminSuspend = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => suspendSchema.parse(input))
  .handler(async ({ data, context }) => adminToggleSuspend(context.userId, data.userId, data.suspended));

export const decideAdminKyc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => kycSchema.parse(input))
  .handler(async ({ data, context }) => adminDecideKyc(context.userId, data.id, data.status, data.note));

export const postAdminNews = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => newsSchema.parse(input))
  .handler(async ({ data, context }) => adminPostNews(context.userId, data.title, data.body, data.impact, data.source));

export const getAdminKycUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => docSchema.parse(input))
  .handler(async ({ data, context }) => adminGetKycDocumentUrl(context.userId, data.path));

export const openPosition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => openPositionSchema.parse(input))
  .handler(async ({ data, context }) => openUserPosition(
    context.userId,
    data.asset,
    data.side,
    data.quantity,
    data.leverage,
    data.margin,
    data.entryPrice,
    data.accountMode,
  ));

export const closePosition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => closePositionSchema.parse(input))
  .handler(async ({ data, context }) => closeUserPosition(context.userId, data.id, data.closePrice));

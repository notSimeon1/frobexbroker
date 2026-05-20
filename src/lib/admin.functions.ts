import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  adminAdjustBalance,
  adminDecideDeposit,
  adminDecideWithdrawal,
  adminGetOverview,
  adminUpdateChart,
  adminUpdateComplaint,
  adminUpdateSetting,
} from "./admin.server";

const requestSchema = z.object({}).optional();
const decisionSchema = z.object({ id: z.string().uuid(), status: z.enum(["approved", "rejected"]) });
const chartSchema = z.object({ userId: z.string().uuid(), mode: z.enum(["profit", "loss", "flat"]), intensity: z.number().min(0.1).max(5) });
const balanceSchema = z.object({ userId: z.string().uuid(), amount: z.number().positive().max(1_000_000), direction: z.enum(["credit", "debit"]) });
const complaintSchema = z.object({ id: z.string().uuid(), status: z.enum(["pending", "resolved"]) });
const settingSchema = z.object({ key: z.string().min(1).max(80), value: z.string().min(1).max(300) });

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => requestSchema.parse(input))
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
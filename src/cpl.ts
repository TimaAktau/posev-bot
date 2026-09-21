import type { BotContext } from "./context.js";
import { allTimeStats, defaultCplLimit, getClient } from "./db.js";

export function fmtMoney(n: number) {
  return `${Math.round(n).toLocaleString("ru-RU")} ₸`;
}

export function cplText(spent: number, leads: number) {
  if (leads === 0) return "нет лидов";
  return fmtMoney(spent / leads);
}

export function clientLimit(clientId: number): number {
  const c = getClient(clientId);
  if (c?.cpl_limit != null && c.cpl_limit > 0) return c.cpl_limit;
  return defaultCplLimit();
}

export async function maybeAlertCpl(ctx: BotContext, clientId: number) {
  const { spent, leads } = allTimeStats(clientId);
  const limit = clientLimit(clientId);
  if (limit <= 0 || leads === 0) return;
  const cpl = spent / leads;
  if (cpl <= limit) return;
  const client = getClient(clientId);
  await ctx.reply(
    [
      `⚠ CPL выше порога`,
      `Клиент: ${client?.name ?? clientId}`,
      `CPL: ${fmtMoney(cpl)}`,
      `Порог: ${fmtMoney(limit)}`,
      `Потрачено: ${fmtMoney(spent)} · лидов: ${leads}`,
    ].join("\n"),
  );
}

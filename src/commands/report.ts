import { InlineKeyboard } from "grammy";
import type { BotContext, Convo } from "../context.js";
import { cplText, fmtMoney } from "../cpl.js";
import { listClients, statsForClient } from "../db.js";

function fromDays(days: number | null): string | null {
  if (days == null) return null;
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (days === 1 ? 0 : days - 1));
  if (days === 1) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
}

export async function report(conversation: Convo, ctx: BotContext) {
  const kb = new InlineKeyboard()
    .text("Сегодня", "rep:1")
    .text("7 дней", "rep:7")
    .row()
    .text("30 дней", "rep:30")
    .text("Всё время", "rep:all");
  await ctx.reply("Период отчёта?", { reply_markup: kb });
  const pick = await conversation.waitUntil((c) => Boolean(c.callbackQuery?.data?.startsWith("rep:")));
  await pick.answerCallbackQuery();
  const key = pick.callbackQuery!.data!.slice(4);
  const days = key === "all" ? null : Number(key);
  const from = fromDays(days);
  const label =
    key === "1" ? "сегодня" : key === "7" ? "7 дней" : key === "30" ? "30 дней" : "всё время";

  const clients = listClients();
  if (!clients.length) {
    await ctx.reply("Нет клиентов.");
    return;
  }

  let spentAll = 0;
  let leadsAll = 0;
  const lines: string[] = [`Отчёт: ${label}`, ""];
  for (const c of clients) {
    const { spent, leads } = statsForClient(c.id, from);
    spentAll += spent;
    leadsAll += leads;
    lines.push(`${c.name}: ${fmtMoney(spent)} → ${leads} лид. → CPL ${cplText(spent, leads)}`);
  }
  lines.push("");
  lines.push(`Итого: ${fmtMoney(spentAll)} → ${leadsAll} лид. → CPL ${cplText(spentAll, leadsAll)}`);
  await ctx.reply(lines.join("\n"));
}

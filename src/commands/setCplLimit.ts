import { InlineKeyboard } from "grammy";
import type { BotContext, Convo } from "../context.js";
import { defaultCplLimit, setClientCplLimit, setSetting } from "../db.js";
import { fmtMoney } from "../cpl.js";
import { pickClient } from "./pickClient.js";

function skipCmd(text: string | undefined) {
  return Boolean(text && !text.startsWith("/"));
}

export async function setCplLimit(conversation: Convo, ctx: BotContext) {
  const kb = new InlineKeyboard()
    .text("Глобально", "lim:global")
    .text("На клиента", "lim:client");
  await ctx.reply(`Текущий глобальный порог: ${fmtMoney(defaultCplLimit())}\nКуда поставить?`, {
    reply_markup: kb,
  });
  const pick = await conversation.waitUntil((c) => Boolean(c.callbackQuery?.data?.startsWith("lim:")));
  await pick.answerCallbackQuery();
  const mode = pick.callbackQuery!.data;

  let clientId: number | null = null;
  if (mode === "lim:client") {
    const client = await pickClient(conversation, ctx);
    if (!client) return;
    clientId = client.id;
    await ctx.reply(`Порог CPL для «${client.name}» (число)?`);
  } else {
    await ctx.reply("Глобальный порог CPL (число)?");
  }

  const nCtx = await conversation.waitUntil((c) => skipCmd(c.message?.text));
  const n = Number(nCtx.message!.text!.replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(n) || n < 0) {
    await ctx.reply("Нужно число. Отмена.");
    return;
  }

  if (clientId) setClientCplLimit(clientId, n);
  else setSetting("default_cpl_limit", String(n));
  await ctx.reply(`Порог CPL: ${fmtMoney(n)}`);
}

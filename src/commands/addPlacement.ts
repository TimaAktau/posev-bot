import { InlineKeyboard } from "grammy";
import type { BotContext, Convo } from "../context.js";
import { maybeAlertCpl } from "../cpl.js";
import { insertPlacement } from "../db.js";
import { pickClient } from "./pickClient.js";

function skipCmd(text: string | undefined) {
  return Boolean(text && !text.startsWith("/"));
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export async function addPlacement(conversation: Convo, ctx: BotContext) {
  const client = await pickClient(conversation, ctx);
  if (!client) return;

  await ctx.reply(`Клиент: ${client.name}\nКанал / площадка?`);
  const chCtx = await conversation.waitUntil((c) => skipCmd(c.message?.text));
  const channel = chCtx.message!.text!.trim();
  if (!channel) {
    await ctx.reply("Канал пустой. Отмена.");
    return;
  }

  await ctx.reply("Цена размещения (число)?");
  const priceCtx = await conversation.waitUntil((c) => skipCmd(c.message?.text));
  const price = Number(priceCtx.message!.text!.replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(price) || price < 0) {
    await ctx.reply("Нужно число, например 15000. Отмена.");
    return;
  }

  const kb = new InlineKeyboard().text("Сегодня", "date:today").text("Другая дата", "date:other");
  await ctx.reply(`Дата? По умолчанию ${today()}`, { reply_markup: kb });
  const datePick = await conversation.waitUntil(
    (c) =>
      Boolean(c.callbackQuery?.data?.startsWith("date:")) || skipCmd(c.message?.text),
  );
  let date = today();
  if (datePick.callbackQuery?.data === "date:today") {
    await datePick.answerCallbackQuery();
  } else if (datePick.callbackQuery?.data === "date:other") {
    await datePick.answerCallbackQuery();
    await ctx.reply("Дата в формате ГГГГ-ММ-ДД");
    const dCtx = await conversation.waitUntil((c) => skipCmd(c.message?.text));
    date = dCtx.message!.text!.trim();
  } else if (datePick.message?.text) {
    const t = datePick.message.text.trim();
    date = t === "сегодня" ? today() : t;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    await ctx.reply("Дата должна быть ГГГГ-ММ-ДД. Отмена.");
    return;
  }

  await ctx.reply("Ссылка на пост? «-» чтобы пропустить.");
  const urlCtx = await conversation.waitUntil((c) => skipCmd(c.message?.text));
  const urlRaw = urlCtx.message!.text!.trim();
  const url = urlRaw === "-" ? null : urlRaw;

  await ctx.reply("Охват? Число или «-».");
  const reachCtx = await conversation.waitUntil((c) => skipCmd(c.message?.text));
  const reachRaw = reachCtx.message!.text!.trim();
  let reach: number | null = null;
  if (reachRaw !== "-") {
    const n = Number(reachRaw.replace(/\s/g, ""));
    if (!Number.isFinite(n) || n < 0) {
      await ctx.reply("Охват должен быть числом. Отмена.");
      return;
    }
    reach = n;
  }

  insertPlacement({
    client_id: client.id,
    channel,
    price,
    date,
    url,
    reach,
  });
  await ctx.reply(`Посев записан: ${client.name} → ${channel}, ${price.toLocaleString("ru-RU")} ₸`);
  await maybeAlertCpl(ctx, client.id);
}

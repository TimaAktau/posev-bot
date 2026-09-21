import { InlineKeyboard } from "grammy";
import type { BotContext, Convo } from "../context.js";
import { maybeAlertCpl } from "../cpl.js";
import { insertLead, listPlacementsByClient } from "../db.js";
import { pickClient } from "./pickClient.js";

function skipCmd(text: string | undefined) {
  return Boolean(text && !text.startsWith("/"));
}

export async function addLead(conversation: Convo, ctx: BotContext) {
  const client = await pickClient(conversation, ctx);
  if (!client) return;

  const placements = listPlacementsByClient(client.id);
  let placementId: number | null = null;
  if (placements.length) {
    const kb = new InlineKeyboard();
    placements.slice(0, 8).forEach((p) => {
      kb.text(`${p.channel} · ${p.date}`, `pl:${p.id}`).row();
    });
    kb.text("Без посева", "pl:none");
    await ctx.reply("Источник / посев?", { reply_markup: kb });
    const pick = await conversation.waitUntil(
      (c) => Boolean(c.callbackQuery?.data?.startsWith("pl:")) || skipCmd(c.message?.text),
    );
    if (pick.callbackQuery?.data === "pl:none") {
      await pick.answerCallbackQuery();
    } else if (pick.callbackQuery?.data?.startsWith("pl:")) {
      await pick.answerCallbackQuery();
      placementId = Number(pick.callbackQuery.data.slice(3));
    }
  }

  await ctx.reply("Текст заявки: имя, телефон или оба.");
  const payloadCtx = await conversation.waitUntil((c) => skipCmd(c.message?.text));
  const payload = payloadCtx.message!.text!.trim();
  if (!payload) {
    await ctx.reply("Пустая заявка. Отмена.");
    return;
  }

  insertLead({
    client_id: client.id,
    placement_id: placementId,
    payload,
    status: "новый",
  });
  await ctx.reply(`Лид записан (${client.name}), статус: новый`);
  await maybeAlertCpl(ctx, client.id);
}

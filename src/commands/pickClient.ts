import { InlineKeyboard } from "grammy";
import type { BotContext, Convo } from "../context.js";
import { findClientsByName, getClient, listClients, type Client } from "../db.js";

export function clientsKeyboard(clients: Client[]) {
  const kb = new InlineKeyboard();
  clients.forEach((c, i) => {
    kb.text(`${c.id}. ${c.name}`, `client:${c.id}`);
    if (i % 2 === 1) kb.row();
  });
  kb.row().text("По имени", "client:search");
  return kb;
}

export async function pickClient(
  conversation: Convo,
  ctx: BotContext,
): Promise<Client | null> {
  const clients = listClients();
  if (!clients.length) {
    await ctx.reply("Сначала /add_client");
    return null;
  }

  await ctx.reply("Клиент: выберите кнопку или напишите имя.", {
    reply_markup: clientsKeyboard(clients),
  });

  const update = await conversation.waitUntil(
    (c) =>
      Boolean(c.callbackQuery?.data?.startsWith("client:")) ||
      Boolean(c.message?.text && !c.message.text.startsWith("/")),
    { otherwise: (c) => c.reply("Выберите клиента кнопкой или напишите имя.") },
  );

  if (update.callbackQuery?.data) {
    await update.answerCallbackQuery();
    const data = update.callbackQuery.data;
    if (data === "client:search") {
      await ctx.reply("Часть имени клиента?");
      const qCtx = await conversation.waitUntil(
        (c) => Boolean(c.message?.text && !c.message.text.startsWith("/")),
      );
      const found = findClientsByName(qCtx.message!.text!.trim());
      if (!found.length) {
        await ctx.reply("Клиент не найден. Отмена.");
        return null;
      }
      if (found.length === 1) return found[0];
      await ctx.reply("Уточните:", { reply_markup: clientsKeyboard(found) });
      const pick = await conversation.waitUntil((c) =>
        Boolean(c.callbackQuery?.data?.startsWith("client:")),
      );
      await pick.answerCallbackQuery();
      const id = Number(pick.callbackQuery!.data!.slice("client:".length));
      return getClient(id) ?? null;
    }
    const id = Number(data.slice("client:".length));
    return getClient(id) ?? null;
  }

  const found = findClientsByName(update.message!.text!.trim());
  if (!found.length) {
    await ctx.reply("Клиент не найден. Отмена.");
    return null;
  }
  if (found.length === 1) return found[0];
  await ctx.reply("Уточните:", { reply_markup: clientsKeyboard(found) });
  const pick = await conversation.waitUntil((c) =>
    Boolean(c.callbackQuery?.data?.startsWith("client:")),
  );
  await pick.answerCallbackQuery();
  const id = Number(pick.callbackQuery!.data!.slice("client:".length));
  return getClient(id) ?? null;
}

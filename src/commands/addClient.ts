import type { BotContext, Convo } from "../context.js";
import { insertClient } from "../db.js";

function skipCmd(text: string | undefined) {
  return Boolean(text && !text.startsWith("/"));
}

export async function addClient(conversation: Convo, ctx: BotContext) {
  await ctx.reply("Название клиента?");
  const nameCtx = await conversation.waitUntil(
    (c) => skipCmd(c.message?.text),
    { otherwise: (c) => c.reply("Напишите название текстом, без команды.") },
  );
  const name = nameCtx.message!.text!.trim();
  if (!name) {
    await ctx.reply("Название пустое. Отмена.");
    return;
  }

  await ctx.reply("Ниша? Напишите «-», чтобы пропустить.");
  const nicheCtx = await conversation.waitUntil((c) => skipCmd(c.message?.text));
  const nicheRaw = nicheCtx.message!.text!.trim();
  const niche = nicheRaw === "-" ? null : nicheRaw;

  await ctx.reply("Контакт? Напишите «-», чтобы пропустить.");
  const contactCtx = await conversation.waitUntil((c) => skipCmd(c.message?.text));
  const contactRaw = contactCtx.message!.text!.trim();
  const contact = contactRaw === "-" ? null : contactRaw;

  insertClient({ name, niche, contact });
  await ctx.reply(`Клиент «${name}» сохранён.`);
}

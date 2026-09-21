import "dotenv/config";
import { conversations, createConversation } from "@grammyjs/conversations";
import { Bot, session } from "grammy";
import { addClient } from "./commands/addClient.js";
import { addLead } from "./commands/addLead.js";
import { addPlacement } from "./commands/addPlacement.js";
import { HELP } from "./commands/help.js";
import { report } from "./commands/report.js";
import { setCplLimit } from "./commands/setCplLimit.js";
import type { BotContext, SessionData } from "./context.js";
import { claimAdmin, getAdminId, listClients } from "./db.js";

const token = process.env.BOT_TOKEN?.trim();
if (!token) {
  console.error("Нет BOT_TOKEN. Скопируйте .env.example в .env и вставьте токен.");
  process.exit(1);
}

const bot = new Bot<BotContext>(token);

bot.use(session({ initial: (): SessionData => ({}) }));
bot.use(conversations());
bot.use(createConversation(addClient, "addClient"));
bot.use(createConversation(addPlacement, "addPlacement"));
bot.use(createConversation(addLead, "addLead"));
bot.use(createConversation(report, "report"));
bot.use(createConversation(setCplLimit, "setCplLimit"));

bot.use(async (ctx, next) => {
  if (!ctx.from) return;
  const admin = getAdminId();
  const isStart = ctx.hasCommand("start");
  if (!admin && isStart) return next();
  if (!admin) {
    await ctx.reply("Сначала /start от владельца.");
    return;
  }
  if (ctx.from.id !== admin) {
    await ctx.reply("нет доступа");
    return;
  }
  return next();
});

bot.command("start", async (ctx) => {
  const id = claimAdmin(ctx.from!.id);
  if (id !== ctx.from!.id) {
    await ctx.reply("нет доступа");
    return;
  }
  await ctx.reply(["Посевы — учёт размещений и лидов.", "", HELP].join("\n"));
});

bot.command("help", async (ctx) => {
  await ctx.reply(HELP);
});

bot.command("clients", async (ctx) => {
  const clients = listClients();
  if (!clients.length) {
    await ctx.reply("Пусто. /add_client");
    return;
  }
  const lines = clients.map((c) => {
    const extra = [c.niche, c.contact].filter(Boolean).join(" · ");
    return extra ? `#${c.id} ${c.name} — ${extra}` : `#${c.id} ${c.name}`;
  });
  await ctx.reply(lines.join("\n"));
});

bot.command("add_client", (ctx) => ctx.conversation.enter("addClient"));
bot.command("add_placement", (ctx) => ctx.conversation.enter("addPlacement"));
bot.command("add_lead", (ctx) => ctx.conversation.enter("addLead"));
bot.command("report", (ctx) => ctx.conversation.enter("report"));
bot.command("set_cpl_limit", (ctx) => ctx.conversation.enter("setCplLimit"));

bot.catch((err) => {
  console.error(err);
});

bot.start({
  onStart: (me) => console.log(`Бот @${me.username} запущен`),
});

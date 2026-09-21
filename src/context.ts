import type { Conversation, ConversationFlavor } from "@grammyjs/conversations";
import type { Context, SessionFlavor } from "grammy";

export type SessionData = Record<string, never>;

export type BotContext = Context & SessionFlavor<SessionData> & ConversationFlavor<Context>;

export type Convo = Conversation<BotContext, BotContext>;

import { ENVIRONMENT } from "../config/env.js";
import { Command } from "./command.js";

const message = `
*JetroConvBot v.${ENVIRONMENT.VERSION}*
*Comandos disponíveis:*

/conv - Consulta todas as bases e mostra botões para interação
/status - Mostra apenas o status de uso atual
/help - Mostra esta mensagem de ajuda

*Como usar:*
• Use /conv para ver todas as conversões e bases
• Clique em uma conversão livre (🟢) para marcá-la como em uso
• Clique em uma conversão em uso (🔴) para liberá-la
• Você pode liberar conversões que estão em seu uso
• Administradores e donos de grupos podem liberar qualquer conversão
• Use /conv novamente para atualizar a lista de bases
`;

export class HelpCommand extends Command {
  regex = /^\/help$/;

  execute = async (msg) => {
    const chatId = msg.chat.id;
    return await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  }
}
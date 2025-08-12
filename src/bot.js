import TelegramBot from 'node-telegram-bot-api';
import { SessionManager } from './services/session-manager.js';
import { Authenticator } from './services/authenticator.js';
import { RequestSigner } from './services/request-signer.js';
import { Endpoint } from './services/endpoint.js';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { ENVIRONMENT } from './config/env.js';

// Token do seu bot
const bot = new TelegramBot(ENVIRONMENT.TELEGRAM_TOKEN, { polling: true });

// Sistema de controle de uso das conversões
const conversaoUsage = new Map(); // conversaoNumber -> { username, userId, timestamp }
const activeConvMessages = new Map(); // chatId -> { messageId, userId }
let cachedConversoes = []; // Cache global de conversões com seus nomes
const oldConvMessages = new Map(); // chatId -> {messageId, timestamp} - Para rastrear o último menu ativo por chat
const oldStatusMessages = new Map(); // chatId -> {messageId, timestamp} - Para rastrear a última mensagem de status por chat

// Caminho do arquivo de dados
const dataFile = path.join(process.cwd(), 'data', 'conversao-usage.json');

// Funções para persistência de dados
function saveUsageData() {
  try {
    // Cria o diretório data se não existir
    const dataDir = path.dirname(dataFile);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Converte o Map para objeto para salvar no JSON
    const dataToSave = {};
    for (const [key, value] of conversaoUsage.entries()) {
      dataToSave[key] = value;
    }
    
    fs.writeFileSync(dataFile, JSON.stringify(dataToSave, null, 2));
    console.log('Dados salvos com sucesso');
  } catch (error) {
    console.error('Erro ao salvar dados:', error);
  }
}

function loadUsageData() {
  try {
    if (fs.existsSync(dataFile)) {
      const data = fs.readFileSync(dataFile, 'utf8');
      const parsedData = JSON.parse(data);
      
      // Converte objeto de volta para Map
      for (const [key, value] of Object.entries(parsedData)) {
        conversaoUsage.set(parseInt(key), value);
      }
      
      console.log('Dados carregados com sucesso');
    }
  } catch (error) {
    console.error('Erro ao carregar dados:', error);
  }
}

// Carrega os dados ao iniciar o bot
loadUsageData();

// Cache de nomes de conversões para reduzir chamadas de API
async function getConvName(number) {
  // Faz a requisição para obter o nome da conversão
  const apiEndpoint = new Endpoint({
    base: `https://conversao-${number}.jetrocorporativo.com`,
    path: "/backend",
    root: "taylor"
  });
  const session = new SessionManager();
  const auth = new Authenticator(apiEndpoint, session);
  const signer = new RequestSigner(apiEndpoint, session);
  try {
    await auth.signIn({ username: 'jetro', password: 'Aa1234567' });
    const path = apiEndpoint.getFullPath('api?modelo%3Dappgrupoempress');
    const sessionSignature = signer.sign(path);
    const signedUrl = `${apiEndpoint.base}${path}&session_signature=${sessionSignature}`;

    return (await axios.get(signedUrl)).data.data[0].Subdominio;

  } catch (err) {
    console.error('Erro:', err.message);
    return 'Fora do ar';
  }
}

// Gera a lista de botões para a mensagem de conversões
function generateConversaoInlineKeyboard(conversoes) {
  const keyboard = [];

  for (const conv of conversoes) {
    const row = [];

    // Um único botão por conversão que muda conforme o estado
    const emoji = conv.inUse ? '🔴' : '🟢';
    let text = `${emoji} Conversão ${conv.number}: ${conv.name}`;
    if (conv.inUse && conv.username) {
      text += ` @${conv.username}`;
    }
    
    // O mesmo botão serve para ambas ações - usar ou liberar
    const actionType = conv.inUse ? 'liberar' : 'usar';
    row.push({
      text: text,
      callback_data: `${actionType}_${conv.number}`
    });

    keyboard.push(row);
  }
  
  return {
    inline_keyboard: keyboard
  };
}

// Função para enviar ou atualizar a mensagem das conversões
async function updateConvMessage(chatId, messageId = null, shouldFetchNames = true) {
  // Recarrega os dados do arquivo antes de atualizar
  // Limpar o Map antes de recarregar para garantir que remova conversões que foram liberadas
  conversaoUsage.clear();
  loadUsageData();
  
  // Para garantir dados atualizados, forçamos a recarga no comando /status
  if (!shouldFetchNames) {
    // Limpa o cache de nomes também quando o comando status é chamado
    cachedConversoes = [];
    shouldFetchNames = true; // Força buscar os nomes novamente
  }
  
  try {
    const conversoes = [];
    
    if (shouldFetchNames) {
      // Somente busca os nomes quando solicitado (comando /conv)
      console.log('Consultando nomes de todas as conversões...');
      const requests = [];
      for (let i = 1; i <= 9; i++) {
        requests.push(getConvName(i, true)); // força atualização
      }
      const responses = await Promise.all(requests);
      
      for (let i = 0; i < responses.length; i++) {
        const number = i + 1;
        const name = responses[i];
        const usage = conversaoUsage.get(number);
        conversoes.push({
          number,
          name,
          inUse: !!usage,
          username: usage?.username
        });
      }
      
      // Atualiza o cache global para uso em atualizações futuras
      cachedConversoes = [...conversoes];
    } else {
      // Usa os dados em cache, apenas atualizando o status de uso
      if (!cachedConversoes || cachedConversoes.length === 0) {
        console.log('Não há dados em cache, usando placeholders...');
        // Se não tiver cache, usa placeholders
        for (let i = 1; i <= 9; i++) {
          const usage = conversaoUsage.get(i);
          conversoes.push({
            number: i,
            name: `Base #${i}`,
            inUse: !!usage,
            username: usage?.username
          });
        }
      } else {
        // Usa o cache, apenas atualizando o status
        console.log('Usando cache para nomes de conversões...');
        for (const conv of cachedConversoes) {
          const usage = conversaoUsage.get(conv.number);
          conversoes.push({
            number: conv.number,
            name: conv.name,
            inUse: !!usage,
            username: usage?.username
          });
        }
      }
    }
    
    const inlineKeyboard = generateConversaoInlineKeyboard(conversoes);
    const messageText = '*Bases rodando em cada conversão:*\n\n_Selecione uma conversão para informar se está em uso por você._';
    
    if (messageId) {
      // Atualizar mensagem existente
      return await bot.editMessageText(messageText, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: inlineKeyboard
      });
    } else {
      // Enviar nova mensagem
      const sentMsg = await bot.sendMessage(chatId, messageText, {
        parse_mode: 'Markdown',
        reply_markup: inlineKeyboard
      });
      
      // Armazena a referência da mensagem para poder editá-la depois
      activeConvMessages.set(chatId, {
        messageId: sentMsg.message_id,
        userId: sentMsg.from.id
      });
      
      return sentMsg;
    }
  } catch (error) {
    // Ignora o erro específico de mensagem não modificada (acontece em interações simultâneas)
    if (error.code === 'ETELEGRAM' && error.message.includes('message is not modified')) {
      console.log('Aviso: Tentativa de atualização simultânea detectada, ignorando.');
      return true; // Retorna sucesso, já que a mensagem já está atualizada
    }
    
    console.error('Erro ao atualizar mensagem:', error);
    return null;
  }
}

// Comando /conv para mostrar todas as conversões
bot.onText(/^\/conv$/, async (msg) => {
  const chatId = msg.chat.id;
  
  // Verificar se é um chat privado
  if (msg.chat.type === 'private') {
    // Não permitir o comando /conv em chat privado
    await bot.sendMessage(chatId, '⚠️ O comando /conv só está disponível em grupos.\n\nUtilize /status para verificar o status atual ou /help para ver todos os comandos disponíveis.');
    return;
  }
  
  const loadingMsg = await bot.sendMessage(chatId, 'Consultando conversões, aguarde...');
  
  try {
    // Tentar apagar a mensagem de comando se o bot for admin
    await tryDeleteCommandMessage(msg);
    
    // Invalidar menu anterior deste chat (deve haver apenas um menu ativo por chat)
    if (oldConvMessages.has(chatId)) {
      const oldMenuData = oldConvMessages.get(chatId);
      // Apagar mensagem antiga ao invés de editar
      try {
        await bot.deleteMessage(chatId, oldMenuData.messageId);
        console.log(`Mensagem antiga ${oldMenuData.messageId} apagada com sucesso`);
      } catch (err) {
        console.log(`Não foi possível apagar mensagem ${oldMenuData.messageId}: ${err.message}`);
      }
    }
    
    // Busca os nomes das conversões (sempre consulta as APIs)
    await updateConvMessage(chatId, loadingMsg.message_id, true);
    
    // Guarda a nova mensagem como o único menu ativo para este chat
    // junto com o timestamp de quando foi criado
    oldConvMessages.set(chatId, {
      messageId: loadingMsg.message_id,
      timestamp: Date.now()
    });
    
  } catch (error) {
    console.error('Erro ao processar comando /conv:', error);
    await bot.editMessageText('❌ Erro ao consultar conversões. Tente novamente.', {
      chat_id: chatId,
      message_id: loadingMsg.message_id
    });
  }
});

// Gerenciar callbacks dos botões inline
bot.on('callback_query', async (callbackQuery) => {
  const action = callbackQuery.data;
  const msg = callbackQuery.message;
  const chatId = msg.chat.id;
  const messageId = msg.message_id;
  const userId = callbackQuery.from.id;
  const username = callbackQuery.from.username || callbackQuery.from.first_name;
  
  // Verificar se esta mensagem é o menu ativo para este chat
  const isActiveMenu = oldConvMessages.has(chatId) && 
                      oldConvMessages.get(chatId).messageId === messageId;
  
  // Se a mensagem não é o menu ativo, é uma mensagem antiga
  if (!isActiveMenu) {
    await bot.answerCallbackQuery(callbackQuery.id, {
      text: `⚠️ Este menu está desatualizado. Use o comando /conv para ver o menu atual.`,
      show_alert: true
    });
    
    try {
      // Apagar mensagem ao invés de editar
      await bot.deleteMessage(chatId, messageId);
      console.log(`Mensagem desatualizada ${messageId} apagada com sucesso após tentativa de uso`);
    } catch (err) {
      console.log(`Não foi possível apagar mensagem ${messageId}: ${err.message}`);
    }
    
    return;
  }
  
  // Extrair ação e número da conversão
  const [actionType, conversaoNumberStr] = action.split('_');
  const conversaoNumber = parseInt(conversaoNumberStr);
  
  if (actionType === 'usar') {
    // Verificar se a conversão está disponível
    if (conversaoUsage.has(conversaoNumber)) {
      const usage = conversaoUsage.get(conversaoNumber);
      await bot.answerCallbackQuery(callbackQuery.id, {
        text: `❌ Conversão ${conversaoNumber} já está sendo usada por @${usage.username}.`,
        show_alert: true
      });
      return;
    }
    
    // Marcar a conversão como em uso
    conversaoUsage.set(conversaoNumber, {
      username,
      userId,
      timestamp: Date.now()
    });
    
    // Salvar os dados
    saveUsageData();
    
    // Notificar o usuário
    await bot.answerCallbackQuery(callbackQuery.id, {
      text: `✅ Você está usando a Conversão ${conversaoNumber}.`,
      show_alert: false
    });
    
    try {
      // Atualizar a mensagem com os novos botões (sem consultar API)
      await updateConvMessage(chatId, messageId, false);
    } catch (error) {
      console.error('Erro ao atualizar mensagem após usar conversão:', error);
    }
  }
  
  else if (actionType === 'liberar') {
    // Verificar se a conversão está em uso
    const usage = conversaoUsage.get(conversaoNumber);
    if (!usage) {
      await bot.answerCallbackQuery(callbackQuery.id, {
        text: `❌ Conversão ${conversaoNumber} não está em uso.`,
        show_alert: true
      });
      return;
    }
    
    // Verificar se o usuário tem permissão para liberar
    // Permite o próprio usuário ou administradores/donos de grupo
    let canRelease = usage.userId === userId;
    
    // Se não for o próprio usuário, verifica se é admin ou dono do grupo
    if (!canRelease && msg.chat.type !== 'private') {
      try {
        const chatMember = await bot.getChatMember(chatId, userId);
        canRelease = ['creator', 'administrator'].includes(chatMember.status);
      } catch (error) {
        console.error('Erro ao verificar status de admin:', error);
      }
    }
    
    if (!canRelease) {
      await bot.answerCallbackQuery(callbackQuery.id, {
        text: `❌ Apenas o usuário @${usage.username} ou administradores podem liberar esta conversão.`,
        show_alert: true
      });
      return;
    }
    
    // Liberar a conversão
    conversaoUsage.delete(conversaoNumber);
    
    // Salvar os dados
    saveUsageData();
    
    // Notificar o usuário
    await bot.answerCallbackQuery(callbackQuery.id, {
      text: `✅ Conversão ${conversaoNumber} liberada com sucesso.`,
      show_alert: false
    });
    
    try {
      // Atualizar a mensagem com os novos botões (sem consultar API)
      await updateConvMessage(chatId, messageId, false);
    } catch (error) {
      console.error('Erro ao atualizar mensagem após liberar conversão:', error);
    }
  }
});

// Função para verificar e invalidar menus antigos
function invalidateOldMenus() {
  console.log('Verificando menus antigos para invalidar...');
  const MENU_LIFETIME_MS = 24 * 60 * 60 * 1000; // 24 horas
  const STATUS_LIFETIME_MS = 24 * 60 * 60 * 1000; // 24 horas para mensagens de status
  const now = Date.now();
  
  // Verificar e remover menus antigos
  for (const [chatId, menuData] of oldConvMessages.entries()) {
    // Verificar se o menu está ativo há mais de 24 horas
    if (now - menuData.timestamp > MENU_LIFETIME_MS) {
      try {
        // Apagar menu antigo ao invés de editá-lo
        bot.deleteMessage(chatId, menuData.messageId);
        
        // Remover da lista de menus ativos
        oldConvMessages.delete(chatId);
        
        console.log(`Menu ${menuData.messageId} do chat ${chatId} apagado por tempo de inatividade (24h)`);
      } catch (err) {
        console.log(`Erro ao apagar menu ${menuData.messageId}: ${err.message}`);
        // Se não conseguir apagar a mensagem, pode ser que ela não exista mais
        // Nesse caso, removemos da lista de qualquer forma
        oldConvMessages.delete(chatId);
      }
    }
  }
  
  // Verificar e remover mensagens de status antigas
  for (const [chatId, statusData] of oldStatusMessages.entries()) {
    // Verificar se a mensagem de status está ativa há mais de 24 horas
    if (now - statusData.timestamp > STATUS_LIFETIME_MS) {
      try {
        // Apagar mensagem de status antiga
        bot.deleteMessage(chatId, statusData.messageId);
        
        // Remover da lista de mensagens de status
        oldStatusMessages.delete(chatId);
        
        console.log(`Mensagem de status ${statusData.messageId} do chat ${chatId} apagada por tempo de inatividade (24h)`);
      } catch (err) {
        console.log(`Erro ao apagar mensagem de status ${statusData.messageId}: ${err.message}`);
        // Se não conseguir apagar a mensagem, pode ser que ela não exista mais
        // Nesse caso, removemos da lista de qualquer forma
        oldStatusMessages.delete(chatId);
      }
    }
  }
}

// Agendar a verificação a cada hora
setInterval(invalidateOldMenus, 60 * 60 * 1000); // 1 hora

// Função para formatar o tempo de uso
function formatTimeUsed(timestamp) {
  const now = Date.now();
  const diffMs = now - timestamp;
  
  // Cálculo das diferentes unidades de tempo
  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  
  // Formatação com a unidade mais apropriada
  if (years > 0) {
    return `${years}a`; // Anos
  } else if (months > 0) {
    return `${months}m`; // Meses
  } else if (weeks > 0) {
    return `${weeks}sem`; // Semanas
  } else if (days > 0) {
    return `${days}d`; // Dias
  } else if (hours > 0) {
    return `${hours}h`; // Horas
  } else {
    return `${minutes}min`; // Minutos
  }
}

// Função para tentar apagar a mensagem de comando se o bot for admin
async function tryDeleteCommandMessage(msg) {
  // Não apaga mensagens em chats privados
  if (msg.chat.type === 'private') {
    return;
  }
  
  try {
    // Verificar se o bot é administrador no grupo
    const botId = (await bot.getMe()).id;
    const botMember = await bot.getChatMember(msg.chat.id, botId);
    
    // Se o bot for admin ou criador, apaga a mensagem de comando
    if (['administrator', 'creator'].includes(botMember.status)) {
      await bot.deleteMessage(msg.chat.id, msg.message_id);
      console.log(`Mensagem de comando ${msg.message_id} apagada (bot é admin)`);
    }
  } catch (err) {
    console.log(`Não foi possível verificar status de admin do bot ou apagar mensagem: ${err.message}`);
  }
}

// Comando para verificar apenas o status de uso (sem consultar as bases)
bot.onText(/^\/status$/, async (msg) => {
  const chatId = msg.chat.id;
  
  // Tentar apagar a mensagem de comando se o bot for admin
  await tryDeleteCommandMessage(msg);
  
  // Recarrega os dados do arquivo antes de mostrar o status
  // Limpar o Map antes de recarregar para garantir que remova conversões que foram liberadas
  conversaoUsage.clear();
  loadUsageData();
  
  // Apagar mensagem anterior de status, se existir
  if (oldStatusMessages.has(chatId)) {
    const oldStatusData = oldStatusMessages.get(chatId);
    try {
      await bot.deleteMessage(chatId, oldStatusData.messageId);
      console.log(`Mensagem de status antiga ${oldStatusData.messageId} apagada com sucesso`);
    } catch (err) {
      console.log(`Não foi possível apagar mensagem de status ${oldStatusData.messageId}: ${err.message}`);
    }
  }
  
  let message = '*Status atual das conversões:*\n\n';
  
  if (conversaoUsage.size === 0) {
    // Enviar mensagem e salvar referência
    const sentMsg = await bot.sendMessage(chatId, '✅ Todas as conversões estão disponíveis.', { parse_mode: 'Markdown' });
    
    // Salvar referência da nova mensagem de status
    oldStatusMessages.set(chatId, {
      messageId: sentMsg.message_id,
      timestamp: Date.now()
    });
    
    return;
  }
  
  for (const [conversaoNumber, usage] of conversaoUsage.entries()) {
    const timeFormatted = formatTimeUsed(usage.timestamp);
    message += `Conversão ${conversaoNumber}: 🔒 Em uso por @${usage.username} (há ${timeFormatted})\n`;
  }
  
  // Enviar mensagem e salvar referência
  const sentMsg = await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  
  // Salvar referência da nova mensagem de status
  oldStatusMessages.set(chatId, {
    messageId: sentMsg.message_id,
    timestamp: Date.now()
  });
});

// Comando de ajuda
bot.onText(/^\/help$/, async (msg) => {
  const chatId = msg.chat.id;
  const isPrivateChat = msg.chat.type === 'private';
  
  // Tentar apagar a mensagem de comando se o bot for admin
  await tryDeleteCommandMessage(msg);
  
  let helpMessage = `
*Comandos disponíveis:*\n`;

  if (isPrivateChat) {
    helpMessage += `
/status - Mostra o status de uso atual das conversões
/help - Mostra esta mensagem de ajuda

*Observação:*
O comando /conv só está disponível em grupos.
`;
  } else {
    helpMessage += `
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
  }
  
  bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
});

console.log('Bot iniciado com sucesso!');

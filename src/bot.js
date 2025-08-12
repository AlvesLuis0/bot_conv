import dotenv from 'dotenv';
dotenv.config();

import TelegramBot from 'node-telegram-bot-api';
import { SessionManager } from './services/session-manager.js';
import { Authenticator } from './services/authenticator.js';
import { RequestSigner } from './services/request-signer.js';
import { Endpoint } from './services/endpoint.js';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Token do seu bot
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// Sistema de controle de uso das conversões
const conversaoUsage = new Map(); // conversaoNumber -> { username, userId, timestamp }
const activeConvMessages = new Map(); // chatId -> { messageId, userId }
let cachedConversoes = []; // Cache global de conversões com seus nomes

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
  loadUsageData();
  
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
  
  const loadingMsg = await bot.sendMessage(chatId, 'Consultando conversões, aguarde...');
  
  try {
    // Busca os nomes das conversões (sempre consulta as APIs)
    await updateConvMessage(chatId, loadingMsg.message_id, true);
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

// Comando para verificar apenas o status de uso (sem consultar as bases)
bot.onText(/^\/status$/, async (msg) => {
  const chatId = msg.chat.id;
  
  // Recarrega os dados do arquivo antes de mostrar o status
  loadUsageData();
  
  if (conversaoUsage.size === 0) {
    bot.sendMessage(chatId, '✅ Todas as conversões estão disponíveis.');
    return;
  }
  
  let message = '*Status atual das conversões:*\n\n';
  
  for (const [conversaoNumber, usage] of conversaoUsage.entries()) {
    const timeUsed = Math.floor((Date.now() - usage.timestamp) / (1000 * 60)); // minutos
    message += `Conversão ${conversaoNumber}: 🔒 Em uso por @${usage.username} (há ${timeUsed}min)\n`;
  }
  
  bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
});

// Comando de ajuda
bot.onText(/^\/help$/, async (msg) => {
  const chatId = msg.chat.id;
  const helpMessage = `
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
  
  bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
});

console.log('Bot iniciado com sucesso!');

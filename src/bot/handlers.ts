import TelegramBot from 'node-telegram-bot-api';
import db from './db';
import { continueProgram } from "../index";
import { get } from 'http';
import { UserContext } from "../utils/handlers/UserContext";

export const userKeyState = new Map<number, {
  api_key: string;
}>();

export const userState = new Map<number, UserState>();

export type UserState = {
  editingFieldService?: keyof CServiceData;
  CServiceData: CServiceData;
  editingFieldBuy?: keyof CBuyData;
  CBuyData: CBuyData;
  editingFieldSell?: keyof CSellData;
  CSellData: CSellData;
  editingFieldRug?: keyof CRugData;
  CRugData: CRugData;
  messageId?: number;
};

export type UserData = {
  user_id: number;
  name: string;
  username: string;
  api_key: string;
  status: boolean;
  created_at: string;
  updated_at: string;
};

export type CBuyData = {
  amount: string;
};

export type CSellData = {
  enabled: number;
  stop_loss: string;
  take_profit: string;
};

export type CRugData = {
  mode: string;
  mint_authority: number;
  freeze_authority: number;
  allow_insider_topholders: number;
  percentage_top_holders: string;
  total_lp_providers: string;
  total_market_liquidity: string;
  total_markets: string;
  score: string;
};

export type CServiceData = {
  rpc_url: string;
  ws_url: string;
  api_key: string;
  wallet: string;
  pumpfun: number;
  raydium: number;
};

const defaultCServiceData: CServiceData = {
  rpc_url: '',
  ws_url: '',
  api_key: '',
  wallet: '',
  pumpfun: 1,
  raydium: 1,
};

const defaultCBuyData: CBuyData = {
  amount: '',
};

const defaultCSellData: CSellData = {
  enabled: 0,
  stop_loss: '',
  take_profit: '',
};

const defaultCRugData: CRugData = {
  mode: '',
  mint_authority: 0,
  freeze_authority: 0,
  allow_insider_topholders: 0,
  percentage_top_holders: '',
  total_lp_providers: '',
  total_market_liquidity: '',
  total_markets: '',
  score: '',
};

function getRandomChar(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 24; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function handleCommands(bot: TelegramBot) {
  bot.onText(/\/start/, async (msg) => {
    const data = {
      user_id: msg.from!.id,
      name: msg.from!.first_name,
      username: msg.from!.username,
      api_key: "firekey" + getRandomChar(),
      status: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    saveUser(msg.from!.id, data);
    const message = await bot.sendMessage(msg.chat.id, `
      <b>👋 Hello ${data.username}, Welcome!</b>

      <b>Please Request your api key to the <a href="https://t.me/lutfiharidha">ADMIN</a></b>

      <b>TOOLS:</b>
      <b><a href="https://www.helius.dev/">Helius</a> or <a href="https://www.quicknode.com/">Quicknode</a></b>
      <b><a href="https://www.sniperoo.app/signup?ref=85CMS4V4">Sniperoo</a></b>
      `, {
      parse_mode: 'HTML'
    });
  });

  bot.onText(/\/cservice/, async (msg) => {
    const userId = msg.from!.id;
    const chatId = msg.chat.id;
    if (validateToken(userId) === false) {
      await bot.sendMessage(chatId, '🚫 API KEY is not valid. please contact admin');
      return;
    }
    const userData = await getUserData(userId);
    const data = userData.cservice;
    userState.set(userId, {
      CServiceData: data,
      CBuyData: {
        amount: userData.cbuy.amount,
      },
      CSellData: {
        enabled: userData.csell.enabled,
        stop_loss: userData.csell.stop_loss,
        take_profit: userData.csell.take_profit,
      },
      CRugData: {
        mode: userData.crug.mode,
        mint_authority: userData.crug.mint_authority,
        freeze_authority: userData.crug.freeze_authority,
        allow_insider_topholders: userData.crug.allow_insider_topholders,
        percentage_top_holders: userData.crug.percentage_top_holders,
        total_lp_providers: userData.crug.total_lp_providers,
        total_market_liquidity: userData.crug.total_market_liquidity,
        score: userData.crug.score,
        total_markets: userData.crug.total_markets,
      },
    });

    const message = await bot.sendMessage(chatId, buildFormTextCServiceData(data), {
      reply_markup: {
        inline_keyboard: buildFormButtonsCServiceData(data)
      },
      parse_mode: 'HTML'
    });

    userState.get(userId)!.messageId = message.message_id;
  });

  bot.onText(/\/cbuy/, async (msg) => {
    const userId = msg.from!.id;
    const chatId = msg.chat.id;
    if (validateToken(userId) === false) {
      await bot.sendMessage(chatId, '🚫 API KEY is not valid. please contact admin');
      return;
    }
    const userData = await getUserData(userId);
    const data = userData.cbuy;
    userState.set(userId, {
      CServiceData: {
        rpc_url: userData.cservice.rpc_url,
        ws_url: userData.cservice.ws_url,
        api_key: userData.cservice.api_key,
        wallet: userData.cservice.wallet,
        pumpfun: userData.cservice.pumpfun,
        raydium: userData.cservice.raydium,
      },
      CBuyData: data,
      CSellData: {
        enabled: userData.csell.enabled,
        stop_loss: userData.csell.stop_loss,
        take_profit: userData.csell.take_profit,
      },
      CRugData: {
        mode: userData.crug.mode,
        mint_authority: userData.crug.mint_authority,
        freeze_authority: userData.crug.freeze_authority,
        allow_insider_topholders: userData.crug.allow_insider_topholders,
        percentage_top_holders: userData.crug.percentage_top_holders,
        total_lp_providers: userData.crug.total_lp_providers,
        total_market_liquidity: userData.crug.total_market_liquidity,
        score: userData.crug.score,
        total_markets: userData.crug.total_markets,
      },
    });

    const message = await bot.sendMessage(chatId, buildFormTextCBuyData(data), {
      reply_markup: {
        inline_keyboard: buildFormButtonsCBuyData(data)
      },
      parse_mode: 'HTML'
    });

    userState.get(userId)!.messageId = message.message_id;
  });

  bot.onText(/\/csell/, async (msg) => {
    const userId = msg.from!.id;
    const chatId = msg.chat.id;
    if (validateToken(userId) === false) {
      await bot.sendMessage(chatId, '🚫 API KEY is not valid. please contact admin');
      return;
    }
    const userData = await getUserData(userId);
    const data = userData.csell;
    userState.set(userId, {
      CServiceData: {
        rpc_url: userData.cservice.rpc_url,
        ws_url: userData.cservice.ws_url,
        api_key: userData.cservice.api_key,
        wallet: userData.cservice.wallet,
        pumpfun: userData.cservice.pumpfun,
        raydium: userData.cservice.raydium,
      },
      CBuyData: {
        amount: userData.cbuy.amount,
      },
      CSellData: data,
      CRugData: {
        mode: userData.crug.mode,
        mint_authority: userData.crug.mint_authority,
        freeze_authority: userData.crug.freeze_authority,
        allow_insider_topholders: userData.crug.allow_insider_topholders,
        percentage_top_holders: userData.crug.percentage_top_holders,
        total_lp_providers: userData.crug.total_lp_providers,
        total_market_liquidity: userData.crug.total_market_liquidity,
        score: userData.crug.score,
        total_markets: userData.crug.total_markets,
      },
    });

    const message = await bot.sendMessage(chatId, buildFormTextCSellData(data), {
      reply_markup: {
        inline_keyboard: buildFormButtonsCSellData(data)
      },
      parse_mode: 'HTML'
    });

    userState.get(userId)!.messageId = message.message_id;
  });

  bot.onText(/\/crug/, async (msg) => {
    const userId = msg.from!.id;
    const chatId = msg.chat.id;
    if (validateToken(userId) === false) {
      await bot.sendMessage(chatId, '🚫 API KEY is not valid. please contact admin');
      return;
    }
    const userData = await getUserData(userId);
    const data = userData.crug;
    userState.set(userId, {
      CServiceData: {
        rpc_url: userData.cservice.rpc_url,
        ws_url: userData.cservice.ws_url,
        api_key: userData.cservice.api_key,
        wallet: userData.cservice.wallet,
        pumpfun: userData.cservice.pumpfun,
        raydium: userData.cservice.raydium,
      },
      CBuyData: {
        amount: userData.cbuy.amount,
      },
      CSellData: {
        enabled: userData.csell.enabled,
        stop_loss: userData.csell.stop_loss,
        take_profit: userData.csell.take_profit,
      },
      CRugData: data,
    });

    const message = await bot.sendMessage(chatId, buildFormTextCRugData(data), {
      reply_markup: {
        inline_keyboard: buildFormButtonsCRugData(data)
      },
      parse_mode: 'HTML'
    });

    userState.get(userId)!.messageId = message.message_id;
  });


  bot.onText(/\/gobot/, async (msg) => {
    const userId = msg.from!.id;
    const chatId = msg.chat.id;
    const userdata = await getUserData(userId)
    const userContext = new UserContext(userId);

    if (userContext.isRunning) {
      await bot.sendMessage(chatId, '⏳ Bot already running.');
      return;
    }
    if (!userdata) {
      await bot.sendMessage(chatId, '🚫 User not found in the database.');
      return;
    }
    const isComplete = isUserStateComplete(userId);
    if (!isComplete) {
      await bot.sendMessage(chatId, '🚫 Please complete your Settings first, check your setting (/cinfo)');
      return;
    }

    // Validasi API key
    if (!validateToken(userId)) {
      await bot.sendMessage(chatId, '🚫 API KEY is not valid. please contact admin');
      return;
    }
    userContext.isRunning = true;
    await continueProgram(userContext);
    await bot.sendMessage(chatId, 'Bot is running, please wait for the result, it may take a while, be patient! For stop the bot, please use /stopbot command');
  });


  bot.onText(/\/cinfo/, async (msg) => {
    const userId = msg.from!.id;
    const chatId = msg.chat.id;
    if (validateToken(userId) === false) {
      await bot.sendMessage(chatId, '🚫 API KEY is not valid. please contact admin');
      return;
    }
    const userData = await getUserData(userId);

    const message = await bot.sendMessage(msg.chat.id, `
<b>🛠️ Service Config (/cservice)</b>
🔗 <b>RPC URL:</b> ${userData?.cservice.rpc_url || '<i>belum diisi</i>'}
🌐 <b>WS URL:</b> ${userData?.cservice.ws_url || '<i>belum diisi</i>'}
🔑 <b>API Key:</b> ${userData?.cservice.api_key || '<i>belum diisi</i>'}
💼 <b>Wallet:</b> ${userData?.cservice.wallet || '<i>belum diisi</i>'}
🏦 <b>Pumpfun:</b> ${userData?.cservice.pumpfun === 1 ? '✅' : '❌'}
🏦 <b>Raydium:</b> ${userData?.cservice.raydium === 1 ? '✅' : '❌'}


<b>🛠️ Buy Config (/cbuy)</b>
🪙 <b>AMOUNT:</b> ${userData?.cbuy.amount || '<i>belum diisi</i>'}


<b>🛠️ Sell Config (/csell)</b>
🤖 <b>AUTO SELL:</b> ${userData?.csell.enabled === 1 ? '✅' : '❌'}
📉 <b>STOP LOSS:</b> ${userData?.csell.stop_loss || '<i>belum diisi</i>'}
💰 <b>TAKE PROFIT:</b> ${userData?.csell.take_profit || '<i>belum diisi</i>'}


<b>🛠️ Rug Config (/crug)</b>
⚖️ <b>STRICT MODE:</b>${userData?.crug.mode || '<i>belum diisi</i>'}
⚒️ <b>MINT AUTHORITY:</b> ${userData?.crug.mint_authority === 1 ? '✅' : '❌'}
❄️ <b>FREEZE AUTHORITY:</b> ${userData?.crug.freeze_authority === 1 ? '✅' : '❌'}
👑 <b>ALLOW INSIDER TOP HOLDERS:</b> ${userData?.crug.allow_insider_topholders === 1 ? '✅' : '❌'}
🏅 <b>TOP HOLDERS:</b> ${userData?.crug.percentage_top_holders || '<i>belum diisi</i>'}
🌍 <b>LP PROVIDERS:</b> ${userData?.crug.total_lp_providers || '<i>belum diisi</i>'}
💰 <b>MARKET LIQUIDITY:</b> ${userData?.crug.total_market_liquidity || '<i>belum diisi</i>'}
📈 <b>MARKETS:</b> ${userData?.crug.total_markets || '<i>belum diisi</i>'}
🏆 <b>SCORE:</b> ${userData?.crug.score || '<i>belum diisi</i>'}
      `, {
      parse_mode: 'HTML'
    });
  });


  bot.onText(/\/stopbot/, async (msg) => {
    const userId = msg.from!.id;
    const chatId = msg.chat.id;
    if (validateToken(userId) === false) {
      await bot.sendMessage(chatId, '🚫 API KEY is not valid. please contact admin');
      return;
    }

    const userContext = new UserContext(userId);
    userContext.isRunning = false;
    await bot.sendMessage(chatId, '🛑 Bot is stopped, you can start it again with /gobot command');
  });

  bot.on('callback_query', async (query) => {
    const userId = query.from.id;
    const chatId = query.message!.chat.id;
    const messageId = query.message!.message_id;
    const action = query.data!;

    if (action.startsWith('edit_cservice_')) {
      const getServiceState = userState.get(userId);
      if (!getServiceState) return;

      const dataService = getServiceState.CServiceData;

      if (action.includes('toggle_pumpfun') || action.includes('toggle_raydium')) {
        const field = action === 'edit_cservice_toggle_pumpfun' ? 'pumpfun' : 'raydium';

        // Toggle value
        dataService[field] = dataService[field] === 1 ? 0 : 1;

        // Auto-save
        saveToDatabase(userId, 'cservice', getServiceState.CServiceData);

        // Update tampilan
        await bot.editMessageText(buildFormTextCServiceData(getServiceState.CServiceData), {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: {
            inline_keyboard: buildFormButtonsCServiceData(getServiceState.CServiceData)
          },
          parse_mode: 'HTML'
        });
        return;
      }

      const field = action.replace('edit_cservice_', '') as keyof CServiceData;
      getServiceState.editingFieldService = field;
      await bot.sendMessage(chatId, `📝 Masukkan nilai untuk <b>${field}</b>:`, {
        parse_mode: 'HTML',
        reply_markup: { force_reply: true }
      });
    }

    if (action.startsWith('edit_cbuy_')) {
      const getBuyState = userState.get(userId);
      if (!getBuyState) return;
      const field = action.replace('edit_cbuy_', '') as keyof CBuyData;
      getBuyState.editingFieldBuy = field;
      await bot.sendMessage(chatId, `📝 Masukkan nilai untuk <b>${field}</b>:`, {
        parse_mode: 'HTML',
        reply_markup: { force_reply: true }
      });
    }


    if (action.startsWith('edit_csell_')) {
      const getSellState = userState.get(userId);
      if (!getSellState) return;

      const dataService = getSellState.CSellData;

      if (action.includes('toggle_enabled')) {

        // Toggle value
        dataService['enabled'] = dataService['enabled'] === 1 ? 0 : 1;

        // Auto-save
        saveToDatabase(userId, 'csell', getSellState.CSellData);

        // Update tampilan
        await bot.editMessageText(buildFormTextCSellData(getSellState.CSellData), {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: {
            inline_keyboard: buildFormButtonsCSellData(getSellState.CSellData)
          },
          parse_mode: 'HTML'
        });
        return;
      }


      const field = action.replace('edit_csell_', '') as keyof CSellData;
      getSellState.editingFieldSell = field;
      await bot.sendMessage(chatId, `📝 Masukkan nilai untuk <b>${field}</b>:`, {
        parse_mode: 'HTML',
        reply_markup: { force_reply: true }
      });
    }

    if (action.startsWith('edit_crug_')) {
      const getRugState = userState.get(userId);
      if (!getRugState) return;

      const dataService = getRugState.CRugData;

      if (action.includes('toggle_allow_insider_topholders') || action.includes('toggle_mint_authority') || action.includes('toggle_freeze_authority')) {
        switch (action) {
          case 'edit_crug_toggle_mint_authority':
            dataService['mint_authority'] = dataService['mint_authority'] === 1 ? 0 : 1;
            break;
          case 'edit_crug_toggle_freeze_authority':
            dataService['freeze_authority'] = dataService['freeze_authority'] === 1 ? 0 : 1;
            break;
          case 'edit_crug_toggle_allow_insider_topholders':
            dataService['allow_insider_topholders'] = dataService['allow_insider_topholders'] === 1 ? 0 : 1;
            break;
        }
        // Toggle value

        // Auto-save
        saveToDatabase(userId, 'crug', getRugState.CRugData);

        // Update tampilan
        await bot.editMessageText(buildFormTextCRugData(getRugState.CRugData), {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: {
            inline_keyboard: buildFormButtonsCRugData(getRugState.CRugData)
          },
          parse_mode: 'HTML'
        });
        return;
      }

      const field = action.replace('edit_crug_', '') as keyof CRugData;
      getRugState.editingFieldRug = field;
      await bot.sendMessage(chatId, `📝 Masukkan nilai untuk <b>${field}</b>:`, {
        parse_mode: 'HTML',
        reply_markup: { force_reply: true }
      });
    }

    await bot.answerCallbackQuery(query.id);
  });

  bot.on('message', async (msg) => {
    const userId = msg.from!.id;
    const chatId = msg.chat.id;

    if (msg.text?.includes('firekey')) {
      const userData = await getUserInfo(userId);
      if (!userData) {
        await bot.sendMessage(chatId, '🚫 User not found in the database.');
        return;
      }
      if (userData.api_key !== msg.text) {
        await bot.sendMessage(chatId, `🚫 API KEY isn't valid. please contact admin`);
        return;
      }
      await bot.sendMessage(chatId, `✅ API KEY is valid. You can use the bot now!`);
      userKeyState.set(userId, {
        api_key: msg.text
      });
    }

    if (!msg.reply_to_message || msg.text?.startsWith('/')) return;

    const state = userState.get(userId);


    if (!state) return;

    if (state.editingFieldService) {
      const field = state.editingFieldService;
      const value = msg.text!;
      if (value === state.CServiceData[field]) return;
      if (field === 'pumpfun' || field === 'raydium') {
        const lowered = value.toLowerCase();
        if (lowered === 'true' || lowered === 'ya' || lowered === 'yes') {
          state.CServiceData[field] = 1;
        } else {
          state.CServiceData[field] = 0;
        }
      } else {
        if (field) {
          state.CServiceData[field] = value;
        }
      }

      state.editingFieldService = undefined;
      saveToDatabase(userId, 'cservice', state.CServiceData);
      await bot.editMessageText(buildFormTextCServiceData(state.CServiceData), {
        chat_id: chatId,
        message_id: state.messageId,
        reply_markup: {
          inline_keyboard: buildFormButtonsCServiceData(state.CServiceData)
        },
        parse_mode: 'HTML'
      });
      return
    } else if (state.editingFieldBuy) {
      const field = state.editingFieldBuy;
      const value = msg.text!;
      if (value === state.CBuyData[field]) return;
      if (field) {
        state.CBuyData[field] = value;
      }

      state.editingFieldBuy = undefined;
      saveToDatabase(userId, 'cbuy', state.CBuyData);
      await bot.editMessageText(buildFormTextCBuyData(state.CBuyData), {
        chat_id: chatId,
        message_id: state.messageId,
        reply_markup: {
          inline_keyboard: buildFormButtonsCBuyData(state.CBuyData)
        },
        parse_mode: 'HTML'
      });
      return
    } else if (state.editingFieldSell) {
      const field = state.editingFieldSell;
      const value = msg.text!;
      if (value === state.CSellData[field]) return;
      if (field === 'enabled') {
        const lowered = value.toLowerCase();
        if (lowered === 'true' || lowered === 'ya' || lowered === 'yes') {
          state.CSellData[field] = 1;
        } else {
          state.CSellData[field] = 0;
        }
      } else {
        if (field) {
          state.CSellData[field] = value;
        }
      }

      state.editingFieldSell = undefined;
      saveToDatabase(userId, 'csell', state.CSellData);
      await bot.editMessageText(buildFormTextCSellData(state.CSellData), {
        chat_id: chatId,
        message_id: state.messageId,
        reply_markup: {
          inline_keyboard: buildFormButtonsCSellData(state.CSellData)
        },
        parse_mode: 'HTML'
      });
      return
    } else if (state.editingFieldRug) {
      const field = state.editingFieldRug;
      const value = msg.text!;
      if (value === state.CRugData[field]) return;
      if (field === 'mint_authority' || field === 'freeze_authority' || field === 'allow_insider_topholders') {
        const lowered = value.toLowerCase();
        if (lowered === 'true' || lowered === 'ya' || lowered === 'yes') {
          state.CRugData[field] = 1;
        } else {
          state.CRugData[field] = 0;
        }
      } else {
        if (field) {
          state.CRugData[field] = value;
        }
      }
      state.editingFieldRug = undefined;
      saveToDatabase(userId, 'crug', state.CRugData);
      await bot.editMessageText(buildFormTextCRugData(state.CRugData), {
        chat_id: chatId,
        message_id: state.messageId,
        reply_markup: {
          inline_keyboard: buildFormButtonsCRugData(state.CRugData)
        },
        parse_mode: 'HTML'
      });
      return
    }

  });
}

function buildFormTextCServiceData(data: CServiceData): string {
  return `<b>🛠️ Konfigurasi Service</b>

🔗 <b>RPC URL:</b> ${data.rpc_url || '<i>belum diisi</i>'}

🌐 <b>WS URL:</b> ${data.ws_url || '<i>belum diisi</i>'}

🔑 <b>API Key:</b> ${data.api_key || '<i>belum diisi</i>'}

💼 <b>Wallet:</b> ${data.wallet || '<i>belum diisi</i>'}

🏦 <b>Pumpfun:</b> ${data.pumpfun === 1 ? 'ACTIVE' : 'NOT ACTIVE'}

🏦 <b>Raydium:</b> ${data.raydium === 1 ? 'ACTIVE' : 'NOT ACTIVE'}
`
}

function buildFormTextCBuyData(data: CBuyData): string {
  return `<b>🛠️ Konfigurasi Buy</b>

🪙 <b>AMOUNT:</b> ${data.amount || '<i>belum diisi</i>'}
`
}


function buildFormTextCSellData(data: CSellData): string {
  return `<b>🛠️ Konfigurasi Buy</b>

🤖 <b>AUTO SELL:</b> ${data.enabled === 1 ? 'ACTIVE' : 'NOT ACTIVE'}

📉 <b>STOP LOSS:</b> ${data.stop_loss || '<i>belum diisi</i>'}

💰 <b>TAKE PROFIT:</b> ${data.take_profit || '<i>belum diisi</i>'}
`
}


function buildFormTextCRugData(data: CRugData): string {
  return `<b>🛠️ Konfigurasi Buy</b>

⚖️ <b>STRICT MODE:</b>${data.mode || '<i>belum diisi</i>'}

⚒️ <b>MINT AUTHORITY:</b> ${data.mint_authority === 1 ? 'ACTIVE' : 'NOT ACTIVE'}

❄️ <b>FREEZE AUTHORITY:</b> ${data.freeze_authority === 1 ? 'ACTIVE' : 'NOT ACTIVE'}

👑 <b>ALLOW INSIDER TOP HOLDERS:</b> ${data.allow_insider_topholders === 1 ? 'ACTIVE' : 'NOT ACTIVE'}

🏅 <b>TOP HOLDERS:</b> ${data.percentage_top_holders || '<i>belum diisi</i>'}

🌍 <b>LP PROVIDERS:</b> ${data.total_lp_providers || '<i>belum diisi</i>'}

💧 <b>MARKET LIQUIDITY:</b> ${data.total_market_liquidity || '<i>belum diisi</i>'}

📊 <b>MARKET:</b> ${data.total_markets || '<i>belum diisi</i>'}

💯 <b>SCORE:</b> ${data.score || '<i>belum diisi</i>'}
`
}

function buildFormButtonsCServiceData(data: CServiceData): TelegramBot.InlineKeyboardButton[][] {
  return [
    [
      { text: '✏️ RPC', callback_data: 'edit_cservice_rpc_url' },
      { text: '✏️ WS', callback_data: 'edit_cservice_ws_url' }
    ],
    [
      { text: '✏️ API Key', callback_data: 'edit_cservice_api_key' },
      { text: '✏️ Wallet', callback_data: 'edit_cservice_wallet' }
    ],
    [
      { text: `${data.pumpfun ? '✅' : '❌'} PumpFun`, callback_data: 'edit_cservice_toggle_pumpfun' },
      { text: `${data.raydium ? '✅' : '❌'} Raydium`, callback_data: 'edit_cservice_toggle_raydium' }
    ]
  ];
}

function buildFormButtonsCBuyData(data: CBuyData): TelegramBot.InlineKeyboardButton[][] {
  return [
    [
      { text: '✏️ Amount', callback_data: 'edit_cbuy_amount' },
    ]
  ];
}

function buildFormButtonsCSellData(data: CSellData): TelegramBot.InlineKeyboardButton[][] {
  return [
    [
      { text: `${data.enabled ? '✅' : '❌'} Auto Sell`, callback_data: 'edit_csell_toggle_enabled' },
    ],
    [
      { text: '✏️ Stop Loss', callback_data: 'edit_csell_stop_loss' },
      { text: '✏️ Take Profit', callback_data: 'edit_csell_take_profit' },
    ]
  ];
}


function buildFormButtonsCRugData(data: CRugData): TelegramBot.InlineKeyboardButton[][] {
  return [
    [
      { text: '✏️ Strict Mode', callback_data: 'edit_crug_mode' },

    ],
    [
      { text: `${data.mint_authority ? '✅' : '❌'} Mint Authority`, callback_data: 'edit_crug_toggle_mint_authority' },
      { text: `${data.freeze_authority ? '✅' : '❌'} Freeze Authority`, callback_data: 'edit_crug_toggle_freeze_authority' },

    ],
    [
      { text: `${data.allow_insider_topholders ? '✅' : '❌'} Insider Top Holders`, callback_data: 'edit_crug_toggle_allow_insider_topholders' },
      { text: '✏️ Top Holders', callback_data: 'edit_crug_percentage_top_holders' }
    ],
    [
      { text: '✏️ LP Providers', callback_data: 'edit_crug_total_lp_providers' },
      { text: '✏️ Market Liquidity', callback_data: 'edit_crug_total_market_liquidity' }
    ],
    [
      { text: '✏️ Market', callback_data: 'edit_crug_total_markets' },
      { text: '✏️ Score', callback_data: 'edit_crug_score' }
    ]
  ];
}

async function getUserData(userId: number): Promise<any> {
  const data = {
    userId,
    cservice: await getCServiceData(userId),
    cbuy: await getCBuyData(userId),
    csell: await getCSellData(userId),
    crug: await getCRugData(userId),
  }
  userState.set(userId, {
    CServiceData: data.cservice,
    CBuyData: data.cbuy,
    CSellData: data.csell,
    CRugData: data.crug,
  })
  return data;
}
async function getCServiceData(userId: number): Promise<CServiceData> {
  return new Promise((resolve) => {
    db.get(
      'SELECT * FROM cservice WHERE user_id = ?',
      [userId],
      (err, row: CServiceData) => {
        if (row) {
          resolve({
            rpc_url: row.rpc_url,
            ws_url: row.ws_url,
            api_key: row.api_key,
            wallet: row.wallet,
            pumpfun: row.pumpfun,
            raydium: row.raydium,
          });
        } else {
          resolve({ ...defaultCServiceData });
        }
      }
    );
  });
}

async function getCBuyData(userId: number): Promise<CBuyData> {
  return new Promise((resolve) => {
    db.get(
      'SELECT * FROM cbuy WHERE user_id = ?',
      [userId],
      (err, row: CBuyData) => {
        if (row) {
          resolve({
            amount: row.amount,
          });
        } else {
          resolve({ ...defaultCBuyData });
        }
      }
    );
  });
}

async function getCSellData(userId: number): Promise<CSellData> {
  return new Promise((resolve) => {
    db.get(
      'SELECT * FROM csell WHERE user_id = ?',
      [userId],
      (err, row: CSellData) => {
        if (row) {
          resolve({
            enabled: row.enabled,
            stop_loss: row.stop_loss,
            take_profit: row.take_profit,
          });
        } else {
          resolve({ ...defaultCSellData });
        }
      }
    );
  });
}

async function getCRugData(userId: number): Promise<CRugData> {
  return new Promise((resolve) => {
    db.get(
      'SELECT * FROM crug WHERE user_id = ?',
      [userId],
      (err, row: CRugData) => {
        if (row) {
          resolve({
            mode: row.mode,
            mint_authority: row.mint_authority,
            freeze_authority: row.freeze_authority,
            allow_insider_topholders: row.allow_insider_topholders,
            percentage_top_holders: row.percentage_top_holders.toString(),
            total_lp_providers: row.total_lp_providers.toString(),
            total_market_liquidity: row.total_market_liquidity.toString(),
            score: row.score.toString(),
            total_markets: row.total_markets.toString()
          });
        } else {
          resolve({ ...defaultCRugData });
        }
      }
    );
  });
}

function saveToDatabase(userId: number, table: string, data: any) {
  const keys = Object.keys(data);
  const placeholders = keys.map(() => '?').join(',');
  const updates = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => (data as any)[k]);

  db.run(
    `INSERT INTO ${table} (user_id, ${keys.join(', ')})
     VALUES (?, ${placeholders})
     ON CONFLICT(user_id) DO UPDATE SET ${updates}`,
    [userId, ...values, ...values]
  );
}


function saveUser(userId: number, data: any) {
  const keys = Object.keys(data);
  const placeholders = keys.map(() => '?').join(',');
  const values = keys.map(k => (data as any)[k]);

  db.get(`SELECT 1 FROM users WHERE user_id = ?`, [userId], (err, row) => {
    if (err) {
      console.error('DB error:', err);
      return;
    }

    if (row) {
      // Sudah ada, tidak lakukan apa-apa
      console.log(`User ${userId} already exists. Skipping insert.`);
      return;
    }

    // Belum ada, lakukan INSERT
    db.run(
      `INSERT INTO users (user_id, ${keys.join(', ')})
       VALUES (?, ${placeholders})`,
      [userId, ...values],
      (err) => {
        if (err) console.error('Insert error:', err);
        else console.log(`User ${userId} saved.`);
      }
    );
  });
}

async function getUserInfo(userId: number): Promise<UserData> {
  return new Promise((resolve) => {
    db.get(
      'SELECT * FROM users WHERE user_id = ? AND status = 1',
      [userId],
      (err, row: UserData) => {
        if (row) {
          resolve({
            user_id: row.user_id,
            name: row.name,
            username: row.username,
            api_key: row.api_key,
            status: row.status,
            created_at: row.created_at,
            updated_at: row.updated_at,
          });
        }
      }
    );
  });
}

function validateToken(userid: number): boolean {
  const key = userKeyState.get(userid)?.api_key;
  if (!key) {
    return false;
  }
  return true;
}

function isObjectFilled(obj: Record<string, any>, requiredFields: string[]): boolean {
  return requiredFields.every(field => obj[field] !== undefined && obj[field] !== null);
}

function isUserStateComplete(userId: number): boolean {
  const state = userState.get(userId);
  if (!state) return false;

  return (
    state.CServiceData && isObjectFilled(state.CServiceData, ['api_key', 'rpc_url', 'ws_url', 'wallet']) &&
    state.CBuyData && isObjectFilled(state.CBuyData, ['amount']) &&
    state.CSellData && isObjectFilled(state.CSellData, ['enabled', 'stop_loss', 'take_profit']) &&
    state.CRugData && isObjectFilled(state.CRugData, ['mode', 'mint_authority', 'freeze_authority', 'allow_insider_topholders', 'percentage_top_holders', 'total_lp_providers', 'total_market_liquidity', 'score', 'total_markets'])
  );
}
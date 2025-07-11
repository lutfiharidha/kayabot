import TelegramBot from 'node-telegram-bot-api';
import db from './db';
import { continueProgram } from "../index";
import { UserContext } from "../utils/handlers/UserContext";
import { getJakartaTime, getJakartaTime1month, getJakartaTime1year, getStartOfDayJakarta, mapFieldName } from "../utils/handlers/helper";
import { getFeeRecommendation } from '../utils/handlers/jitoHandler';
import { wsManagers } from '../utils/handlers/state';

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

export type UserActive = {
  user_id: number;
  status: boolean;
  last_active: string;
};

export type UserActiveDisplay = {
  username: string;
  status: boolean;
  last_active: string;
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

  bot.onText(/\/feedback(?:\s+(.+))?/, async () => {
    bot.sendMessage(732587267, `Any feedback? please send it to @lutfiharidha`)
  });

  bot.onText(/\/auser/, async (msg) => {
    const chatId = msg.chat.id;
    const senderId = msg.from!.id;

    if (senderId !== 732587267) {
      await bot.sendMessage(chatId, "🚫 Are you sure you're an ADMIN?!");
      await bot.sendMessage(732587267, `Sir, <b>@${msg.chat.username}</b> is trying to access the admin command! 

Command: <b>${msg.text}</b>`, {
        parse_mode: 'HTML',
      });
      return;
    }

    try {
      const user = await getUserActive();
      if (user !== null) {
        await bot.sendMessage(chatId, `Online User
${user.map((u) => `\n<b>${u.status ? "🟢" : "🔴"} @${u.username} ${u.last_active}</b>`).join("\n")}`, {
          parse_mode: 'HTML',
        });
      } else {
        await bot.sendMessage(chatId, `🚫 There's no user bos`);
      }
    } catch (err) {
      await bot.sendMessage(chatId, `🚫 Error: ${err}`);
    }

  });

  bot.onText(/\/euser(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const senderId = msg.from!.id;

    if (senderId !== 732587267) {
      await bot.sendMessage(chatId, "🚫 Are you sure you're an ADMIN?!");
      await bot.sendMessage(732587267, `Sir, <a href="https://t.me/${msg.chat.username}"><b>${msg.chat.username}</b></a> is trying to access the admin command! 

Command: <b>${msg.text}</b>`, {
        parse_mode: 'HTML',
      });
      return;
    }

    const query = match?.[1]?.trim(); // bisa ID atau username

    if (!query) {
      await bot.sendMessage(chatId, "⚠️ Gunakan format: /euser <username>");
      return;
    }
    try {
      const status = await toggleUserStatus(query);
      if (status !== null) {
        await bot.sendMessage(chatId, `${status === 1 ? '✅' : '❌'} User ${query} is now ${status === 1 ? "Active" : "Not Active"}!`);
      } else {
        await bot.sendMessage(chatId, `🚫 User ${query} not updated!`);
      }
    } catch (err) {
      await bot.sendMessage(chatId, `🚫 Error: ${err}`);
    }

  });

  bot.onText(/\/luser/, async (msg) => {
    const chatId = msg.chat.id;
    const senderId = msg.from!.id;

    if (senderId !== 732587267) {
      await bot.sendMessage(chatId, "🚫 Are you sure you're an ADMIN?!");
      await bot.sendMessage(732587267, `Sir, <b>@${msg.chat.username}</b> is trying to access the admin command! 

Command: <b>${msg.text}</b>`, {
        parse_mode: 'HTML',
      });
      return;
    }

    try {
      const user = await getUserList();
      if (user !== null) {
        await bot.sendMessage(chatId, `User List
${user.map((u) => `\n- <b>@${u.username} (${u.user_id})</b>
Status: ${u.status ? " ✅ Active" : "❌ Not Active"}
Created At: ${u.created_at}
Updated At: ${u.updated_at}
`).join('')}`, {
          parse_mode: 'HTML',
        });
      } else {
        await bot.sendMessage(chatId, `🚫 There's no user bos`);
      }
    } catch (err) {
      await bot.sendMessage(chatId, `🚫 Error: ${err}`);
    }

  });

  bot.onText(/\/guser(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const senderId = msg.from!.id;

    if (senderId !== 732587267) {
      await bot.sendMessage(chatId, "🚫 Are you sure you're an ADMIN?!");
      await bot.sendMessage(732587267, `Sir, <a href="https://t.me/${msg.chat.username}"><b>${msg.chat.username}</b></a> is trying to access the admin command! 

Command: <b>${msg.text}</b>`, {
        parse_mode: 'HTML',
      });
      return;
    }

    const query = match?.[1]?.trim();

    if (!query) {
      await bot.sendMessage(chatId, "⚠️ Gunakan format: /euser <username>");
      return;
    }
    try {
      const user = await getUserbyUsername(query);
      if (user !== null) {
        await bot.sendMessage(chatId, `<b>@${user.username} (${user.user_id})</b>
Status: ${user.status ? "Active" : "Not Active"}
API Key: ${user.api_key}
Created At: ${user.created_at}
Updated At: ${user.updated_at}
`, { parse_mode: 'HTML' });
      } else {
        await bot.sendMessage(chatId, `🚫 User ${query} not updated!`);
      }
    } catch (err) {
      await bot.sendMessage(chatId, `🚫 Error: ${err}`);
    }

  });

  bot.onText(/\/start/, async (msg) => {
    const data = {
      user_id: msg.from!.id,
      name: msg.from!.first_name,
      username: msg.from!.username,
      api_key: "firekey" + getRandomChar(),
      status: false,
      created_at: getJakartaTime(),
      updated_at: getJakartaTime1month(),
    };
    saveUser(msg.from!.id, data);
    const message = await bot.sendMessage(msg.chat.id, `
<b>👋 Hello ${data.username}, Welcome!</b>

<b>Please Request your api key to the <a href="https://t.me/lutfiharidha">DEVELOPER</a></b>

<b>TOOLS:</b>
<b><a href="https://www.helius.dev/">Helius</a> or <a href="https://www.quicknode.com/">Quicknode</a></b>
<b><a href="https://www.sniperoo.app/signup?ref=85CMS4V4">Sniperoo</a></b>`, {
      parse_mode: 'HTML'
    });
  });

  bot.onText(/\/cservice/, async (msg) => {
    const userId = msg.from!.id;
    const chatId = msg.chat.id;
    if (await validateToken(userId) === false) {
      await bot.sendMessage(chatId, '🚫 Your API Key is not valid or not active yet! Please contact Developer');
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
    if (await validateToken(userId) === false) {
      await bot.sendMessage(chatId, '🚫 Your API Key is not valid or not active yet! Please contact Developer');
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
    if (await validateToken(userId) === false) {
      await bot.sendMessage(chatId, '🚫 Your API Key is not valid or not active yet! Please contact Developer');
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
    if (await validateToken(userId) === false) {
      await bot.sendMessage(chatId, '🚫 Your API Key is not valid or not active yet! Please contact Developer');
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
      await bot.sendMessage(chatId, '🚫 Your API Key is not valid or not active yet! Please contact Developer');
      return;
    }
    const isComplete = isUserStateComplete(userId);
    if (!isComplete) {
      await bot.sendMessage(chatId, '🚫 Please complete your Settings first, check your setting (/cinfo)');
      return;
    }

    // Validasi API key
    if (!await validateToken(userId)) {
      await bot.sendMessage(chatId, '🚫 Your API Key is not valid or not active yet! Please contact Developer');
      return;
    }
    userContext.isRunning = true;
    await continueProgram(userContext);
    await upsertUserActive(chatId, true)
    await bot.sendMessage(chatId, 'Bot is running, please wait for the result, it may take a while, be patient! For stop the bot, please use /stopbot command');
  });

  bot.onText(/\/cinfo/, async (msg) => {
    const userId = msg.from!.id;
    const chatId = msg.chat.id;
    if (await validateToken(userId) === false) {
      await bot.sendMessage(chatId, '🚫 Your API Key is not valid or not active yet! Please contact Developer');
      return;
    }
    const userData = await getUserData(userId);

    const message = await bot.sendMessage(msg.chat.id, `
<b>🛠️ Service Config (/cservice)</b>
🔗 <b>RPC URL:</b> ${userData?.cservice.rpc_url || '<i>Not Filled</i>'}
🌐 <b>WS URL:</b> ${userData?.cservice.ws_url || '<i>Not Filled</i>'}
🔑 <b>API Key:</b> ${userData?.cservice.api_key || '<i>Not Filled</i>'}
💼 <b>Wallet:</b> ${userData?.cservice.wallet || '<i>Not Filled</i>'}
🏦 <b>Pumpfun:</b> ${userData?.cservice.pumpfun === 1 ? '✅' : '❌'}
🏦 <b>Raydium:</b> ${userData?.cservice.raydium === 1 ? '✅' : '❌'}


<b>🛠️ Buy Config (/cbuy)</b>
🪙 <b>AMOUNT:</b> ${userData?.cbuy.amount || '<i>Not Filled</i>'}


<b>🛠️ Sell Config (/csell)</b>
🤖 <b>AUTO SELL:</b> ${userData?.csell.enabled === 1 ? '✅' : '❌'}
📉 <b>STOP LOSS:</b> ${userData?.csell.stop_loss || '<i>Not Filled</i>'}
💰 <b>TAKE PROFIT:</b> ${userData?.csell.take_profit || '<i>Not Filled</i>'}


<b>🛠️ Rug Config (/crug)</b>
⚖️ <b>STRICT MODE:</b>${userData?.crug.mode || '<i>Not Filled</i>'}
⚒️ <b>MINT AUTHORITY:</b> ${userData?.crug.mint_authority === 1 ? '✅' : '❌'}
❄️ <b>FREEZE AUTHORITY:</b> ${userData?.crug.freeze_authority === 1 ? '✅' : '❌'}
👑 <b>ALLOW INSIDER TOP HOLDERS:</b> ${userData?.crug.allow_insider_topholders === 1 ? '✅' : '❌'}
🏅 <b>MAX SUPPLY PER HOLDER:</b> ${userData?.crug.percentage_top_holders || '<i>Not Filled</i>'}
🌍 <b>LP PROVIDERS:</b> ${userData?.crug.total_lp_providers || '<i>Not Filled</i>'}
💰 <b>MARKET LIQUIDITY:</b> ${userData?.crug.total_market_liquidity || '<i>Not Filled</i>'}
📈 <b>MARKETS:</b> ${userData?.crug.total_markets || '<i>Not Filled</i>'}
🏆 <b>SCORE:</b> ${userData?.crug.score || '<i>Not Filled</i>'}
      `, {
      parse_mode: 'HTML'
    });
  });

  bot.onText(/\/stopbot/, async (msg) => {
    const userId = msg.from!.id;
    const chatId = msg.chat.id;
    if (await validateToken(userId) === false) {
      await bot.sendMessage(chatId, '🚫 Your API Key is not valid or not active yet! Please contact Developer');
      return;
    }
    await validateDataUser(userId);

    const userContext = new UserContext(userId);
    const wsManager = wsManagers.get(userId);

    userContext.isRunning = false;
    if (wsManager) {
      wsManager.disconnect();
      wsManagers.delete(userId);
    }
    await upsertUserActive(chatId, false)
    await bot.sendMessage(chatId, '🛑 Bot is stopped, you can start it again with /gobot command');
  });

  bot.onText(/\/rfee/, async (msg) => {
    const userId = msg.from!.id;
    const chatId = msg.chat.id;
    if (await validateToken(userId) === false) {
      await bot.sendMessage(chatId, '🚫 Your API Key is not valid or not active yet! Please contact Developer');
      return;
    }
    await validateDataUser(userId);
    const userContext = new UserContext(userId);

    const fees = await getFeeRecommendation(userContext)

    bot.sendMessage(userId, `Rekomendasi Fees:

<b>Buy:</b> ${userContext.buyAmount} SOL
<b>TP:</b> ${userContext.takeProfit}% 

${fees.map(r => `<b>${r.tier}% Success</b>
  Fee Per Tx: ${r.feePerTx.toFixed(6)}
  Total Fee: ${r.totalFee.toFixed(6)}
  Net Profit: ${r.netProfit.toFixed(6)} 
  Profitable: ${r.isProfitable ? '✅' : '❌'}`).join("\n\n")}`,
      { parse_mode: "HTML" });
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
      await bot.sendMessage(chatId, `📝 Enter the value for <b>${mapFieldName(field)}</b>:`, {
        parse_mode: 'HTML',
        reply_markup: { force_reply: true }
      });
    }

    if (action.startsWith('edit_cbuy_')) {
      const getBuyState = userState.get(userId);
      if (!getBuyState) return;
      const field = action.replace('edit_cbuy_', '') as keyof CBuyData;
      getBuyState.editingFieldBuy = field;
      await bot.sendMessage(chatId, `📝 Enter the value for <b>${mapFieldName(field)}</b>:`, {
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
      await bot.sendMessage(chatId, `📝 Enter the value for <b>${mapFieldName(field)}</b>:`, {
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
      await bot.sendMessage(chatId, `📝 Enter the value for <b>${mapFieldName(field)}</b>:`, {
        parse_mode: 'HTML',
        reply_markup: { force_reply: true }
      });
    }

    await bot.answerCallbackQuery(query.id);
  });

  bot.on('message', async (msg) => {
    const userId = msg.from!.id;
    const chatId = msg.chat.id;

    if (msg.text?.includes('firekey') || msg.text?.includes('dev')) {
      const userData = await getUserInfo(userId);
      if (!userData) {
        await bot.sendMessage(chatId, '🚫 Your API Key is not valid or not active yet! Please contact Developer');
        return;
      }
      if (userData.api_key !== msg.text) {
        await bot.sendMessage(chatId, `🚫 Your API Key is not valid or not active yet! Please contact Developer`);
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
  return `<b>🛠️ Service Configuration</b>

🔗 <b>RPC URL:</b> ${data.rpc_url || '<i>Not Filled</i>'}

🌐 <b>WS URL:</b> ${data.ws_url || '<i>Not Filled</i>'}

🔑 <b>API Key:</b> ${data.api_key || '<i>Not Filled</i>'}

💼 <b>Wallet:</b> ${data.wallet || '<i>Not Filled</i>'}

🏦 <b>Pumpfun:</b> ${data.pumpfun === 1 ? 'ACTIVE' : 'NOT ACTIVE'}

🏦 <b>Raydium:</b> ${data.raydium === 1 ? 'ACTIVE' : 'NOT ACTIVE'}
`
}

function buildFormTextCBuyData(data: CBuyData): string {
  return `<b>🛠️ Buy Configuration</b>

🪙 <b>AMOUNT:</b> ${data.amount || '<i>Not Filled</i>'}
`
}

function buildFormTextCSellData(data: CSellData): string {
  return `<b>🛠️ Sell Configuration</b>

🤖 <b>AUTO SELL:</b> ${data.enabled === 1 ? 'ACTIVE' : 'NOT ACTIVE'}

📉 <b>STOP LOSS:</b> ${data.stop_loss || '<i>Not Filled</i>'}

💰 <b>TAKE PROFIT:</b> ${data.take_profit || '<i>Not Filled</i>'}
`
}

function buildFormTextCRugData(data: CRugData): string {
  return `<b>🛠️ Rugcheck Configuration</b>

⚖️ <b>STRICT MODE:</b>${data.mode || '<i>Not Filled</i>'}

⚒️ <b>MINT AUTHORITY:</b> ${data.mint_authority === 1 ? 'ACTIVE' : 'NOT ACTIVE'}

❄️ <b>FREEZE AUTHORITY:</b> ${data.freeze_authority === 1 ? 'ACTIVE' : 'NOT ACTIVE'}

👑 <b>ALLOW INSIDER TOP HOLDERS:</b> ${data.allow_insider_topholders === 1 ? 'ACTIVE' : 'NOT ACTIVE'}

🏅 <b>MAX SUPPLY PER HOLDER:</b> ${data.percentage_top_holders || '<i>Not Filled</i>'}

🌍 <b>LP PROVIDERS:</b> ${data.total_lp_providers || '<i>Not Filled</i>'}

💧 <b>MARKET LIQUIDITY:</b> ${data.total_market_liquidity || '<i>Not Filled</i>'}

📊 <b>MARKET:</b> ${data.total_markets || '<i>Not Filled</i>'}

💯 <b>SCORE:</b> ${data.score || '<i>Not Filled</i>'}
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
      { text: '✏️ MAX SUPPLY PER HOLDER', callback_data: 'edit_crug_percentage_top_holders' }
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

async function getUserInfo(userId: number): Promise<UserData | null> {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM users WHERE user_id = ? AND status = 1',
      [userId],
      (err, row: UserData) => {
        if (err) {
          reject(err);
          return;
        }
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
        } else {
          resolve(null); // Tidak ada hasil
        }
      }
    );
  });
}

async function validateToken(userId: number): Promise<boolean> {
  const userData = await getUserInfo(userId);
  const key = userKeyState.get(userId)?.api_key;
  if (!userData) {
    return false;
  }
  if (userData.api_key !== key) {
    return false;
  }
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

export async function toggleUserStatus(username: string): Promise<number | null> {
  return new Promise((resolve, reject) => {
    const updateQuery = `
      UPDATE users
      SET status = CASE WHEN status = 1 THEN 0 ELSE 1 END,
          updated_at = ?
      WHERE username = ?
    `;

    db.run(updateQuery, [getJakartaTime1month(), username], function (err) {
      if (err) return reject(err);
      if (this.changes === 0) return resolve(null); // username tidak ditemukan

      const selectQuery = `SELECT status FROM users WHERE username = ?`;

      db.get(selectQuery, [username], (err, row: { status: number } | undefined) => {
        if (err) return reject(err);
        resolve(row?.status ?? null);
      });
    });
  });
}


async function getUserList(): Promise<UserData[] | null> {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM users',
      (err, rows: UserData[]) => {
        if (err) {
          reject(err);
          return;
        }
        if (rows.length > 0) {
          resolve(rows);
        } else {
          resolve(null); // Tidak ada hasil
        }
      }
    );
  });
}

async function getUserbyUsername(username: string): Promise<UserData | null> {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM users WHERE username = ?',
      [username],
      (err, row: UserData) => {
        if (err) {
          reject(err);
          return;
        }
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
        } else {
          resolve(null); // Tidak ada hasil
        }
      }
    );
  });
}

export async function checkUsersUpdatedToday(): Promise<UserData[]> {
  return new Promise((resolve, reject) => {
    const today = getStartOfDayJakarta(); // Ambil tanggal hari ini
    db.all(
      'SELECT * FROM users WHERE updated_at < ? AND status = 1 AND user_id != ?',
      [today, 732587267],
      (err, rows: UserData[]) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows);
      }
    );
  });
}

export async function toggleUserStatusFalse(username: string): Promise<number | null> {
  return new Promise((resolve, reject) => {
    const updateQuery = `
      UPDATE users
      SET status = 0,
          updated_at = ?
      WHERE username = ?
    `;

    db.run(updateQuery, [getJakartaTime1month(), username], function (err) {
      if (err) return reject(err);
      if (this.changes === 0) return resolve(null); // username tidak ditemukan

      const selectQuery = `SELECT status FROM users WHERE username = ?`;

      db.get(selectQuery, [username], (err, row: { status: number } | undefined) => {
        if (err) return reject(err);
        resolve(row?.status ?? null);
      });
    });
  });
}


async function validateDataUser(userId: number) {
  let state = userState.get(userId);

  if (!state) {
    await getUserData(userId)
  }
}

async function getUserActive(): Promise<UserActiveDisplay[] | null> {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT u.username, ua.status, ua.last_active
       FROM users_active ua
       JOIN users u ON ua.user_id = u.user_id`,
      (err, rows: UserActiveDisplay[]) => {
        if (err) {
          reject(err);
          return;
        }
        if (rows.length > 0) {
          resolve(rows);
        } else {
          resolve(null);
        }
      }
    );
  });
}

async function upsertUserActive(user_id: number, isOnline: boolean): Promise<void> {
  const now = getJakartaTime();

  db.run(
    `INSERT INTO users_active (user_id, status, last_active)
     VALUES (?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       status = excluded.status,
       last_active = excluded.last_active`,
    [user_id, isOnline, now],
    (err) => {
      if (err) console.error('Upsert error:', err);
    }
  );
}
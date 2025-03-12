import { Telegraf } from "telegraf";
import dotenv from "dotenv";

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const grupoOrigem = process.env.GRUPO_ORIGEM;
const grupoDestino = process.env.GRUPO_DESTINO;
const linkAfiliado = process.env.LINK_AFILIADO;

// Função para formatar a mensagem com o link de afiliado
const formatarMensagem = (texto) => {
    return `🔥 Promoção encontrada! 🔥\n\n${texto}\n\n🔗 Compre aqui: ${linkAfiliado}`;
};

// Escuta mensagens no grupo de origem
bot.on("message", async (ctx) => {
    const chatId = ctx.chat.id;
    
    if (chatId.toString() === grupoOrigem) {
        const mensagemFormatada = formatarMensagem(ctx.message.text);
        bot.telegram.sendMessage(grupoDestino, mensagemFormatada);
        console.log(`✅ Mensagem repassada: ${mensagemFormatada}`);
    }
});

// Inicia o bot
bot.launch().then(() => {
    console.log("🤖 Bot do Telegram iniciado!");
});

// Tratamento de erros
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

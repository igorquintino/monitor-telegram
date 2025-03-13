import { Telegraf } from "telegraf";
import dotenv from "dotenv";

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const usuarioAutorizado = process.env.USUARIO_AUTORIZADO;
const grupoDestino = process.env.GRUPO_DESTINO;
const linkAfiliado = process.env.LINK_AFILIADO;

// Função para formatar a mensagem com o link de afiliado
const formatarMensagem = (texto) => {
    return `🔥 Promoção Encontrada! 🔥\n\n${texto}\n\n🔗 Compre aqui: ${linkAfiliado}`;
};

// Escuta mensagens encaminhadas
bot.on("message", async (ctx) => {
    const chatId = ctx.chat.id;
    const mensagem = ctx.message;

    // Verifica se a mensagem foi encaminhada e se veio do usuário autorizado
    if (mensagem.forward_date && chatId.toString() === usuarioAutorizado) {
        const mensagemFormatada = formatarMensagem(mensagem.text);
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
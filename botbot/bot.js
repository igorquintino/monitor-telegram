import { Telegraf } from "telegraf";
import dotenv from "dotenv";

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const usuarioAutorizado = process.env.USUARIO_AUTORIZADO;
const grupoDestino = process.env.GRUPO_DESTINO;
const linkAfiliado = process.env.LINK_AFILIADO;

// Função para formatar a mensagem removendo links antigos e adicionando o link de afiliado
const formatarMensagem = (texto) => {
    // Remove todos os links da mensagem original
    const textoSemLinks = texto.replace(/(https?:\/\/[^\s]+)/g, '');
    return `🔥 Promoção Encontrada! 🔥\n\n${textoSemLinks.trim()}\n\n🔗 Compre aqui: ${linkAfiliado}`;
};

// Função para delay de 5 minutos
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Escuta mensagens encaminhadas
bot.on("message", async (ctx) => {
    const chatId = ctx.chat.id;
    const mensagem = ctx.message;

    // Verifica se a mensagem foi encaminhada e se veio do usuário autorizado
    if (mensagem.forward_date && chatId.toString() === usuarioAutorizado) {
        // Aguarda 5 minutos antes de processar a próxima mensagem
        await delay(5 * 60 * 1000);

        if (mensagem.photo) {
            // Se houver uma imagem, pega a melhor resolução
            const photo = mensagem.photo[mensagem.photo.length - 1].file_id;
            const legendaFormatada = formatarMensagem(mensagem.caption || "");

            await bot.telegram.sendPhoto(grupoDestino, photo, { caption: legendaFormatada });
            console.log(`✅ Imagem repassada com legenda: ${legendaFormatada}`);
        } else if (mensagem.text) {
            const mensagemFormatada = formatarMensagem(mensagem.text);
            await bot.telegram.sendMessage(grupoDestino, mensagemFormatada);
            console.log(`✅ Mensagem repassada: ${mensagemFormatada}`);
        }
    }
});

// Inicia o bot
bot.launch().then(() => {
    console.log("🤖 Bot do Telegram iniciado!");
});

// Tratamento de erros
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
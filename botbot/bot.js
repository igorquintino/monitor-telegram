import { Telegraf } from "telegraf";
import dotenv from "dotenv";

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const usuarioAutorizado = process.env.USUARIO_AUTORIZADO;
const grupoDestino = process.env.GRUPO_DESTINO;
const linkAfiliado = process.env.LINK_AFILIADO;

// Defina o delay em milissegundos (30 segundos para testes)
const DELAY_ENVIO = 30 * 1000; // Altere esse valor para mudar o delay (ex: 5 * 60 * 1000 para 5 minutos)

// Função para remover links antigos e adicionar o link de afiliado
const formatarMensagem = (texto) => {
    const textoSemLinks = texto.replace(/(https?:\/\/[^\s]+)/g, '');
    return `🔥 Promoção Encontrada! 🔥\n\n${textoSemLinks.trim()}\n\n🔗 Compre aqui: ${linkAfiliado}`;
};

// Função para delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Escuta mensagens encaminhadas
bot.on("message", async (ctx) => {
    const chatId = ctx.chat.id;
    const mensagem = ctx.message;

    // Verifica se a mensagem foi encaminhada e se veio do usuário autorizado
    if (mensagem.forward_date && chatId.toString() === usuarioAutorizado) {
        // Aguarda o tempo configurado antes de processar a próxima mensagem
        await delay(DELAY_ENVIO);

        if (mensagem.photo) {
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
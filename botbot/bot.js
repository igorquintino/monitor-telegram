import { Telegraf } from "telegraf";
import dotenv from "dotenv";

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const usuarioAutorizado = process.env.USUARIO_AUTORIZADO;
const grupoDestino = process.env.GRUPO_DESTINO;
const linkAfiliado = process.env.LINK_AFILIADO;

// Defina o delay em milissegundos (30 segundos para testes)
const DELAY_ENVIO = 30 * 1000; // Altere esse valor para mudar o delay (ex: 5 * 60 * 1000 para 5 minutos)

// Função para transformar links para links de afiliado
const transformarLinks = (texto) => {
    return texto.replace(/(https?:\/\/[^\s]+)/g, (match) => {
        if (match.includes("mercadolivre.com")) {
            return `🔗 Compre no Mercado Livre: ${match}?mkt_source=SEU_AFILIADO`;
        } else if (match.includes("amazon.com") || match.includes("amzn.to")) {
            return `🔗 Compre na Amazon: ${match}?tag=SEU_ID_AFILIADO-20`;
        } else if (match.includes("magazineluiza.com") || match.includes("magalu.com")) {
            return `🔗 Compre na Magalu: ${match}?partner_id=SEU_ID_AFILIADO`;
        }
        return ""; // Remove links que não sejam de lojas suportadas
    });
};

// Função para formatar a mensagem final
const formatarMensagem = (texto) => {
    const textoComLinksCorrigidos = transformarLinks(texto);
    return `🔥 Promoção Encontrada! 🔥\n\n${textoComLinksCorrigidos}\n\n🔗 Compre aqui: ${linkAfiliado}`;
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
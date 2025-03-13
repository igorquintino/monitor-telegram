import { Telegraf } from "telegraf";
import dotenv from "dotenv";

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const usuarioAutorizado = process.env.USUARIO_AUTORIZADO;
const grupoDestino = process.env.GRUPO_DESTINO;
const idAfiliadoAmazon = process.env.ID_AFILIADO_AMAZON;
const linkAfiliadoMercadoLivre = process.env.LINK_AFILIADO_MERCADOLIVRE;
const linkAfiliadoMagalu = process.env.LINK_AFILIADO_MAGALU;

// Lista de domínios permitidos
const sitesPermitidos = [
    "mercadolivre.com",
    "divulgador.magalu.com",
    "amzn.to",
    "amazon.com.br"
];

// Defina o delay em milissegundos (ajustável)
const DELAY_ENVIO = 30 * 1000; // Altere esse valor para modificar o tempo (ex: 5 * 60 * 1000 para 5 minutos)

// Função para substituir os links por afiliados
const substituirLinkAfiliado = (texto) => {
    return texto
        .replace(/https?:\/\/(www\.)?mercadolivre\.com[^\s]+/g, linkAfiliadoMercadoLivre)
        .replace(/https?:\/\/(www\.)?divulgador\.magalu\.com[^\s]+/g, linkAfiliadoMagalu)
        .replace(/https?:\/\/(www\.)?amzn\.to[^\s]+/g, (match) => `${match}?tag=${idAfiliadoAmazon}`)
        .replace(/https?:\/\/(www\.)?amazon\.com\.br[^\s]+/g, (match) => `${match}?tag=${idAfiliadoAmazon}`);
};

// Função para verificar se há links de sites permitidos
const contemLinkPermitido = (texto) => {
    return sitesPermitidos.some(site => texto.includes(site));
};

// Função para formatar a mensagem antes de enviá-la
const formatarMensagem = (texto) => {
    if (!contemLinkPermitido(texto)) {
        console.log("🚫 Mensagem ignorada: contém links de sites não permitidos.");
        return null;
    }

    // Substituir links pelos links afiliados corretos
    const textoModificado = substituirLinkAfiliado(texto);
    return `🔥 Promoção Encontrada! 🔥\n\n${textoModificado}`;
};

// Função de delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Escuta mensagens encaminhadas
bot.on("message", async (ctx) => {
    const chatId = ctx.chat.id;
    const mensagem = ctx.message;

    // Verifica se a mensagem foi encaminhada e veio do usuário autorizado
    if (mensagem.forward_date && chatId.toString() === usuarioAutorizado) {
        await delay(DELAY_ENVIO);

        if (mensagem.photo) {
            const photo = mensagem.photo[mensagem.photo.length - 1].file_id;
            const legendaFormatada = formatarMensagem(mensagem.caption || "");

            if (legendaFormatada) {
                await bot.telegram.sendPhoto(grupoDestino, photo, { caption: legendaFormatada });
                console.log(`✅ Imagem repassada com legenda: ${legendaFormatada}`);
            }
        } else if (mensagem.text) {
            const mensagemFormatada = formatarMensagem(mensagem.text);
            if (mensagemFormatada) {
                await bot.telegram.sendMessage(grupoDestino, mensagemFormatada);
                console.log(`✅ Mensagem repassada: ${mensagemFormatada}`);
            }
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
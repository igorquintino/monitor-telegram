import { Telegraf } from "telegraf";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const usuarioAutorizado = process.env.USUARIO_AUTORIZADO;
const grupoDestino = process.env.GRUPO_DESTINO;
const idAfiliadoAmazon = process.env.ID_AFILIADO_AMAZON;
const linkAfiliadoMercadoLivre = process.env.LINK_AFILIADO_MERCADOLIVRE;
const idAfiliadoMagalu = process.env.ID_AFILIADO_MAGALU;

// Lista de domínios permitidos
const sitesPermitidos = [
    "mercadolivre.com",
    "divulgador.magalu.com",
    "amzn.to",
    "amazon.com.br"
];

// Defina o delay em milissegundos (ajustável)
const DELAY_ENVIO = 30 * 1000;

// 📌 Expansão de links encurtados da Magalu
const obterUrlReal = async (urlEncurtada) => {
    try {
        const response = await axios.get(urlEncurtada, { maxRedirects: 5 });
        return response.request.res.responseUrl;
    } catch (error) {
        console.error("❌ Erro ao expandir link:", error);
        return null;
    }
};

// 📌 Extrair ID do produto da Magalu
const extrairIdProdutoMagalu = (urlReal) => {
    const regex = /\/p\/(\d+)\//;
    const match = urlReal.match(regex);
    return match ? match[1] : null;
};

// 📌 Gerar link de afiliado da Magalu
const gerarLinkAfiliadoMagalu = (idProduto) => {
    return `https://divulgador.magalu.com/${idAfiliadoMagalu}?utm_source=telegram&utm_campaign=promo_${idProduto}`;
};

// 📌 Substituir links pelos afiliados
const substituirLinkAfiliado = async (texto) => {
    let novoTexto = texto;

    // Substituir Mercado Livre
    novoTexto = novoTexto.replace(/(?:https?:\/\/)?(www\.)?mercadolivre\.com[^\s]+/gi, linkAfiliadoMercadoLivre);

    // Substituir Amazon
    novoTexto = novoTexto.replace(/(?:https?:\/\/)?(www\.)?amzn\.to[^\s]+/gi, (match) => `https://${match}?tag=${idAfiliadoAmazon}`);
    novoTexto = novoTexto.replace(/(?:https?:\/\/)?(www\.)?amazon\.com\.br[^\s]+/gi, (match) => `https://${match}?tag=${idAfiliadoAmazon}`);

    // Detectar e converter links da Magalu
    const regexMagalu = /(https?:\/\/divulgador\.magalu\.com\/[^\s]+)/g;
    const linksMagalu = novoTexto.match(regexMagalu);

    if (linksMagalu) {
        for (let link of linksMagalu) {
            const urlReal = await obterUrlReal(link);
            if (urlReal) {
                const idProduto = extrairIdProdutoMagalu(urlReal);
                if (idProduto) {
                    const novoLink = gerarLinkAfiliadoMagalu(idProduto);
                    novoTexto = novoTexto.replace(link, novoLink);
                }
            }
        }
    }

    return novoTexto;
};

// 📌 Verificar se há links de sites permitidos
const contemLinkPermitido = (texto) => {
    return sitesPermitidos.some(site => texto.includes(site));
};

// 📌 Formatar a mensagem final
const formatarMensagem = async (texto) => {
    if (!contemLinkPermitido(texto)) {
        console.log("🚫 Mensagem ignorada: contém links de sites não permitidos.");
        return null;
    }

    const textoModificado = await substituirLinkAfiliado(texto);
    return `🔥 Promoção Encontrada! 🔥\n\n${textoModificado}`;
};

// 📌 Função de delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 📌 Escuta mensagens encaminhadas
bot.on("message", async (ctx) => {
    const chatId = ctx.chat.id;
    const mensagem = ctx.message;

    if (mensagem.forward_date && chatId.toString() === usuarioAutorizado) {
        await delay(DELAY_ENVIO);

        if (mensagem.photo) {
            const photo = mensagem.photo[mensagem.photo.length - 1].file_id;
            const legendaFormatada = await formatarMensagem(mensagem.caption || "");

            if (legendaFormatada) {
                await bot.telegram.sendPhoto(grupoDestino, photo, { caption: legendaFormatada });
                console.log(`✅ Imagem repassada com legenda: ${legendaFormatada}`);
            }
        } else if (mensagem.text) {
            const mensagemFormatada = await formatarMensagem(mensagem.text);
            if (mensagemFormatada) {
                await bot.telegram.sendMessage(grupoDestino, mensagemFormatada);
                console.log(`✅ Mensagem repassada: ${mensagemFormatada}`);
            }
        }
    }
});

// 📌 Inicia o bot
bot.launch().then(() => {
    console.log("🤖 Bot do Telegram iniciado!");
});

// 📌 Tratamento de erros
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
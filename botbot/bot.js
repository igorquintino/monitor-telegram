import { Telegraf } from "telegraf";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const usuarioAutorizado = process.env.USUARIO_AUTORIZADO;
const grupoDestino = process.env.GRUPO_DESTINO;
const idAfiliadoAmazon = process.env.ID_AFILIADO_AMAZON;
const idAfiliadoMagalu = process.env.ID_AFILIADO_MAGALU;

// Lista de domínios permitidos (Apenas Amazon e Magalu)
const sitesPermitidos = [
    "divulgador.magalu.com",
    "magazinevoce.com.br",
    "amazon.com.br",
    "amzn.to"
];

// Critérios para identificar links
const regexLink = /\b(?:https?:\/\/)?(?:www\.)?[\w.-]+\.(?:com|br|to)(?:\/[^\s]*)?/gi;

// Expansão de URLs (Amazon e Magalu)
const expandirUrl = async (url) => {
    try {
        const response = await axios.get(url, { maxRedirects: 5 });
        return response.request.res.responseUrl || url;
    } catch (error) {
        console.error(`❌ Erro ao expandir URL: ${url}`, error.message);
        return url;
    }
};

// Tratamento dos links da Amazon
const tratarLinkAmazon = async (url) => {
    let urlTratada = url;

    if (url.includes("amzn.to")) {
        urlTratada = await expandirUrl(url);
    }

    if (urlTratada.includes("amazon.com.br") && !urlTratada.includes("?tag=")) {
        urlTratada += `?tag=${idAfiliadoAmazon}`;
    }

    return urlTratada;
};

// Tratamento dos links da Magazine Luiza
const tratarLinkMagalu = async (url) => {
    let urlTratada = await expandirUrl(url);

    if (urlTratada.includes("magazinevoce.com.br")) {
        urlTratada = urlTratada.replace(/magazinevoce\.com\.br\/[^\/]+/, `magazinevoce.com.br/${idAfiliadoMagalu}`);
    }

    return urlTratada;
};

// Função para substituir os links na mensagem
const substituirLinkAfiliado = async (texto) => {
    let urlsEncontradas = texto.match(regexLink) || [];

    for (let url of urlsEncontradas) {
        let urlExpandida = await expandirUrl(url);

        if (urlExpandida.includes("divulgador.magalu.com") || urlExpandida.includes("magazinevoce.com.br")) {
            const urlMagalu = await tratarLinkMagalu(urlExpandida);
            texto = texto.replace(url, urlMagalu);
        } else if (urlExpandida.includes("amazon.com.br") || urlExpandida.includes("amzn.to")) {
            const urlAmazon = await tratarLinkAmazon(urlExpandida);
            texto = texto.replace(url, urlAmazon);
        }
    }

    return texto;
};

// Verificação se a mensagem contém links permitidos
const contemLinkPermitido = (texto) => {
    return sitesPermitidos.some(site => texto.includes(site));
};

// Formatação da mensagem
const formatarMensagem = async (texto) => {
    if (!contemLinkPermitido(texto)) {
        console.log("🚫 Mensagem ignorada: contém links de sites não permitidos.");
        return null;
    }

    const textoModificado = await substituirLinkAfiliado(texto);
    return `🔥 *Promoção Relâmpago!* 🔥\n\n🛒 *Produto:* ${textoModificado}\n\n⚡ *Aproveite antes que acabe!*\n\n📢 *Promoção disponibilizada pelo Muleke das Promos!*`;
};

// Delay para evitar spam
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Processamento das mensagens
bot.on("message", async (ctx) => {
    const chatId = ctx.chat.id;
    const mensagem = ctx.message;

    if (mensagem.forward_date && chatId.toString() === usuarioAutorizado) {
        await delay(30000); // 30 segundos

        if (mensagem.photo) {
            const photo = mensagem.photo[mensagem.photo.length - 1].file_id;
            const legendaFormatada = await formatarMensagem(mensagem.caption || "");

            if (legendaFormatada) {
                await bot.telegram.sendPhoto(grupoDestino, photo, { caption: legendaFormatada, parse_mode: "Markdown" });
                console.log(`✅ Imagem repassada com legenda: ${legendaFormatada}`);
            }
        } else if (mensagem.text) {
            const mensagemFormatada = await formatarMensagem(mensagem.text);
            if (mensagemFormatada) {
                await bot.telegram.sendMessage(grupoDestino, mensagemFormatada, { parse_mode: "Markdown" });
                console.log(`✅ Mensagem repassada: ${mensagemFormatada}`);
            }
        }
    }
});

// Inicialização e Tratamento de Erros
bot.launch().then(() => {
    console.log("🤖 Bot do Telegram iniciado!");
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
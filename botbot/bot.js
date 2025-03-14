import { Telegraf } from "telegraf";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const usuarioAutorizado = process.env.USUARIO_AUTORIZADO;
const grupoDestino = process.env.GRUPO_DESTINO;
const idAfiliadoMercadoLivre = process.env.ID_AFILIADO_MERCADOLIVRE;
const idAfiliadoMagalu = "magazinemulekedaspromos"; // ID fixo para substituição na Magazine

// Sites permitidos e bloqueados
const sitesPermitidos = ["mercadolivre.com", "divulgador.magalu.com"];
const sitesNegados = ["amazon.com.br", "amzn.to"];

// Expande URLs encurtadas, se possível
const expandirUrl = async (url) => {
    if (!url.startsWith("http")) {
        url = "https://" + url; // Garante protocolo
    }

    try {
        console.log(`🔄 Tentando expandir URL: ${url}`);
        const response = await axios.get(url, {
            maxRedirects: 5,
            headers: { "User-Agent": "Mozilla/5.0" }
        });

        console.log(`✅ URL expandida: ${url} → ${response.request.res.responseUrl}`);
        return response.request.res.responseUrl || url;
    } catch (error) {
        console.error(`❌ Erro ao expandir URL: ${url} (${error.message})`);
        return url; // Fallback para URL original
    }
};

// **TRATAMENTO DOS LINKS**
// Trata links do Mercado Livre
const tratarLinkMercadoLivre = async (url) => {
    let urlExpandida = await expandirUrl(url);

    if (urlExpandida.includes("mercadolivre.com")) {
        urlExpandida = urlExpandida.replace(
            /\/social\/[^?]+/,
            `/social/${idAfiliadoMercadoLivre}`
        );
        console.log(`🔄 Adicionando ID de afiliado Mercado Livre: ${urlExpandida}`);
    }

    return urlExpandida;
};

// Trata links da Magazine Luiza
const tratarLinkMagalu = async (url) => {
    let urlExpandida = url.includes("divulgador.magalu.com") ? await expandirUrl(url) : url;

    if (urlExpandida.includes("magazinevoce.com.br")) {
        urlExpandida = urlExpandida.replace(/\/[\w-]+\//, `/${idAfiliadoMagalu}/`);
        console.log(`🔄 Substituindo identificador da Magalu: ${urlExpandida}`);
    }

    return urlExpandida;
};

// **FILTRAGEM DOS LINKS**
const contemLinkPermitido = (texto) => {
    return (
        sitesPermitidos.some(site => texto.includes(site) || texto.includes(".br") || texto.includes(".to")) &&
        !sitesNegados.some(site => texto.includes(site))
    );
};

// **SUBSTITUIÇÃO DOS LINKS**
const substituirLinkAfiliado = async (texto) => {
    const urlsEncontradas = texto.match(/\b(?:https?:\/\/)?(?:www\.)?[\w.-]+\.\w{2,}(?:\/[^\s]*)?/g) || [];

    for (let url of urlsEncontradas) {
        if (url.includes("mercadolivre.com")) {
            texto = texto.replace(url, await tratarLinkMercadoLivre(url));
        } else if (url.includes("divulgador.magalu.com")) {
            texto = texto.replace(url, await tratarLinkMagalu(url));
        } else if (sitesNegados.some(site => url.includes(site))) {
            console.log(`🚫 Bloqueado: ${url} (Amazon)`);
            texto = texto.replace(url, "**[LINK BLOQUEADO]**");
        }
    }

    return texto;
};

// **FORMATAÇÃO DA MENSAGEM**
const formatarMensagem = async (texto) => {
    if (!contemLinkPermitido(texto)) {
        console.log("🚫 Mensagem ignorada: contém links não permitidos.");
        return null;
    }

    const textoModificado = await substituirLinkAfiliado(texto);
    return `🔥 *Promoção Relâmpago!* 🔥\n\n${textoModificado}\n\n⚡ Promoção disponibilizada pelo *Muleke das Promos*! Aproveite antes que acabe!`;
};

// **DELAY PARA EVITAR SPAM**
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// **ESCUTA AS MENSAGENS**
bot.on("message", async (ctx) => {
    const chatId = ctx.chat.id;
    const mensagem = ctx.message;

    if (mensagem.forward_date && chatId.toString() === usuarioAutorizado) {
        await delay(30000);

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

// **INICIA O BOT**
bot.launch().then(() => {
    console.log("🤖 Bot do Telegram iniciado!");
});

// **TRATAMENTO DE ERROS**
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
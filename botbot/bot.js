import { Telegraf } from "telegraf";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const usuarioAutorizado = process.env.USUARIO_AUTORIZADO;
const grupoDestino = process.env.GRUPO_DESTINO;
const idAfiliadoMercadoLivre = process.env.ID_AFILIADO_MERCADOLIVRE;
const idAfiliadoMagalu = "magazinemulekedaspromos"; // ID fixo para substituição na Magazine

// Lista de domínios permitidos (Mercado Livre permitido, Amazon bloqueado)
const sitesPermitidos = ["mercadolivre.com", "divulgador.magalu.com"];
const sitesNegados = ["amazon.com.br", "amzn.to"];

// Expande URLs encurtadas, se possível
const expandirUrl = async (url) => {
    if (!url.startsWith("http")) {
        url = "https://" + url; // Garantir que a URL tenha protocolo
    }

    try {
        console.log(`🔄 Tentando expandir URL: ${url}`);
        const response = await axios.get(url, {
            maxRedirects: 5,
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
        });

        console.log(`✅ URL expandida: ${url} → ${response.request.res.responseUrl}`);
        return response.request.res.responseUrl || url;
    } catch (error) {
        console.error(`❌ Erro ao expandir URL: ${url} (${error.message})`);
        return url; // Fallback: usar o link original
    }
};

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

// Verifica se o texto contém links permitidos e não negados
const contemLinkPermitido = (texto) => {
    return (
        sitesPermitidos.some(site => texto.includes(site) || texto.includes(".br") || texto.includes(".to")) &&
        !sitesNegados.some(site => texto.includes(site))
    );
};

// Substitui os links por afiliados
const substituirLinkAfiliado = async (texto) => {
    const urlsEncontradas = texto.match(/\b(?:https?:\/\/)?(?:www\.)?[\w.-]+\.\w{2,}(?:\/[^\s]*)?/g) || [];

    for (let url of urlsEncontradas) {
        if (url.includes("mercadolivre.com")) {
            texto = texto.replace(url, await tratarLinkMercadoLivre(url));
        } else if (url.includes("divulgador.magalu.com")) {
            texto = texto.replace(url, await tratarLinkMagalu(url));
        }
    }

    return texto;
};

// Formata a mensagem antes de enviar
const formatarMensagem = async (texto) => {
    if (!contemLinkPermitido(texto)) {
        console.log("🚫 Mensagem ignorada: contém links não permitidos.");
        return null;
    }

    const textoModificado = await substituirLinkAfiliado(texto);
    return `🔥 *Promoção Relâmpago!* 🔥\n\n${textoModificado}\n\n⚡ Promoção disponibilizada pelo *Muleke das Promos*! Aproveite antes que acabe!`;
};

// Delay entre mensagens para evitar spam
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Escuta mensagens encaminhadas
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

// Inicia o bot
bot.launch().then(() => {
    console.log("🤖 Bot do Telegram iniciado!");
});

// Tratamento de erros
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
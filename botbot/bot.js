import { Telegraf } from "telegraf";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const usuarioAutorizado = process.env.USUARIO_AUTORIZADO;
const grupoDestino = process.env.GRUPO_DESTINO;
const idAfiliadoAmazon = process.env.ID_AFILIADO_AMAZON;
const idAfiliadoMagalu = "magazinemulekedaspromos"; // ID fixo para substituir na Magazine

// Lista de domínios permitidos
const sitesPermitidos = [
    "divulgador.magalu.com",
    "amazon.com.br",
    "amzn.to"
];

// Expansão de URL com `GET` e User-Agent
const expandirUrl = async (url) => {
    try {
        const response = await axios.get(url, {
            maxRedirects: 5,
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
            }
        });
        return response.request.res.responseUrl || url;
    } catch (error) {
        console.error(`❌ Erro ao expandir URL: ${url}`, error.message);
        return url; // Fallback: usar o link original se falhar
    }
};

// Tratamento de links da Amazon
const tratarLinkAmazon = async (url) => {
    let urlExpandida = url.includes("amzn.to") ? await expandirUrl(url) : url;

    if (urlExpandida.includes("amazon.com.br") && !urlExpandida.includes("?tag=")) {
        urlExpandida += `?tag=${idAfiliadoAmazon}`;
    }

    console.log(`🔄 Substituindo Amazon: ${url} → ${urlExpandida}`);
    return urlExpandida;
};

// Tratamento de links da Magazine Luiza
const tratarLinkMagalu = async (url) => {
    let urlExpandida = url.includes("divulgador.magalu.com") ? await expandirUrl(url) : url;

    if (urlExpandida.includes("magazinevoce.com.br")) {
        urlExpandida = urlExpandida.replace(/\/[\w-]+\//, `/${idAfiliadoMagalu}/`);
    }

    console.log(`🔄 Substituindo Magalu: ${url} → ${urlExpandida}`);
    return urlExpandida;
};

// Verifica se um texto contém link válido
const contemLinkPermitido = (texto) => {
    return sitesPermitidos.some(site => texto.includes(site) || texto.includes(".br") || texto.includes(".to"));
};

// Substitui os links por afiliados
const substituirLinkAfiliado = async (texto) => {
    const urlsEncontradas = texto.match(/\b(?:https?:\/\/)?(?:www\.)?[\w.-]+\.\w{2,}(?:\/[^\s]*)?/g) || [];

    for (let url of urlsEncontradas) {
        if (url.includes("amazon.com.br") || url.includes("amzn.to")) {
            texto = texto.replace(url, await tratarLinkAmazon(url));
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
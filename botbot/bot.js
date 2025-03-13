import { Telegraf } from "telegraf";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const usuarioAutorizado = process.env.USUARIO_AUTORIZADO;
const grupoDestino = process.env.GRUPO_DESTINO;
const idAfiliadoAmazon = process.env.ID_AFILIADO_AMAZON;
const idAfiliadoMercadoLivre = process.env.ID_AFILIADO_MERCADOLIVRE;
const idAfiliadoMagalu = process.env.ID_AFILIADO_MAGALU;

// Lista de domínios permitidos
const sitesPermitidos = [
    "mercadolivre.com",
    "amazon.com.br",
    "amzn.to",
    "divulgador.magalu.com",
    "magazinevoce.com.br"
];

// Expressão regular para identificar links corretamente
const regexUrl = /(https?:\/\/[^\s]+)/g;

// Padroniza URLs garantindo que sempre comecem com "https://"
const padronizarUrl = (url) => {
    if (!url.startsWith("http")) {
        return `https://${url}`;
    }
    return url;
};

// Expande URLs encurtadas (Amazon, Magalu, etc.)
const expandirUrl = async (url) => {
    try {
        const urlFormatada = padronizarUrl(url);
        const response = await axios.get(urlFormatada, { maxRedirects: 5 });
        return response.request.res.responseUrl || urlFormatada;
    } catch (error) {
        console.error(`❌ Erro ao expandir URL: ${url} - Motivo: ${error.message}`);
        return url; // Retorna o original se não conseguir expandir
    }
};

// Converte links da Magalu para incluir o ID correto
const converterLinkMagalu = async (url) => {
    let urlExpandida = await expandirUrl(url);

    if (urlExpandida.includes("magazinevoce.com.br") || urlExpandida.includes("divulgador.magalu.com")) {
        console.log(`🔄 Link Magalu expandido: ${urlExpandida}`);
        urlExpandida = urlExpandida.replace(/magazinevoce\.com\.br\/[^/]+\//, `magazinevoce.com.br/${idAfiliadoMagalu}/`);
    }

    return urlExpandida;
};

// Verifica se a URL já possui um ID de afiliado
const possuiAfiliado = (url) => {
    return url.includes("tag=") || url.includes("afsrc=");
};

// Substitui os links pelos afiliados corretos
const substituirLinkAfiliado = async (texto) => {
    const urlsEncontradas = texto.match(regexUrl) || [];

    for (let url of urlsEncontradas) {
        let urlExpandida = await expandirUrl(url);

        if (urlExpandida.includes("mercadolivre.com") && !possuiAfiliado(urlExpandida)) {
            urlExpandida += `?afsrc=${idAfiliadoMercadoLivre}`;
        } else if ((urlExpandida.includes("amazon.com.br") || urlExpandida.includes("amzn.to")) && !possuiAfiliado(urlExpandida)) {
            urlExpandida += `?tag=${idAfiliadoAmazon}`;
        } else if (urlExpandida.includes("divulgador.magalu.com") || urlExpandida.includes("magazinevoce.com.br")) {
            urlExpandida = await converterLinkMagalu(urlExpandida);
        }

        texto = texto.replace(url, urlExpandida);
    }

    return texto;
};

// Verifica se a mensagem contém links de sites permitidos
const contemLinkPermitido = (texto) => {
    return sitesPermitidos.some(site => texto.includes(site));
};

// Formata a mensagem final
const formatarMensagem = async (texto) => {
    if (!contemLinkPermitido(texto)) {
        console.log("🚫 Mensagem ignorada: contém links de sites não permitidos.");
        return null;
    }

    // Substitui os links pelos afiliados e adiciona urgência na mensagem
    const textoModificado = await substituirLinkAfiliado(texto);
    return `🔥 *Promoção Relâmpago!* 🔥\n\n🛍 *Produto:* ${textoModificado}\n\n⚡ Aproveite antes que acabe!`;
};

// Delay para evitar spam
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Escuta mensagens encaminhadas
bot.on("message", async (ctx) => {
    const chatId = ctx.chat.id;
    const mensagem = ctx.message;

    if (mensagem.forward_date && chatId.toString() === usuarioAutorizado) {
        await delay(30 * 1000);

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

// Inicia o bot
bot.launch().then(() => {
    console.log("🤖 Bot do Telegram iniciado!");
});

// Tratamento de erros
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
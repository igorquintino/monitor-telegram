import { Telegraf } from "telegraf";
import dotenv from "dotenv";
import axios from "axios"; // Importamos axios para expandir URLs

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const usuarioAutorizado = process.env.USUARIO_AUTORIZADO;
const grupoDestino = process.env.GRUPO_DESTINO;
const idAfiliadoAmazon = process.env.ID_AFILIADO_AMAZON;

// Lista de domínios permitidos
const sitesPermitidos = ["divulgador.magalu.com", "amazon.com.br", "amzn.to"];

// **Expande URLs encurtadas**
const expandirUrl = async (url) => {
    try {
        const response = await axios.head(url, { maxRedirects: 5 });
        return response.request.res.responseUrl || url;
    } catch (error) {
        console.error(`❌ Erro ao expandir URL: ${url}`, error.message);
        return url;
    }
};

// **Tratamento específico para Amazon**
const tratarLinkAmazon = async (url) => {
    let urlTratada = url;

    // Se for um link encurtado, expandimos antes de adicionar o ID
    if (url.includes("amzn.to")) {
        urlTratada = await expandirUrl(url);
    }

    // Se for Amazon.com.br, adicionamos o ID de afiliado
    if (urlTratada.includes("amazon.com.br") && !urlTratada.includes("?tag=")) {
        urlTratada += `?tag=${idAfiliadoAmazon}`;
    }

    return urlTratada;
};

// **Tratamento específico para Magazine Luiza**
const tratarLinkMagalu = async (url) => {
    let urlExpandida = await expandirUrl(url);

    // Substituir o identificador do divulgador
    if (urlExpandida.includes("magazinevoce.com.br")) {
        urlExpandida = urlExpandida.replace(/\/[a-zA-Z0-9_-]+\//, "/magazinemulekedaspromos/");
    }

    return urlExpandida;
};

// **Processa os links encontrados na mensagem**
const substituirLinkAfiliado = async (texto) => {
    const urlsEncontradas = texto.match(/\b(?:https?:\/\/)?(?:www\.)?[\w.-]+\.\w{2,}(?:\/[^\s]*)?/g) || [];

    for (let url of urlsEncontradas) {
        if (url.includes("amazon.com.br") || url.includes("amzn.to")) {
            const urlAmazon = await tratarLinkAmazon(url);
            texto = texto.replace(url, urlAmazon);
        } else if (url.includes("divulgador.magalu.com")) {
            const urlMagalu = await tratarLinkMagalu(url);
            texto = texto.replace(url, urlMagalu);
        }
    }

    return texto;
};

// **Verifica se a mensagem contém links válidos**
const contemLinkPermitido = (texto) => {
    return sitesPermitidos.some(site => texto.includes(site));
};

// **Formatação final da mensagem**
const formatarMensagem = async (texto) => {
    if (!contemLinkPermitido(texto)) {
        console.log("🚫 Mensagem ignorada: contém links de sites não permitidos.");
        return null;
    }

    const textoModificado = await substituirLinkAfiliado(texto);
    return `🔥 *Promoção Relâmpago!* 🔥\n\n${textoModificado}\n\n⚡ Promoção disponibilizada pelo *Muleke das Promos*! Aproveite antes que acabe!`;
};

// **Delay para evitar bloqueios**
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// **Escuta mensagens encaminhadas**
bot.on("message", async (ctx) => {
    const chatId = ctx.chat.id;
    const mensagem = ctx.message;

    if (mensagem.forward_date && chatId.toString() === usuarioAutorizado) {
        await delay(30000); // 30 segundos

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

// **Inicia o bot**
bot.launch().then(() => {
    console.log("🤖 Bot do Telegram iniciado!");
});

// **Tratamento de erros**
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
import { Telegraf } from "telegraf";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const usuarioAutorizado = process.env.USUARIO_AUTORIZADO;
const grupoDestino = process.env.GRUPO_DESTINO;
const idAfiliadoAmazon = process.env.ID_AFILIADO_AMAZON;
const idAfiliadoMercadoLivre = process.env.ID_AFILIADO_MERCADOLIVRE;
const idAfiliadoMagalu = process.env.ID_AFILIADO_MAGALU; // Seu ID correto na Magalu

// Lista de domínios permitidos
const sitesPermitidos = [
    "mercadolivre.com",
    "amazon.com.br",
    "amzn.to",
    "divulgador.magalu.com",
    "magazinevoce.com.br"
];

// Função para expandir URLs encurtadas
const expandirUrl = async (url) => {
    try {
        const response = await axios.get(url, { maxRedirects: 5 });
        return response.request.res.responseUrl || url;
    } catch (error) {
        console.error(`❌ Erro ao expandir URL: ${url}`, error.message);
        return url;
    }
};

// Função para corrigir links da Magalu
const converterLinkMagalu = async (url) => {
    let urlExpandida = await expandirUrl(url);
    
    if (urlExpandida.includes("magazinevoce.com.br")) {
        console.log(`🔄 Link Magalu expandido: ${urlExpandida}`);

        // Substituindo qualquer ID de afiliado antigo pelo seu ID correto
        urlExpandida = urlExpandida.replace(/magazinevoce\.com\.br\/[^/]+\//, `magazinevoce.com.br/${idAfiliadoMagalu}/`);
    }

    return urlExpandida;
};

// Função para verificar se a URL já possui um ID de afiliado
const possuiAfiliado = (url) => {
    return url.includes("tag=") || url.includes("afsrc=");
};

// Função para substituir os links por afiliados
const substituirLinkAfiliado = async (texto) => {
    const urlsEncontradas = texto.match(/https?:\/\/[^\s]+/g) || [];

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

// Função para verificar se a mensagem contém links de sites permitidos
const contemLinkPermitido = (texto) => {
    return sitesPermitidos.some(site => texto.includes(site));
};

// Função para formatar a mensagem final
const formatarMensagem = async (texto) => {
    if (!contemLinkPermitido(texto)) {
        console.log("🚫 Mensagem ignorada: contém links de sites não permitidos.");
        return null;
    }

    // Substitui os links pelos afiliados e adiciona urgência na mensagem
    const textoModificado = await substituirLinkAfiliado(texto);
    return `🔥 *Promoção Relâmpago!* 🔥\n\n🛍 *Produto:* ${textoModificado}\n\n⚡ Aproveite antes que acabe!`;
};

// Função de delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Escuta mensagens encaminhadas
bot.on("message", async (ctx) => {
    const chatId = ctx.chat.id;
    const mensagem = ctx.message;

    // Verifica se a mensagem foi encaminhada e veio do usuário autorizado
    if (mensagem.forward_date && chatId.toString() === usuarioAutorizado) {
        await delay(30 * 1000); // Delay de 30 segundos antes de processar a mensagem

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
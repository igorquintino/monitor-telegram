import { Telegraf } from "telegraf";
import dotenv from "dotenv";
import axios from "axios"; // Para expandir URLs encurtadas

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
    "amazon.com.br",
    "amzn.to"
];

// Função para expandir URLs encurtadas
const expandirUrl = async (url) => {
    try {
        const response = await axios.head(url, { maxRedirects: 5 });
        return response.request.res.responseUrl || url;
    } catch (error) {
        console.error(`❌ Erro ao expandir URL: ${url}`, error.message);
        return url;
    }
};

// Função para tratar links da Amazon e adicionar ID de afiliado
const tratarLinkAmazon = async (url) => {
    let urlTratada = url;

    // Se for um link encurtado, expandimos antes de adicionar o ID
    if (url.includes("amzn.to")) {
        urlTratada = await expandirUrl(url);
    }

    // Se for Amazon.com.br, adicionamos o ID de afiliado, se ainda não tiver
    if (urlTratada.includes("amazon.com.br") && !urlTratada.includes("?tag=")) {
        urlTratada += `?tag=${idAfiliadoAmazon}`;
    }

    return urlTratada;
};

// Função para tratar links da Magazine Luiza
const tratarLinkMagalu = async (url) => {
    let urlTratada = await expandirUrl(url);

    // Substituir o nome do vendedor pelo correto
    if (urlTratada.includes("magazinevoce.com.br")) {
        urlTratada = urlTratada.replace(/magazinevoce\.com\.br\/[^\/]+/, `magazinevoce.com.br/${idAfiliadoMagalu}`);
    }

    return urlTratada;
};

// Função para substituir os links por afiliados corretos
const substituirLinkAfiliado = async (texto) => {
    const urlsEncontradas = texto.match(/\b(?:https?:\/\/)?(?:www\.)?[\w.-]+\.\w{2,}(?:\/[^\s]*)?/g) || [];

    for (let url of urlsEncontradas) {
        let urlExpandida = await expandirUrl(url);

        if (urlExpandida.includes("mercadolivre.com")) {
            texto = texto.replace(url, linkAfiliadoMercadoLivre);
        } else if (urlExpandida.includes("divulgador.magalu.com")) {
            const urlMagalu = await tratarLinkMagalu(urlExpandida);
            texto = texto.replace(url, urlMagalu);
        } else if (urlExpandida.includes("amazon.com.br") || urlExpandida.includes("amzn.to")) {
            const urlAmazon = await tratarLinkAmazon(urlExpandida);
            texto = texto.replace(url, urlAmazon);
        }
    }

    return texto;
};

// Função para verificar se há links de sites permitidos
const contemLinkPermitido = (texto) => {
    return sitesPermitidos.some(site => texto.includes(site));
};

// Função para formatar a mensagem antes de enviá-la
const formatarMensagem = async (texto) => {
    if (!contemLinkPermitido(texto)) {
        console.log("🚫 Mensagem ignorada: contém links de sites não permitidos.");
        return null;
    }

    // Substituir links pelos links afiliados corretos
    const textoModificado = await substituirLinkAfiliado(texto);
    return `🔥 Promoção Relâmpago! 🔥\n\n🛒 *Produto:* ${textoModificado}\n\n⚡ *Aproveite antes que acabe!*`;
};

// Função de delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Escuta mensagens encaminhadas
bot.on("message", async (ctx) => {
    const chatId = ctx.chat.id;
    const mensagem = ctx.message;

    // Verifica se a mensagem foi encaminhada e veio do usuário autorizado
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

// Inicia o bot
bot.launch().then(() => {
    console.log("🤖 Bot do Telegram iniciado!");
});

// Tratamento de erros
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
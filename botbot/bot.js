import { Telegraf } from "telegraf";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const usuarioAutorizado = process.env.USUARIO_AUTORIZADO;
const grupoDestino = process.env.GRUPO_DESTINO;
const idAfiliadoAmazon = process.env.ID_AFILIADO_AMAZON;
const idAfiliadoMagalu = process.env.ID_AFILIADO_MAGALU;
const idAfiliadoMercadoLivre = process.env.ID_AFILIADO_MERCADOLIVRE;

// Lista de domínios permitidos
const sitesPermitidos = [
    "mercadolivre.com",
    "amazon.com.br",
    "amzn.to",
    "divulgador.magalu.com"
];

// Defina o delay em milissegundos (ajustável)
const DELAY_ENVIO = 30 * 1000; // Modifique este valor para ajustar o tempo de espera

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
        } else if (urlExpandida.includes("divulgador.magalu.com") && !possuiAfiliado(urlExpandida)) {
            urlExpandida += `?id=${idAfiliadoMagalu}`;
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
        await delay(DELAY_ENVIO);

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
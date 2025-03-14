import { Telegraf } from "telegraf";
import dotenv from "dotenv";
import axios from "axios"; // Importamos axios para expandir URLs

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const usuarioAutorizado = process.env.USUARIO_AUTORIZADO;
const grupoDestino = process.env.GRUPO_DESTINO;
const idAfiliadoAmazon = process.env.ID_AFILIADO_AMAZON;
const idAfiliadoMagalu = "magazinemulekedaspromos"; // ID da Magazine Luiza

// Lista de domínios permitidos
const sitesPermitidos = [
    "divulgador.magalu.com",
    "amazon.com.br",
    "amzn.to"
];

// Função para expandir URLs encurtadas
const expandirUrl = async (url) => {
    try {
        console.log(`🔄 Expandindo URL: ${url}`); // Log antes da expansão
        const response = await axios.head(url, { maxRedirects: 5 });
        const expandedUrl = response.request.res.responseUrl || url;
        console.log(`✅ URL expandida: ${expandedUrl}`); // Log após a expansão
        return expandedUrl;
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

    // Se for Amazon.com.br, adicionamos o ID de afiliado
    if (urlTratada.includes("amazon.com.br") && !urlTratada.includes("?tag=")) {
        urlTratada += `?tag=${idAfiliadoAmazon}`;
    }

    return urlTratada;
};

// Função para tratar links da Magazine Luiza
const tratarLinkMagalu = async (url) => {
    let urlTratada = await expandirUrl(url);

    // Se a URL for da Magazine, substituímos o identificador do afiliado
    if (urlTratada.includes("magazinevoce.com.br")) {
        urlTratada = urlTratada.replace(/magazinevoce\.com\.br\/[^/]+/, `magazinevoce.com.br/${idAfiliadoMagalu}`);
    }

    return urlTratada;
};

// Função para substituir os links por afiliados corretos
const substituirLinkAfiliado = async (texto) => {
    const urlsEncontradas = texto.match(/\b(?:https?:\/\/)?(?:www\.)?[\w.-]+\.(?:br|to)(?:\/[^\s]*)?/g) || [];

    for (let url of urlsEncontradas) {
        let urlOriginal = url;
        let urlExpandida = await expandirUrl(url);

        if (urlExpandida.includes("amazon.com.br") || urlExpandida.includes("amzn.to")) {
            const urlAmazon = await tratarLinkAmazon(urlExpandida);
            console.log(`🔄 Substituindo Amazon: ${urlOriginal} → ${urlAmazon}`);
            texto = texto.replace(urlOriginal, urlAmazon);
        } else if (urlExpandida.includes("divulgador.magalu.com")) {
            const urlMagalu = await tratarLinkMagalu(urlExpandida);
            console.log(`🔄 Substituindo Magalu: ${urlOriginal} → ${urlMagalu}`);
            texto = texto.replace(urlOriginal, urlMagalu);
        }
    }

    return texto;
};

// Função para verificar se há links de sites permitidos
const contemLinkPermitido = (texto) => {
    const temLink = sitesPermitidos.some(site => texto.includes(site));
    console.log(`🔍 Verificando links na mensagem... Encontrou? ${temLink ? "✅ SIM" : "❌ NÃO"}`);
    return temLink;
};

// Função para formatar a mensagem antes de enviá-la
const formatarMensagem = async (texto) => {
    if (!contemLinkPermitido(texto)) {
        console.log("🚫 Mensagem ignorada: contém links de sites não permitidos.");
        return null;
    }

    // Substituir links pelos links afiliados corretos
    const textoModificado = await substituirLinkAfiliado(texto);
    return `🔥 Promoção Relâmpago! 🔥\n\n${textoModificado}\n\n⚡ Promoção disponibilizada pelo *Muleke das Promos*! Aproveite antes que acabe!`;
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
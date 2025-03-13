import { Telegraf } from "telegraf";
import dotenv from "dotenv";
import axios from "axios"; // Importamos axios para expandir URLs

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const usuarioAutorizado = process.env.USUARIO_AUTORIZADO;
const grupoDestino = process.env.GRUPO_DESTINO;
const idAfiliadoAmazon = process.env.ID_AFILIADO_AMAZON;
const idAfiliadoMagalu = "magazinemulekedaspromos"; // ID correto da Magalu

// Lista de sites permitidos
const sitesPermitidos = [
    "divulgador.magalu.com",
    "magazinevoce.com.br",
    "amazon.com.br",
    "amzn.to"
];

// **1️⃣ Expressão regular para identificar links**
const regexLink = /\b(?:https?:\/\/)?(?:www\.)?[\w.-]+\.(?:com|br|to)(?:\/[^\s]*)?/gi;

// **2️⃣ Expansão de URLs encurtadas**
const expandirUrl = async (url) => {
    try {
        const response = await axios.head(url, { maxRedirects: 5 });
        return response.request.res.responseUrl || url;
    } catch (error) {
        console.error(`❌ Erro ao expandir URL: ${url}`, error.message);
        return url;
    }
};

// **3️⃣ Tratamento de links da Amazon**
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

// **4️⃣ Tratamento de links da Magalu**
const tratarLinkMagalu = async (url) => {
    let urlExpandida = await expandirUrl(url);
    if (urlExpandida.includes("magazinevoce.com.br")) {
        urlExpandida = urlExpandida.replace(/\/[\w-]+\/([^\/]+\/p\/)/, `/${idAfiliadoMagalu}/$1`);
    }
    return urlExpandida;
};

// **5️⃣ Substituir links por afiliados corretos**
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

// **6️⃣ Verificar se a mensagem contém links permitidos**
const contemLinkPermitido = (texto) => {
    return sitesPermitidos.some(site => texto.includes(site));
};

// **7️⃣ Formatar mensagem final**
const formatarMensagem = async (texto) => {
    if (!contemLinkPermitido(texto)) {
        console.log("🚫 Mensagem ignorada: contém links de sites não permitidos.");
        return null;
    }
    const textoModificado = await substituirLinkAfiliado(texto);
    return `🔥 Promoção Relâmpago! 🔥\n\n${textoModificado}\n\n⚡ Promoção disponibilizada pelo *Muleke das Promos*! Aproveite antes que acabe!`;
};

// **8️⃣ Função de delay**
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// **9️⃣ Escutar mensagens encaminhadas**
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

// **🔟 Inicia o bot**
bot.launch().then(() => {
    console.log("🤖 Bot do Telegram iniciado!");
});

// **🛠️ Tratamento de erros**
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
import { Telegraf } from "telegraf";
import dotenv from "dotenv";

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const usuarioAutorizado = process.env.USUARIO_AUTORIZADO;
const grupoDestino = process.env.GRUPO_DESTINO;

// Defina o delay em milissegundos (30 segundos para testes)
const DELAY_ENVIO = 30 * 1000;

// Função para transformar os links nos links de afiliado corretos
const transformarLinks = (texto) => {
    let novoTexto = texto;

    const regexLinks = /(https?:\/\/[^\s]+)/g;
    const linksEncontrados = texto.match(regexLinks) || [];

    linksEncontrados.forEach((link) => {
        if (link.includes("mercadolivre.com")) {
            novoTexto = novoTexto.replace(link, `🔗 [🛍️ Compre no Mercado Livre](https://mercadolivre.com/sec/1KhDTbE?mkt_source=SEU_AFILIADO)`);
        } else if (link.includes("amazon.com") || link.includes("amzn.to")) {
            novoTexto = novoTexto.replace(link, `🔗 [🛒 Compre na Amazon](https://www.amazon.com.br/dp/B08L5M9BTJ?tag=SEU_ID_AFILIADO-20)`);
        } else if (link.includes("magazineluiza.com") || link.includes("magalu.com")) {
            novoTexto = novoTexto.replace(link, `🔗 [🛍️ Compre na Magalu](https://www.magazineluiza.com.br/SEU_ID_AFILIADO)`);
        } else {
            novoTexto = novoTexto.replace(link, ""); // Remove links não reconhecidos
        }
    });

    return novoTexto.trim();
};

// Função para formatar a mensagem corretamente
const formatarMensagem = (texto) => {
    const textoCorrigido = transformarLinks(texto);

    return `🛒 **OFERTA IMPERDÍVEL!** 🎯\n\n${textoCorrigido}\n\n🚀 **Estoque limitado! Aproveite antes que acabe!**`;
};

// Função para delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Escuta mensagens encaminhadas
bot.on("message", async (ctx) => {
    const chatId = ctx.chat.id;
    const mensagem = ctx.message;

    // Verifica se a mensagem foi encaminhada e se veio do usuário autorizado
    if (mensagem.forward_date && chatId.toString() === usuarioAutorizado) {
        // Aguarda o tempo configurado antes de processar a próxima mensagem
        await delay(DELAY_ENVIO);

        if (mensagem.photo) {
            const photo = mensagem.photo[mensagem.photo.length - 1].file_id;
            const legendaFormatada = formatarMensagem(mensagem.caption || "");

            await bot.telegram.sendPhoto(grupoDestino, photo, { caption: legendaFormatada, parse_mode: "Markdown" });
            console.log(`✅ Imagem repassada com legenda: ${legendaFormatada}`);
        } else if (mensagem.text) {
            const mensagemFormatada = formatarMensagem(mensagem.text);
            await bot.telegram.sendMessage(grupoDestino, mensagemFormatada, { parse_mode: "Markdown" });
            console.log(`✅ Mensagem repassada: ${mensagemFormatada}`);
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
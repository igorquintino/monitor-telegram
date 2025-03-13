import { Telegraf } from "telegraf";
import dotenv from "dotenv";

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const usuarioAutorizado = process.env.USUARIO_AUTORIZADO;
const grupoDestino = process.env.GRUPO_DESTINO;
const linkAfiliadoMercadoLivre = process.env.LINK_AFILIADO_MERCADOLIVRE;
const linkAfiliadoMagalu = process.env.LINK_AFILIADO_MAGALU;
const linkAfiliadoAmazon = process.env.LINK_AFILIADO_AMAZON;

// Lista de domínios permitidos
const sitesPermitidos = [
    "mercadolivre.com",
    "divulgador.magalu.com",
    "amzn.to",
];

// Função para substituir links pelos links afiliados corretos
const substituirLinkAfiliado = (texto) => {
    return texto
        .replace(/(https?:\/\/(www\.)?mercadolivre\.com[^\s]+)/g, linkAfiliadoMercadoLivre)
        .replace(/(https?:\/\/(www\.)?divulgador\.magalu\.com[^\s]+)/g, linkAfiliadoMagalu)
        .replace(/(https?:\/\/(www\.)?amzn\.to[^\s]+)/g, linkAfiliadoAmazon);
};

// Função para verificar se a mensagem contém links de sites permitidos
const contemLinkPermitido = (texto) => {
    return sitesPermitidos.some(site => texto.includes(site));
};

// Função para formatar a mensagem final
const formatarMensagem = (texto) => {
    if (!contemLinkPermitido(texto)) {
        console.log("🚫 Mensagem ignorada: contém links de sites não permitidos.");
        return null;
    }

    // Substituir links por links de afiliado
    const textoModificado = substituirLinkAfiliado(texto);
    
    // Extrair apenas o link final para o CTA (Chamada para ação)
    const linkExtraido = textoModificado.match(/https?:\/\/[^\s]+/g)?.[0] || "";

    return `🔥 Promoção Encontrada! 🔥\n\n${textoModificado}\n\n🔗 Compre aqui: ${linkExtraido}`;
};

// Função de delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Escuta mensagens encaminhadas
bot.on("message", async (ctx) => {
    const chatId = ctx.chat.id;
    const mensagem = ctx.message;

    // Verifica se a mensagem foi encaminhada e se veio do usuário autorizado
    if (mensagem.forward_date && chatId.toString() === usuarioAutorizado) {
        // Aguarda o tempo configurado antes de processar a próxima mensagem
        await delay(30 * 1000); // Delay de 30 segundos (pode ser alterado)

        if (mensagem.photo) {
            const photo = mensagem.photo[mensagem.photo.length - 1].file_id;
            const legendaFormatada = formatarMensagem(mensagem.caption || "");

            if (legendaFormatada) {
                await bot.telegram.sendPhoto(grupoDestino, photo, { caption: legendaFormatada });
                console.log(`✅ Imagem repassada com legenda: ${legendaFormatada}`);
            }
        } else if (mensagem.text) {
            const mensagemFormatada = formatarMensagem(mensagem.text);
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
import { Telegraf } from "telegraf";
import dotenv from "dotenv";

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const usuarioAutorizado = process.env.USUARIO_AUTORIZADO;
const grupoDestino = process.env.GRUPO_DESTINO;

// IDs de afiliado
const idAfiliadoMercadoLivre = process.env.ID_AFILIADO_MERCADOLIVRE;
const idAfiliadoMagalu = process.env.ID_AFILIADO_MAGALU;
const idAfiliadoAmazon = process.env.ID_AFILIADO_AMAZON;

// Lista de domínios permitidos e como modificar os links
const linksAfiliados = [
    { domain: "mercadolivre.com", param: "?mkt_source=" + idAfiliadoMercadoLivre },
    { domain: "divulgador.magalu.com", param: "?partner_id=" + idAfiliadoMagalu },
    { domain: "amazon.com.br", param: "?tag=" + idAfiliadoAmazon },
    { domain: "amzn.to", param: "?tag=" + idAfiliadoAmazon }
];

// Defina o delay em milissegundos
const DELAY_ENVIO = 30 * 1000; 

// Função para modificar os links da mensagem e adicionar o ID de afiliado
const modificarLinksAfiliados = (texto) => {
    return texto.replace(/https?:\/\/[^\s]+/g, (match) => {
        for (let site of linksAfiliados) {
            if (match.includes(site.domain)) {
                // Se o link já contém parâmetros, adiciona um "&", senão, usa "?"
                return match.includes("?") ? `${match}&${site.param}` : `${match}${site.param}`;
            }
        }
        return match; // Se não for um link permitido, mantém como está
    });
};

// Função para formatar a mensagem final
const formatarMensagem = (texto) => {
    const mensagemModificada = modificarLinksAfiliados(texto);
    
    if (!mensagemModificada.includes("mercadolivre.com") &&
        !mensagemModificada.includes("divulgador.magalu.com") &&
        !mensagemModificada.includes("amazon.com") &&
        !mensagemModificada.includes("amzn.to")) {
        console.log("🚫 Mensagem ignorada: contém links de sites não permitidos.");
        return null;
    }

    return `🔥 Promoção Encontrada! 🔥\n\n${mensagemModificada}`;
};

// Função de delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Escuta mensagens encaminhadas
bot.on("message", async (ctx) => {
    const chatId = ctx.chat.id;
    const mensagem = ctx.message;

    if (mensagem.forward_date && chatId.toString() === usuarioAutorizado) {
        await delay(DELAY_ENVIO);

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
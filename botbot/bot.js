import { Telegraf } from "telegraf";
import dotenv from "dotenv";

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const usuarioAutorizado = process.env.USUARIO_AUTORIZADO;
const grupoDestino = process.env.GRUPO_DESTINO;

// Links de afiliado para cada site
const LINKS_AFILIADOS = {
    "mercadolivre.com": "SEU_LINK_AFILIADO_MERCADOLIVRE",
    "magazineluiza.com": "SEU_LINK_AFILIADO_MAGALU",
    "amazon.com.br": "SEU_LINK_AFILIADO_AMAZON"
};

// Defina o delay em milissegundos (30 segundos para testes)
const DELAY_ENVIO = 30 * 1000; // Altere esse valor para mudar o delay

// Função para extrair e substituir links de afiliado
const substituirLinksAfiliados = (texto) => {
    let mensagemFormatada = texto;
    let encontrouLinkPermitido = false;

    mensagemFormatada = mensagemFormatada.replace(/(https?:\/\/[^\s]+)/g, (match) => {
        try {
            const url = new URL(match);
            const dominio = url.hostname.replace("www.", "");

            if (LINKS_AFILIADOS[dominio]) {
                encontrouLinkPermitido = true;
                return `🔗 Compre aqui: ${LINKS_AFILIADOS[dominio]}`;
            }
        } catch (error) {
            return "";
        }
        return "";
    });

    return encontrouLinkPermitido ? mensagemFormatada.trim() : null;
};

// Função para delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Escuta mensagens encaminhadas
bot.on("message", async (ctx) => {
    const chatId = ctx.chat.id;
    const mensagem = ctx.message;

    // Verifica se a mensagem foi encaminhada e se veio do usuário autorizado
    if (mensagem.forward_date && chatId.toString() === usuarioAutorizado) {
        let mensagemTexto = mensagem.text || (mensagem.caption ? mensagem.caption : "");

        // Substitui os links de afiliado e verifica se há links permitidos
        const mensagemFormatada = substituirLinksAfiliados(mensagemTexto);

        // Se a mensagem não contiver links permitidos, ignora
        if (!mensagemFormatada) {
            console.log("🚫 Mensagem ignorada: contém links de sites não permitidos.");
            return;
        }

        // Aguarda o tempo configurado antes de processar a próxima mensagem
        await delay(DELAY_ENVIO);

        if (mensagem.photo) {
            const photo = mensagem.photo[mensagem.photo.length - 1].file_id;
            await bot.telegram.sendPhoto(grupoDestino, photo, { caption: mensagemFormatada });
            console.log(`✅ Imagem repassada com legenda: ${mensagemFormatada}`);
        } else {
            await bot.telegram.sendMessage(grupoDestino, mensagemFormatada);
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
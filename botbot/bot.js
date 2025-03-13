import { Telegraf } from "telegraf";
import dotenv from "dotenv";

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const usuarioAutorizado = process.env.USUARIO_AUTORIZADO;
const grupoDestino = process.env.GRUPO_DESTINO;
const linkAfiliado = process.env.LINK_AFILIADO;

const filaMensagens = []; // Fila para armazenar mensagens a serem enviadas

// Função para formatar a mensagem com o link de afiliado
const formatarMensagem = (texto) => {
    return `🔥 Promoção Encontrada! 🔥\n\n${texto}\n\n🔗 Compre aqui: ${linkAfiliado}`;
};

// Função para processar a fila de mensagens com delay de 5 minutos
const processarFila = async () => {
    if (filaMensagens.length > 0) {
        const { tipo, conteudo } = filaMensagens.shift();

        if (tipo === "texto") {
            await bot.telegram.sendMessage(grupoDestino, conteudo);
        } else if (tipo === "imagem") {
            await bot.telegram.sendPhoto(grupoDestino, conteudo);
        }

        console.log(`✅ Mensagem enviada: ${conteudo}`);
        
        // Aguarda 5 minutos antes de processar a próxima mensagem
        setTimeout(processarFila, 5 * 60 * 1000);
    }
};

// Escuta mensagens encaminhadas
bot.on("message", async (ctx) => {
    const chatId = ctx.chat.id;
    const mensagem = ctx.message;

    // Verifica se a mensagem foi encaminhada e se veio do usuário autorizado
    if (mensagem.forward_date && chatId.toString() === usuarioAutorizado) {
        if (mensagem.text) {
            // Adiciona a mensagem de texto na fila
            filaMensagens.push({ tipo: "texto", conteudo: formatarMensagem(mensagem.text) });
        } else if (mensagem.photo) {
            // Obtém a melhor qualidade da imagem enviada
            const photo = mensagem.photo[mensagem.photo.length - 1].file_id;
            filaMensagens.push({ tipo: "imagem", conteudo: photo });
        }

        console.log("✅ Mensagem adicionada à fila.");

        // Se for a primeira mensagem da fila, inicia o processamento
        if (filaMensagens.length === 1) {
            processarFila();
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
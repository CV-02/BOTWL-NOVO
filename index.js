import express from "express";
import {
    Client,
    GatewayIntentBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    PermissionsBitField,
    EmbedBuilder,
} from "discord.js";
import { Sequelize, DataTypes } from "sequelize";
import axios from "axios";
import dotenv from "dotenv";
import moment from "moment-timezone"; // Biblioteca para formatar data/hora

dotenv.config();

// Criar servidor Express para evitar erro de "Port Scan Timeout" na Render
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.send("Bot está rodando!");
});

app.listen(PORT, () => {
    console.log(`🌍 Servidor HTTP rodando na porta ${PORT}`);
});

// Criar cliente do bot
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.MessageContent,
    ],
});

// Conectar ao banco de dados SQLite
const sequelize = new Sequelize({
    dialect: "sqlite",
    storage: "whitelist.db",
});

const Whitelist = sequelize.define("Whitelist", {
    userId: { type: DataTypes.STRING, unique: true, primaryKey: true },
    nome: DataTypes.STRING,
    id: DataTypes.STRING,
    recrutadorNome: DataTypes.STRING,
    recrutadorId: DataTypes.STRING,
});

// **NOVOS IDs para o novo servidor**
let CHANNEL_WL_BUTTON = "ID_CANAL_BOTAO_WL";
let CHANNEL_WL_REQUESTS = "ID_CANAL_SOLICITACOES_WL";
let CHANNEL_WL_RESULTS = "ID_CANAL_RESULTADOS_WL";
let CHANNEL_KEEP_ALIVE = "ID_CANAL_KEEP_ALIVE";
let ROLE_MEMBER = "ID_CARGO_MEMBRO";

// ✅ **Função Keep-Alive para evitar hibernação**
let keepAliveMessage;
async function keep_alive_loop() {
    setInterval(async () => {
        try {
            const channel = await client.channels.fetch(CHANNEL_KEEP_ALIVE).catch(console.error);
            if (channel) {
                const dataHora = moment().tz("America/Sao_Paulo").format("DD/MM/YYYY HH:mm:ss");
                const mensagem = `✅ **Bot funcionando!** 📅 **Data/Hora:** ${dataHora}`;

                if (keepAliveMessage) {
                    await keepAliveMessage.edit(mensagem).catch(console.error);
                } else {
                    keepAliveMessage = await channel.send(mensagem).catch(console.error);
                }
                console.log(`📌 Log atualizado no Discord: ${mensagem}`);
            }
        } catch (error) {
            console.error("❌ Erro no Keep-Alive:", error);
        }

        axios.get("https://seu-bot.onrender.com/").catch((err) => console.error("Erro no Keep-Alive HTTP:", err));
    }, 120000);
}

// ✅ **Painel de Status do Bot**
let statusMessage;
async function updateBotStatus() {
    const channel = await client.channels.fetch(CHANNEL_KEEP_ALIVE).catch(console.error);
    if (!channel) return console.error("❌ Canal de Status não encontrado!");

    const uptime = Math.floor(client.uptime / 1000);
    const ping = client.ws.ping;
    const servidores = client.guilds.cache.size;

    const embed = new EmbedBuilder()
        .setTitle("📊 Painel de Status do Bot")
        .setColor("Blue")
        .addFields(
            { name: "🟢 Online há", value: `<t:${Math.floor(Date.now() / 1000 - uptime)}:R>`, inline: true },
            { name: "📡 Ping", value: `${ping}ms`, inline: true },
            { name: "🌎 Servidores", value: `${servidores}`, inline: true }
        )
        .setFooter({ text: `Última atualização` })
        .setTimestamp();

    if (statusMessage) {
        await statusMessage.edit({ embeds: [embed] }).catch(console.error);
    } else {
        statusMessage = await channel.send({ embeds: [embed] }).catch(console.error);
    }
}

// Atualiza o status a cada 5 minutos
setInterval(updateBotStatus, 300000);

// ✅ **Criar canais automaticamente caso não existam**
client.once("ready", async () => {
    await sequelize.sync();
    console.log(`✅ Bot online como ${client.user.tag}`);

    keep_alive_loop(); // ✅ Agora a função já foi definida antes de ser chamada
    updateBotStatus();
});

client.login(process.env.TOKEN);

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
} from "discord.js";
import { Sequelize, DataTypes } from "sequelize";
import axios from "axios";
import dotenv from "dotenv";
import moment from "moment-timezone";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.send("Bot está rodando!");
});

app.listen(PORT, () => {
    console.log(`🌍 Servidor HTTP rodando na porta ${PORT}`);
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
    ],
});

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

client.once("ready", async () => {
    await sequelize.sync();
    console.log(`✅ Bot online como ${client.user.tag}`);

    const guild = client.guilds.cache.first();
    if (!guild) return console.error("Nenhuma guilda encontrada!");

    const channels = {
        whitelistButton: "Whitelist (Botão da WL)",
        whitelistRequests: "Solicitações de WL",
        whitelistResults: "Resultados (Apenas aprovados)",
        keepAlive: "keep-alive-log"
    };

    let createdChannels = {};
    for (const [key, name] of Object.entries(channels)) {
        let channel = guild.channels.cache.find(c => c.name === name);
        if (!channel) {
            channel = await guild.channels.create({
                name,
                type: 0, 
                permissionOverwrites: [
                    {
                        id: guild.id,
                        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                    },
                ],
            });
        }
        createdChannels[key] = channel.id;
    }

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("start_wl")
            .setLabel("📋 Iniciar Whitelist")
            .setStyle(ButtonStyle.Primary),
    );

    const buttonChannel = await client.channels.fetch(createdChannels.whitelistButton).catch(console.error);
    if (buttonChannel) {
        await buttonChannel.send({
            content: "**Clique no botão abaixo para iniciar a Whitelist!**",
            components: [row],
        });
    }

    keep_alive_loop(createdChannels.keepAlive);
});

async function keep_alive_loop(channelId) {
    let keepAliveMessage;
    setInterval(async () => {
        try {
            const channel = await client.channels.fetch(channelId).catch(console.error);
            if (channel) {
                const dataHora = moment().tz("America/Sao_Paulo").format("DD/MM/YYYY HH:mm:ss");
                const mensagem = `✅ **Bot funcionando perfeitamente!** 📅 **Data/Hora:** ${dataHora}`;
                if (keepAliveMessage) {
                    await keepAliveMessage.edit(mensagem).catch(console.error);
                } else {
                    keepAliveMessage = await channel.send(mensagem).catch(console.error);
                }
                console.log(`📌 Log atualizado no Discord: ${mensagem}`);
            }
        } catch (error) {
            console.error("❌ Erro ao enviar Keep-Alive no Discord:", error);
        }
        axios.get("https://seu-bot.onrender.com/")
            .then(() => console.log("🔄 Keep-Alive no Render funcionando!"))
            .catch((err) => console.error("Erro no Keep-Alive HTTP:", err));
    }, 120000);
}

client.on("interactionCreate", async (interaction) => {
    try {
        console.log("Interação recebida:", interaction.customId);
        if (interaction.isButton() && interaction.customId === "start_wl") {
            const modal = new ModalBuilder()
                .setCustomId("wl_form")
                .setTitle("Whitelist")
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("nome")
                            .setLabel("Digite seu nome")
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true),
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("id")
                            .setLabel("Digite seu ID")
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true),
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("recrutadorNome")
                            .setLabel("Nome do Recrutador")
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true),
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("recrutadorId")
                            .setLabel("ID do Recrutador")
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true),
                    ),
                );
            await interaction.showModal(modal);
        }
    } catch (error) {
        console.error("Erro ao processar interação:", error);
        await interaction.reply({
            content: "❌ Ocorreu um erro ao processar sua whitelist. Tente novamente!",
            ephemeral: true,
        });
    }
});

client.login(process.env.TOKEN);

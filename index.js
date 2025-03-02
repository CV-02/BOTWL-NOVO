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

// ✅ **Criar canais automaticamente caso não existam**
client.once("ready", async () => {
    await sequelize.sync();
    console.log(`✅ Bot online como ${client.user.tag}`);

    const guild = client.guilds.cache.first();
    if (!guild) {
        console.error("❌ Servidor não encontrado!");
        return;
    }

    async function createChannel(name, type) {
        const existingChannel = guild.channels.cache.find(c => c.name === name);
        if (existingChannel) return existingChannel.id;

        const newChannel = await guild.channels.create({
            name,
            type,
            permissionOverwrites: [
                {
                    id: guild.roles.everyone,
                    allow: [PermissionsBitField.Flags.ViewChannel],
                },
            ],
        });

        console.log(`📌 Canal criado: ${name} (ID: ${newChannel.id})`);
        return newChannel.id;
    }

    // Criar canais automaticamente
    CHANNEL_WL_BUTTON = await createChannel("whitelist-botao", 0);
    CHANNEL_WL_REQUESTS = await createChannel("whitelist-solicitacoes", 0);
    CHANNEL_WL_RESULTS = await createChannel("whitelist-resultados", 0);
    CHANNEL_KEEP_ALIVE = await createChannel("bot-logs", 0);

    // Criar cargo automaticamente se não existir
    let role = guild.roles.cache.find(r => r.name === "Membro");
    if (!role) {
        role = await guild.roles.create({
            name: "Membro",
            permissions: [],
        });
        console.log(`📌 Cargo criado: Membro (ID: ${role.id})`);
    }
    ROLE_MEMBER = role.id;

    // Enviar botão de Whitelist
    const channel = await client.channels.fetch(CHANNEL_WL_BUTTON).catch(console.error);
    if (channel) {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("start_wl")
                .setLabel("📋 Iniciar Whitelist")
                .setStyle(ButtonStyle.Primary),
        );
        await channel.send({
            content: "**Clique no botão abaixo para iniciar a Whitelist!**",
            components: [row],
        });
    }

    keep_alive_loop();
    updateBotStatus();
});

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

// ✅ **Resultados da Whitelist em Formato de Painel**
client.on("interactionCreate", async (interaction) => {
    if (interaction.isButton() && interaction.customId === "start_wl") {
        const modal = new ModalBuilder()
            .setCustomId("wl_form")
            .setTitle("Whitelist")
            .addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId("nome").setLabel("Nome").setStyle(TextInputStyle.Short).setRequired(true),
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId("id").setLabel("ID").setStyle(TextInputStyle.Short).setRequired(true),
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId("recrutadorNome").setLabel("Nome do Recrutador").setStyle(TextInputStyle.Short).setRequired(true),
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId("recrutadorId").setLabel("ID do Recrutador").setStyle(TextInputStyle.Short).setRequired(true),
                ),
            );

        await interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId === "wl_form") {
        const nome = interaction.fields.getTextInputValue("nome");
        const id = interaction.fields.getTextInputValue("id");
        const recrutadorNome = interaction.fields.getTextInputValue("recrutadorNome");
        const recrutadorId = interaction.fields.getTextInputValue("recrutadorId");
        const user = interaction.user;

        const embed = new EmbedBuilder()
            .setTitle("✅ Whitelist Aprovada!")
            .setColor("Green")
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: "👤 Nome", value: nome, inline: true },
                { name: "🆔 ID", value: id, inline: true },
                { name: "📜 Recrutador", value: recrutadorNome, inline: true },
                { name: "🔑 ID do Recrutador", value: recrutadorId, inline: true }
            )
            .setTimestamp();

        const resultsChannel = client.channels.cache.get(CHANNEL_WL_RESULTS);
        if (resultsChannel) {
            await resultsChannel.send({ embeds: [embed] });
        }

        await interaction.reply({ content: "✅ WL enviada!", ephemeral: true });
    }
});

client.login(process.env.TOKEN);

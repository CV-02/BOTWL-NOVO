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
    EmbedBuilder
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
        whitelistButton: "whitelist-botao",
        whitelistRequests: "solicitacoes-de-wl",
        whitelistResults: "resultados-apenas-aprovados",
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
});

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
        } else if (interaction.isModalSubmit() && interaction.customId === "wl_form") {
            await interaction.deferReply({ ephemeral: true });
            
            const nome = interaction.fields.getTextInputValue("nome");
            const id = interaction.fields.getTextInputValue("id");
            const recrutadorNome = interaction.fields.getTextInputValue("recrutadorNome");
            const recrutadorId = interaction.fields.getTextInputValue("recrutadorId");
            const user = interaction.user;

            await Whitelist.upsert({
                userId: user.id,
                nome,
                id,
                recrutadorNome,
                recrutadorId,
            });

            const embed = new EmbedBuilder()
                .setColor("#00ff00")
                .setTitle("✅ Novo Usuário Aprovado na Whitelist")
                .addFields(
                    { name: "👤 Nome:", value: nome, inline: true },
                    { name: "🆔 ID:", value: id, inline: true },
                    { name: "📝 Recrutador:", value: recrutadorNome, inline: true },
                    { name: "🔢 ID do Recrutador:", value: recrutadorId, inline: true },
                )
                .setFooter({ text: `Aprovado por ${user.tag}`, iconURL: user.displayAvatarURL() })
                .setTimestamp();

            const resultsChannel = interaction.guild.channels.cache.find(channel => channel.name === "resultados-apenas-aprovados");
            if (resultsChannel) {
                await resultsChannel.send({ embeds: [embed] });
            }

            await interaction.followUp({
                content: "✅ Whitelist enviada com sucesso! Seu resultado foi registrado.",
                ephemeral: true,
            });
        }
    } catch (error) {
        console.error("Erro ao processar interação:", error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: "❌ Ocorreu um erro ao processar sua whitelist. Tente novamente!",
                ephemeral: true,
            });
        }
    }
});

client.login(process.env.TOKEN);

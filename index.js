import { Client, GatewayIntentBits, PermissionsBitField, EmbedBuilder } from "discord.js";
import express from "express";
import dotenv from "dotenv";

dotenv.config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

// Configuração de cargos e suas siglas com base nos IDs fornecidos
const roleHierarchy = [
    { id: "1336379818781966347", name: "👑[Lider]" },
    { id: "1336379726675050537", name: "🥇[Sub]" },
    { id: "1336379564766527582", name: "🏅[G.G]" },
    { id: "1344093359601619015", name: "🔫[G.A]" },
    { id: "1341206842776359045", name: "💸[G.V]" },
    { id: "1336465729016303768", name: "🧰[G.R]" },
    { id: "1281863970676019253", name: "💎[REC]" },
    { id: "1336412910582366349", name: "🎯[ELITE]" },
    { id: "1336410539663949935", name: "🎯[ELITE]" }
];

const PANEL_CHANNEL_ID = "1336402917779050597"; // Canal de hierarquia
const updateQueue = new Map(); // Evita atualizações consecutivas

client.once("ready", async () => {
    console.log(`✅ Bot online como ${client.user.tag}`);
    await updateRolePanel();
});

client.on("guildMemberUpdate", async (oldMember, newMember) => {
    try {
        if (updateQueue.has(newMember.id)) {
            clearTimeout(updateQueue.get(newMember.id));
        }

        updateQueue.set(newMember.id, setTimeout(async () => {
            const roles = newMember.roles.cache.map(role => role.id);
            let newNickname = newMember.user.username;

            for (const role of roleHierarchy) {
                if (roles.includes(role.id)) {
                    newNickname = `${role.name} ${newNickname}`;
                    break;
                }
            }

            if (newNickname.length > 32) {
                newNickname = newNickname.substring(0, 32);
            }

            if (newNickname !== newMember.nickname) {
                await newMember.setNickname(newNickname).catch(console.error);
                console.log(`🔄 Nick atualizado para: ${newNickname}`);
            }

            updateQueue.delete(newMember.id);
            await updateRolePanel();
        }, 1000));

    } catch (error) {
        console.error("❌ Erro ao atualizar nickname:", error);
    }
});

async function updateRolePanel() {
    try {
        const guild = client.guilds.cache.first();
        if (!guild) return console.error("❌ Servidor não encontrado!");

        const channel = await client.channels.fetch(PANEL_CHANNEL_ID);
        if (!channel) return console.error("❌ Canal de painel não encontrado!");

        const embed = new EmbedBuilder()
            .setTitle("📜 Hierarquia dos Cargos")
            .setDescription("Aqui está a hierarquia da facção e seus membros:")
            .setColor(0x0000FF)
            .setFooter({ text: "Facção RP" });

        const allMembers = await guild.members.fetch();
        const assignedMembers = new Set();

        for (const role of roleHierarchy) {
            const membersInRole = allMembers.filter(member => 
                member.roles.cache.has(role.id) && !assignedMembers.has(member.id)
            );

            membersInRole.forEach(member => assignedMembers.add(member.id));

            const memberList = membersInRole.map(member => `<@${member.id}>`).join("\n") || "Nenhum membro";
            embed.addFields({ name: role.name, value: memberList, inline: false });
        }

        const messages = await channel.messages.fetch();
        if (messages.size > 0) {
            await messages.first().delete().catch(console.error);
        }
        await channel.send({ embeds: [embed] });

        console.log("✅ Painel de hierarquia atualizado!");
    } catch (error) {
        console.error("❌ Erro ao atualizar o painel de hierarquia:", error);
    }
}

client.login(process.env.TOKEN);

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.send("Bot está rodando!");
});

app.listen(PORT, () => {
    console.log(`🌍 Servidor HTTP rodando na porta ${PORT}`);
});

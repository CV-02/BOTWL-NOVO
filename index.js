import { Client, GatewayIntentBits, TextChannel } from "discord.js";
import express from "express";
import dotenv from "dotenv";

dotenv.config();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

// Configuração de cargos e siglas
const rolePrefixes = {
    "1336379818781966347": "👑[Líder]",
    "1336379726675050537": "🥇[Sublíder]",
    "1336379564766527582": "🏅[G.G]",
    "1344093359601619015": "🔫[G.A]",
    "1341206842776359045": "💸[G.V]",
    "1336465729016303768": "🧰[G.R]",
    "1281863970676019253": "💎[REC]",
    "1336412910582366349": "🎮[RES.ELITE]",
    "1336410539663949935": "🎯[ELITE]" // 🎯 agora aparece corretamente!
};

const PANEL_CHANNEL_ID = "1336402917779050597"; // Canal da hierarquia
let hierarchyMessageId = null; // ID da mensagem fixa do painel

client.once("ready", async () => {
    console.log(`✅ Bot online como ${client.user.tag}`);
    await updateRolePanel(); // Atualiza a hierarquia assim que iniciar
});

// Atualiza a hierarquia sempre que um membro ganha ou perde um cargo
client.on("guildMemberUpdate", async () => {
    try {
        await updateRolePanel();
    } catch (error) {
        console.error("❌ Erro ao atualizar a hierarquia:", error);
    }
});

// Função para atualizar a hierarquia da facção
async function updateRolePanel() {
    try {
        const guild = client.guilds.cache.first();
        if (!guild) return console.error("❌ Servidor não encontrado!");

        const channel = await client.channels.fetch(PANEL_CHANNEL_ID);
        if (!channel || !(channel instanceof TextChannel)) {
            return console.error("❌ Canal de hierarquia não encontrado ou inválido!");
        }

        let hierarchyText = `📜 **Hierarquia da Facção**\n\n`;

        let assignedMembers = new Set();

        for (const [roleId, rolePrefix] of Object.entries(rolePrefixes)) {
            const role = await guild.roles.fetch(roleId);
            if (!role) continue;

            // Filtra membros para evitar duplicações
            const members = role.members
                .filter(member => {
                    if (assignedMembers.has(member.id)) return false;
                    assignedMembers.add(member.id);
                    return true;
                })
                .map(member => `👤 <@${member.id}>`)
                .join("\n") || "*Nenhum membro*";

            hierarchyText += `**${rolePrefix}**\n${members}\n\n`;
        }

        // Verifica se já há uma mensagem fixa no canal
        const messages = await channel.messages.fetch({ limit: 10 });
        if (!hierarchyMessageId) {
            const existingMessage = messages.find(msg => msg.author.id === client.user.id);
            if (existingMessage) {
                hierarchyMessageId = existingMessage.id;
            }
        }

        if (hierarchyMessageId) {
            // Edita a mensagem existente para manter o painel fixo
            const msg = await channel.messages.fetch(hierarchyMessageId);
            await msg.edit(hierarchyText);
        } else {
            // Envia uma nova mensagem e salva o ID
            const newMessage = await channel.send(hierarchyText);
            hierarchyMessageId = newMessage.id;
        }

        console.log("✅ Hierarquia atualizada!");
    } catch (error) {
        console.error("❌ Erro ao atualizar a hierarquia:", error);
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

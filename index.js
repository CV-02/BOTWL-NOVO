import { Client, GatewayIntentBits } from "discord.js";
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
    "1336410539663949935": "🎯[ELITE]"
};

const roleNames = {
    "1336379818781966347": "Líder",
    "1336379726675050537": "Sublíder",
    "1336379564766527582": "Gerente Geral",
    "1344093359601619015": "Gerente de Ação",
    "1341206842776359045": "Gerente de Vendas",
    "1336465729016303768": "Gerente de Recrutamento",
    "1281863970676019253": "Recrutador",
    "1336412910582366349": "Responsável Elite",
    "1336410539663949935": "ELITE"
};

const PANEL_CHANNEL_ID = "1336402917779050597"; // Canal da hierarquia

client.once("ready", async () => {
    console.log(`✅ Bot online como ${client.user.tag}`);
    await updateRolePanel(); // Atualiza a hierarquia assim que iniciar
});

client.on("guildMemberUpdate", async () => {
    try {
        await updateRolePanel();
    } catch (error) {
        console.error("❌ Erro ao atualizar a hierarquia:", error);
    }
});

async function updateRolePanel() {
    try {
        const guild = client.guilds.cache.first();
        if (!guild) return console.error("❌ Servidor não encontrado!");

        const channel = await client.channels.fetch(PANEL_CHANNEL_ID);
        if (!channel) return console.error("❌ Canal de hierarquia não encontrado!");

        let hierarchyText = `📜 **Hierarquia da Facção**\n\n`;

        let assignedMembers = new Set();

        for (const [roleId, roleName] of Object.entries(roleNames)) {
            const role = await guild.roles.fetch(roleId);
            if (!role) continue;

            const members = role.members
                .filter(member => {
                    if (assignedMembers.has(member.id)) return false;
                    assignedMembers.add(member.id);
                    return true;
                })
                .map(member => `👤 <@${member.id}>`)
                .join("\n") || "*Nenhum membro*";

            const rolePrefix = rolePrefixes[roleId] || roleName; // Usa a sigla com emoji

            hierarchyText += `**${rolePrefix}**\n${members}\n\n`;
        }

        const messages = await channel.messages.fetch();
        if (messages.size > 0) {
            await messages.first().delete().catch(console.error);
        }
        await channel.send(hierarchyText);

        console.log("✅ Hierarquia enviada!");
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

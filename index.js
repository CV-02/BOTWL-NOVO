import { Client, GatewayIntentBits, TextChannel } from "discord.js";
import express from "express";
import dotenv from "dotenv";

dotenv.config();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

// Configuração de cargos e siglas para os nomes dos membros
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

// Configuração de nomes completos para o painel de hierarquia
const roleDisplayNames = {
    "1336379818781966347": "👑 Líder",
    "1336379726675050537": "🥇 Sublíder",
    "1336379564766527582": "🏅 Gerente Geral",
    "1344093359601619015": "🔫 Gerente de Ação",
    "1341206842776359045": "💸 Gerente de Vendas",
    "1336465729016303768": "🧰 Gerente de Recrutamento",
    "1281863970676019253": "💎 Recrutador",
    "1336412910582366349": "🎮 Responsável Elite",
    "1336410539663949935": "🎯 Elite"
};

const PANEL_CHANNEL_ID = "1336402917779050597"; // Canal da hierarquia
let hierarchyMessageId = null; // ID da mensagem fixa do painel

client.once("ready", async () => {
    console.log(`✅ Bot online como ${client.user.tag}`);
    await loadHierarchyMessageId(); // Recupera a mensagem do painel se já existir
    await updateRolePanel(); // Atualiza a hierarquia assim que iniciar
});

// Monitora mudanças nos cargos dos membros
client.on("guildMemberUpdate", async (oldMember, newMember) => {
    try {
        await updateMemberNickname(newMember);
        await updateRolePanel();
    } catch (error) {
        console.error("❌ Erro ao atualizar:", error);
    }
});

// **Função para atualizar o nome do membro sem apagar o nome original**
async function updateMemberNickname(member) {
    try {
        let currentPrefix = null;

        // Identifica a sigla do cargo do membro
        for (const [roleId, prefix] of Object.entries(rolePrefixes)) {
            if (member.roles.cache.has(roleId)) {
                currentPrefix = prefix;
                break; // Para no primeiro cargo encontrado (prioridade)
            }
        }

        // **Preserva tudo depois do "]" e edita apenas a sigla**
        let originalName = member.displayName;
        let cleanName = originalName.replace(/^[^\]]+\]\s*/, ""); // Remove qualquer sigla antiga sem apagar o nome
        const newNickname = currentPrefix ? `${currentPrefix} ${cleanName}` : cleanName;

        // Atualiza apenas se for necessário
        if (originalName !== newNickname) {
            await member.setNickname(newNickname).catch(console.error);
            console.log(`✅ Nome atualizado: ${newNickname}`);
        }
    } catch (error) {
        console.error("❌ Erro ao atualizar nome do membro:", error);
    }
}

// **Função para carregar a mensagem existente do painel de hierarquia**
async function loadHierarchyMessageId() {
    try {
        const channel = await client.channels.fetch(PANEL_CHANNEL_ID);
        if (!channel || !(channel instanceof TextChannel)) {
            return console.error("❌ Canal de hierarquia não encontrado ou inválido!");
        }

        const messages = await channel.messages.fetch({ limit: 10 });
        const existingMessage = messages.find(msg => msg.author.id === client.user.id);

        if (existingMessage) {
            hierarchyMessageId = existingMessage.id;
            console.log(`📌 Mensagem de hierarquia encontrada: ${hierarchyMessageId}`);
        }
    } catch (error) {
        console.error("❌ Erro ao carregar a mensagem de hierarquia:", error);
    }
}

// **Função para atualizar o painel da hierarquia**
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

        for (const [roleId, displayName] of Object.entries(roleDisplayNames)) {
            const role = await guild.roles.fetch(roleId);
            if (!role) continue;

            // Lista os membros sem repetir a sigla
            const members = role.members
                .filter(member => {
                    if (assignedMembers.has(member.id)) return false; // Evita duplicação
                    assignedMembers.add(member.id);
                    return true;
                })
                .map(member => `👤 <@${member.id}>`) // Apenas o nome do membro
                .join("\n") || "*Nenhum membro*";

            hierarchyText += `**${displayName}**\n${members}\n\n`;
        }

        // **Se a mensagem de hierarquia já existir, apenas edita**
        if (hierarchyMessageId) {
            try {
                const msg = await channel.messages.fetch(hierarchyMessageId);
                await msg.edit(hierarchyText);
                console.log("✅ Hierarquia atualizada com sucesso!");
            } catch (error) {
                console.error("❌ Erro ao editar a mensagem, criando uma nova...");
                const newMessage = await channel.send(hierarchyText);
                hierarchyMessageId = newMessage.id;
            }
        } else {
            // **Se não existir, cria uma nova**
            const newMessage = await channel.send(hierarchyText);
            hierarchyMessageId = newMessage.id;
            console.log("✅ Hierarquia criada e mensagem salva!");
        }
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

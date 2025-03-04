import { Client, GatewayIntentBits, PermissionsBitField, EmbedBuilder, Colors } from "discord.js";
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
const rolePrefixes = {
    "1336379818781966347": "👑[Lider]",
    "1336379726675050537": "🥇[Sub]",
    "1336379564766527582": "🏅[G.G]",
    "1344093359601619015": "🔫[G.A]",
    "1341206842776359045": "💸[G.V]",
    "1336465729016303768": "🧰[G.R]",
    "1281863970676019253": "💎[REC]",
    "1336412910582366349": "🎯[ELITE]",
    "1336410539663949935": "🎯[ELITE]"
};

const PANEL_CHANNEL_ID = "1336402917779050597"; // Canal para exibir a hierarquia dos cargos

// Mapeamento para evitar múltiplas atualizações simultâneas
const updateQueue = new Map();

client.once("ready", async () => {
    console.log(`✅ Bot online como ${client.user.tag}`);
    await updateRolePanel();
});

client.on("guildMemberUpdate", async (oldMember, newMember) => {
    try {
        const guild = newMember.guild;
        
        // Se já houver uma atualização em andamento para este membro, cancela a anterior
        if (updateQueue.has(newMember.id)) {
            clearTimeout(updateQueue.get(newMember.id));
        }
        
        updateQueue.set(newMember.id, setTimeout(async () => {
            // Obtém os cargos do usuário ordenados pela posição hierárquica no servidor
            const roles = newMember.roles.cache
                .filter(role => role.id in rolePrefixes)
                .sort((a, b) => b.position - a.position);

            // Obtém o apelido atual e remove qualquer sigla de cargo antiga com emojis e colchetes []
            let currentNickname = newMember.nickname || newMember.user.username;
            let baseName = currentNickname.replace(/([\p{Emoji}\p{Extended_Pictographic}]?\[[^\]]*\])/gu, "").trim();
            
            let newNickname = baseName;
            
            if (roles.size > 0) {
                // Obtém a sigla do cargo mais alto e aplica antes do último colchete encontrado
                const highestRole = roles.first();
                const prefix = rolePrefixes[highestRole.id];
                
                // Garante que o nome completo não ultrapasse 32 caracteres
                if ((prefix.length + newNickname.length + 1) <= 32) {
                    newNickname = `${prefix} ${newNickname}`.trim();
                } else {
                    newNickname = `${prefix} ${newNickname.substring(0, 32 - prefix.length - 1)}`.trim();
                }
            }
            
            if (newNickname !== currentNickname) {
                await newMember.setNickname(newNickname).catch(console.error);
                console.log(`🔄 Nick atualizado para: ${newNickname}`);
            }
            
            updateQueue.delete(newMember.id);
            await updateRolePanel();
        }, 1000)); // Tempo de espera de 1 segundo para evitar conflitos de atualização rápida
        
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
            .setColor(Colors.Blue)
            .setFooter({ text: "Facção RP" });

        for (const [roleId, roleName] of Object.entries(rolePrefixes)) {
            const role = guild.roles.cache.get(roleId);
            if (!role) continue;

            const members = role.members.map(member => `<@${member.id}>`).join("\n") || "Nenhum membro";
            embed.addFields({ name: roleName, value: members, inline: false });
        }

        const messages = await channel.messages.fetch();
        if (messages.size > 0) {
            await messages.first().edit({ embeds: [embed] });
        } else {
            await channel.send({ embeds: [embed] });
        }
        console.log("✅ Painel de hierarquia atualizado!");
    } catch (error) {
        console.error("❌ Erro ao atualizar o painel de hierarquia:", error);
    }
}

client.login(process.env.TOKEN);

// Servidor Express para manter o bot online
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.send("Bot está rodando!");
});

app.listen(PORT, () => {
    console.log(`🌍 Servidor HTTP rodando na porta ${PORT}`);
});


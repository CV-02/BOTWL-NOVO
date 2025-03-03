import { Client, GatewayIntentBits, PermissionsBitField } from "discord.js";
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
    "1336410539663949935": "🎯[ELITE]",
    "1336379079494205521": "[Membro]"
};

client.once("ready", async () => {
    console.log(`✅ Bot online como ${client.user.tag}`);
});

client.on("guildMemberUpdate", async (oldMember, newMember) => {
    try {
        const guild = newMember.guild;
        
        // Obtém os cargos do usuário ordenados pela posição hierárquica no servidor
        const roles = newMember.roles.cache
            .filter(role => role.id in rolePrefixes)
            .sort((a, b) => b.position - a.position);

        let newNickname;
        
        if (roles.size > 0) {
            // Obtém a sigla do cargo mais alto
            const highestRole = roles.first();
            const prefix = rolePrefixes[highestRole.id];
            
            newNickname = `${prefix} ${newMember.nickname || newMember.user.username}`;
            
            if (newMember.nickname !== newNickname) {
                await newMember.setNickname(newNickname).catch(console.error);
                console.log(`🔄 Nick atualizado para: ${newNickname}`);
            }
        } else {
            // Remove qualquer sigla se não houver cargos válidos, mantendo o nome do servidor
            const regex = new RegExp(`^(${Object.values(rolePrefixes).join("|")}) `, "i");
            newNickname = newMember.nickname ? newMember.nickname.replace(regex, "").trim() : newMember.user.username;
            
            if (newNickname !== newMember.nickname) {
                await newMember.setNickname(newNickname).catch(console.error);
                console.log(`🔄 Sigla removida. Novo nick: ${newNickname}`);
            }
        }
    } catch (error) {
        console.error("❌ Erro ao atualizar nickname:", error);
    }
});

client.login(process.env.TOKEN);

import { Client, GatewayIntentBits, PermissionsBitField } from "discord.js";
import dotenv from "dotenv";

dotenv.config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

// Configuração de cargos e suas siglas
const rolePrefixes = {
    "LIDER": "👑[Lider]",
    "SUBLIDER": "🥇[Sub]",
    "GERENTE GERAL": "🏅[G.G]",
    "GERENTE DE AÇÃO": "🔫[G.A]",
    "GERENTE DE VENDAS": "💸[G.V]",
    "GERENTE DE RECRUTAMENTO": "🧰[G.R]",
    "RECRUTA": "💎[REC]",
    "ELITE": "🎯[ELITE]"
};

client.once("ready", async () => {
    console.log(`✅ Bot online como ${client.user.tag}`);
    
    const guild = client.guilds.cache.first();
    if (!guild) {
        console.error("❌ Nenhuma guilda encontrada!");
        return;
    }

    // Criar cargos caso não existam
    for (const roleName of Object.keys(rolePrefixes)) {
        let role = guild.roles.cache.find(r => r.name.toUpperCase() === roleName);
        
        if (!role) {
            try {
                role = await guild.roles.create({
                    name: roleName,
                    permissions: [],
                    mentionable: true,
                    color: "#3498db", // Azul padrão
                });
                console.log(`✅ Cargo criado: ${role.name}`);
            } catch (error) {
                console.error(`❌ Erro ao criar o cargo ${roleName}:`, error);
            }
        }
    }
});

client.on("guildMemberUpdate", async (oldMember, newMember) => {
    try {
        const guild = newMember.guild;
        
        // Obtém os cargos do usuário ordenados pela posição hierárquica no servidor
        const roles = newMember.roles.cache
            .filter(role => role.name.toUpperCase() in rolePrefixes)
            .sort((a, b) => b.position - a.position);

        let newNickname;
        
        if (roles.size > 0) {
            // Obtém a sigla do cargo mais alto
            const highestRole = roles.first();
            const prefix = rolePrefixes[highestRole.name.toUpperCase()];
            
            newNickname = `${prefix} ${newMember.user.username}`;
            
            if (newMember.nickname !== newNickname) {
                await newMember.setNickname(newNickname).catch(console.error);
                console.log(`🔄 Nick atualizado para: ${newNickname}`);
            }
        } else {
            // Remove qualquer sigla se não houver cargos válidos
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

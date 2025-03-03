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
    "SUBLIDER": "[SUB]",
    "GERENTE GERAL": "[G.G]",
    "GERENTE": "[G]",
    "MODERADOR": "[MOD]",
    "MEMBRO": "[M]"
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
                    color: "BLUE",
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
        
        // Obtém os cargos do usuário ordenados pela hierarquia
        const roles = newMember.roles.cache
            .filter(role => role.name.toUpperCase() in rolePrefixes)
            .sort((a, b) => b.position - a.position);

        if (roles.size === 0) return;

        // Obtém a sigla do cargo mais alto
        const highestRole = roles.first();
        const prefix = rolePrefixes[highestRole.name.toUpperCase()];
        
        // Define o novo apelido
        const newNickname = `${prefix} ${newMember.user.username}`;
        
        if (newMember.nickname !== newNickname) {
            await newMember.setNickname(newNickname).catch(console.error);
            console.log(`🔄 Nick atualizado para: ${newNickname}`);
        }
    } catch (error) {
        console.error("❌ Erro ao atualizar nickname:", error);
    }
});

client.login(process.env.TOKEN);

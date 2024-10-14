require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionsBitField,
} = require('discord.js');
const axios = require('axios');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

// Register the slash command when the bot starts
client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  const commands = [
    {
      name: 'ticket_panel',
      description: 'Setup a ticket panel for clan applications.',
      options: [
        {
          name: 'staff_role',
          description: 'Select ticket staff role',
          type: 8, // Role type
          required: true,
        },
        {
          name: 'panel_description',
          description: 'Ticket panel description',
          type: 3, // String type
          required: true,
        },
      ],
    },
  ];

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  try {
    console.log('Registering slash commands...');
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
    console.log('Slash commands registered successfully.');
  } catch (error) {
    console.error('Error registering commands:', error);
  }
});

// Handle slash command and interactions
client.on('interactionCreate', async (interaction) => {
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === 'ticket_panel') {
      const staffRole = interaction.options.getRole('staff_role');
      const panelDescription = interaction.options.getString('panel_description');

      // Create embed and button for ticket panel
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`${interaction.guild.name} Application`) // Use guild name in the title
        .setDescription(panelDescription)
        .setFooter({ text: 'Powered by ClashPhoenix' });

      const applyButton = new ButtonBuilder()
        .setCustomId('apply_button')
        .setLabel('🏷 Apply For Clan')
        .setStyle(ButtonStyle.Secondary);

      const row = new ActionRowBuilder().addComponents(applyButton);

      // Send the panel to the channel where the command was executed
      await interaction.channel.send({ embeds: [embed], components: [row] });

      await interaction.reply({ content: 'Ticket panel created!', ephemeral: true });
    }
  }

  // Handle button interaction
  if (interaction.isButton() && interaction.customId === 'apply_button') {
    // Open the form asking for the player's CoC tag
    const modal = new ModalBuilder()
      .setCustomId('apply_form')
      .setTitle('Clan Application Form');

    const tagInput = new TextInputBuilder()
      .setCustomId('coc_tag')
      .setLabel('Enter Player Tag')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('#XXXXXXX')
      .setRequired(true);

    const row = new ActionRowBuilder().addComponents(tagInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
  }

  // Handle modal submission
  if (interaction.isModalSubmit() && interaction.customId === 'apply_form') {
    await interaction.deferReply({ ephemeral: true }); // Defer the reply first

    const playerTag = interaction.fields.getTextInputValue('coc_tag').replace('#', '').toUpperCase();
    const user = interaction.user;
    const staffRole = interaction.guild.roles.cache.find(role => role.name === 'Staff'); // Adjust if necessary

    // Fetch CoC player data from the API using URL from .env
    const cocApiUrl = `${process.env.API_URL}/v1/players/%23${playerTag}`;
    let playerData;

    try {
      const response = await axios.get(cocApiUrl, {
        headers: {
          Authorization: `Bearer ${process.env.API_KEY}`,
        },
      });
      playerData = response.data;

      // Check if player data is valid
      if (!playerData || playerData.error) {
        await interaction.editReply({ content: 'Invalid tag ❌️ try again.' });
        return;
      }
    } catch (error) {
      // Removed console.error here to avoid logging on incorrect tags
      await interaction.editReply({ content: 'Invalid tag ❌️ try again.' });
      return;
    }

    // Thumbnail images for different town hall levels
    const townHallThumbnails = {
      1: 'https://i.imghippo.com/files/lSj9Z1728899788.webp',
      2: 'https://i.imghippo.com/files/kPwAN1728899875.webp',
      3: 'https://i.imghippo.com/files/Lwbbe1728899897.webp',
      4: 'https://i.imghippo.com/files/470cd1728899935.webp',
      5: 'https://i.imghippo.com/files/2ms3V1728899986.webp',
      6: 'https://i.imghippo.com/files/8SCM91728900024.webp',
      7: 'https://i.imghippo.com/files/Yk6kE1728900070.webp',
      8: 'https://i.imghippo.com/files/Xwy0O1728900090.webp',
      9: 'https://i.imghippo.com/files/m0jJA1728900117.webp',
      10: 'https://i.imghippo.com/files/fVQQJ1728900147.webp',
      11: 'https://i.imghippo.com/files/gWKmU1728900169.webp',
      12: 'https://i.imghippo.com/files/bS8iF1728900187.webp',
      13: 'https://i.imghippo.com/files/3wHXk1728900205.webp',
      14: 'https://i.imghippo.com/files/FBjTb1728900234.webp',
      15: 'https://i.imghippo.com/files/xDWyx1728900253.webp',
      16: 'https://i.imghippo.com/files/7jcr71728900542.png', // assuming Town Hall goes up to level 15
    };

    // Get the appropriate thumbnail URL based on the player's Town Hall level
    const townHallImageUrl = townHallThumbnails[playerData.townHallLevel] || 'https://i.imghippo.com/files/lSj9Z1728899788.webp'; // Fallback image

    // Create a private ticket channel for the user and staff only if player data is valid
    const ticketChannel = await interaction.guild.channels.create({
      name: `ticket-${user.username}`,
      type: 0, // 0 = text channel
      permissionOverwrites: [
        {
          id: interaction.guild.id, // Deny everyone access
          deny: [PermissionsBitField.Flags.ViewChannel],
        },
        {
          id: user.id, // Allow the user access
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
        },
        {
          id: staffRole.id, // Allow staff access
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
        },
      ],
    });

    // Send player data to the ticket channel
    const ticketEmbed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`${interaction.guild.name} Application`) // Updated to guild name
      .setThumbnail(townHallImageUrl) // Set thumbnail based on Town Hall level
      .addFields(
        { name: 'Player Name', value: playerData.name, inline: true },
        { name: 'Player Tag', value: `#${playerTag}`, inline: true },
      )
      .setFooter({ text: 'Powered by ClashPhoenix' });

    const closeButton = new ButtonBuilder()
      .setCustomId('close_ticket')
      .setLabel('Close Ticket')
      .setStyle(ButtonStyle.Danger);

    const buttonRow = new ActionRowBuilder().addComponents(closeButton);

    await ticketChannel.send({ content: `<@${user.id}> | <@&${staffRole.id}> will assist you soon.`, embeds: [ticketEmbed], components: [buttonRow] });

    await interaction.editReply({ content: `Ticket has been created: ${ticketChannel}` }); // Edit the deferred reply
  }

  // Handle ticket closure
  if (interaction.isButton() && interaction.customId === 'close_ticket') {
    // Acknowledge the button interaction immediately
    await interaction.deferUpdate();

    const ticketChannel = interaction.channel;

    // Get the user ID of the ticket creator from permission overwrites
    const ticketCreatorId = ticketChannel.permissionOverwrites.cache.find(perm => perm.id === interaction.user.id && perm.allow.has(PermissionsBitField.Flags.ViewChannel))?.id;

    // Check if the user who clicked the button is the ticket creator
    if (interaction.user.id === ticketCreatorId) {
      return interaction.followUp({ content: 'You cannot close this ticket.', ephemeral: true });
    }

    // Create an embed for the ticket closing message without a title
    const closingEmbed = new EmbedBuilder()
      .setColor(0xFF0000) // Red color to indicate closure
      .setDescription('Ticket will be closing soon! Thank you.');

    // Send the embed message that the ticket will close soon
    await ticketChannel.send({ embeds: [closingEmbed] });

    // Wait for 5 seconds before closing the ticket
    setTimeout(async () => {
      // Delete the channel after the delay
      await ticketChannel.delete();
    }, 5000); // 5 seconds delay (5000 milliseconds)
  }
});

// Login the bot using token from .env
client.login(process.env.DISCORD_TOKEN);
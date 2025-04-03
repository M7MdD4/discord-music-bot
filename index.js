const { Client, GatewayIntentBits } = require('discord.js');
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  StreamType,
  AudioPlayerStatus,
  getVoiceConnection,
  VoiceConnectionStatus,
} = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const { token } = require('./config.json');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
  ],
});

const prefix = '!';

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === 'play') {
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) {
      return message.reply('❌ **You must join a voice channel first!**');
    }

    const url = args[0];
    if (!ytdl.validateURL(url)) {
      return message.reply('❌ **Invalid YouTube URL provided!**');
    }

    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: message.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator,
    });

    connection.on('stateChange', (oldState, newState) => {
      console.log(`🔎 Connection changed from ${oldState.status} to ${newState.status}`);
    });

    connection.on(VoiceConnectionStatus.Ready, () => {
      console.log('🔊 Voice connection is READY!');
    });

    const stream = ytdl(url, { filter: 'audioonly', quality: 'highestaudio' });
    const resource = createAudioResource(stream, { inputType: StreamType.Arbitrary });

    const player = createAudioPlayer();

    player.on('stateChange', (oldState, newState) => {
      console.log(`🔎 Player changed from ${oldState.status} to ${newState.status}`);
    });

    player.on(AudioPlayerStatus.Playing, () => {
      message.channel.send('🎵 **Playing song now!**');
    });

    player.on(AudioPlayerStatus.Idle, () => {
      console.log('⏹️ Audio player is idle, disconnecting.');
      connection.destroy();
    });

    player.on('error', (error) => {
      console.error('🚨 Player Error:', error);
      message.channel.send(`🚨 **Player Error:** ${error.message}`);
      connection.destroy();
    });

    connection.subscribe(player);
    player.play(resource);
  }

  if (command === 'leave') {
    const connection = getVoiceConnection(message.guild.id);
    if (connection) {
      connection.destroy();
      message.reply('👋 **Left the voice channel!**');
    } else {
      message.reply('❌ **Not connected to any voice channel!**');
    }
  }
});

client.login(token);

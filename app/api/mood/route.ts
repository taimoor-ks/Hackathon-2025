export const runtime = "nodejs";

interface MoodAnalysis {
  mood_score: number;
  mood_label: "Chaos" | "Stressed" | "Neutral" | "Good" | "Vibes";
  summary: string;
  positive_signals: string[];
  negative_signals: string[];
  top_emojis: string[];
}

interface Playlist {
  name: string;
  url: string;
}

function cleanSlackText(text = ""): string {
  return text
    .replace(/<@[^>]+>/g, "")
    .replace(/<http[^>]+>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/:[a-z0-9_+-]+:/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Cache for Slack emoji mappings
let emojiCache: Record<string, string> | null = null;
let emojiCacheTime = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

async function fetchSlackEmojis(): Promise<Record<string, string>> {
  // Return cached emojis if available and fresh
  if (emojiCache && Date.now() - emojiCacheTime < CACHE_DURATION) {
    return emojiCache;
  }

  try {
    const res = await fetch('https://slack.com/api/emoji.list', {
      headers: { Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}` }
    });
    const data = await res.json();

    if (!data.ok) {
      console.error('Failed to fetch Slack emojis:', data.error);
      return getBasicEmojiMap();
    }

    // Build emoji map: Slack custom emojis are URLs, standard emojis are aliases
    const emojiMap: Record<string, string> = {};

    for (const [name, value] of Object.entries(data.emoji)) {
      if (typeof value === 'string') {
        if (value.startsWith('alias:')) {
          // It's an alias to another emoji
          const aliasName = value.replace('alias:', '');
          emojiMap[`:${name}:`] = emojiMap[`:${aliasName}:`] || getUnicodeForEmojiName(aliasName);
        } else if (value.startsWith('http')) {
          // It's a custom emoji (image URL) - we'll use the name as fallback
          emojiMap[`:${name}:`] = `:${name}:`;
        } else {
          // Try to get Unicode representation
          emojiMap[`:${name}:`] = getUnicodeForEmojiName(name);
        }
      }
    }

    // Merge with basic emoji map for standard emojis
    emojiCache = { ...getBasicEmojiMap(), ...emojiMap };
    emojiCacheTime = Date.now();

    return emojiCache;
  } catch (error) {
    console.error('Error fetching Slack emojis:', error);
    return getBasicEmojiMap();
  }
}

function getBasicEmojiMap(): Record<string, string> {
  // Common standard emojis as fallback
  return {
    ':pray:': '🙏',
    ':cry:': '😢',
    ':sob:': '😭',
    ':disappointed:': '😞',
    ':broken_heart:': '💔',
    ':heart:': '❤️',
    ':clap:': '👏',
    ':party_blob:': '🎉',
    ':partying_face:': '🥳',
    ':joy:': '😂',
    ':raised_hands:': '🙌',
    ':fire:': '🔥',
    ':thumbsup:': '👍',
    ':+1:': '👍',
    ':thumbsdown:': '👎',
    ':-1:': '👎',
    ':tada:': '🎊',
    ':star:': '⭐',
    ':100:': '💯',
    ':muscle:': '💪',
    ':sparkles:': '✨',
    ':rocket:': '🚀',
    ':eyes:': '👀',
    ':thinking_face:': '🤔',
    ':thinking:': '🤔',
    ':sweat_smile:': '😅',
    ':scream:': '😱',
    ':worried:': '😟',
    ':fearful:': '😨',
    ':weary:': '😩',
    ':pensive:': '😔',
    ':relieved:': '😌',
    ':triumph:': '😤',
    ':persevere:': '😣',
    ':confounded:': '😖',
    ':rage:': '😡',
    ':angry:': '😠',
    ':smile:': '😊',
    ':grin:': '😁',
    ':laughing:': '😆',
    ':blush:': '😊',
    ':wink:': '😉',
    ':heart_eyes:': '😍',
    ':kissing_heart:': '😘',
    ':sunglasses:': '😎',
    ':smirk:': '😏',
    ':innocent:': '😇',
    ':nerd_face:': '🤓',
    ':face_with_monocle:': '🧐',
    ':star_struck:': '🤩',
    ':upside_down_face:': '🙃',
    ':slightly_smiling_face:': '🙂',
    ':grimacing:': '😬',
    ':neutral_face:': '😐',
    ':expressionless:': '😑',
    ':confused:': '😕',
    ':frowning:': '☹️',
    ':slightly_frowning_face:': '🙁',
    ':unamused:': '😒'
  };
}

function getUnicodeForEmojiName(name: string): string {
  // Try to get from basic map first
  const basic = getBasicEmojiMap()[`:${name}:`];
  if (basic) return basic;

  // Return the name with colons as fallback
  return `:${name}:`;
}

async function convertSlackEmojiToUnicode(emojiCode: string): Promise<string> {
  const emojiMap = await fetchSlackEmojis();
  return emojiMap[emojiCode] || emojiCode;
}

function playlistsForMood(moodLabel: MoodAnalysis["mood_label"]): Playlist {
  const map: Record<MoodAnalysis["mood_label"], Playlist> = {
    Chaos: { name: "Calm Lo-Fi Focus", url: "https://open.spotify.com/playlist/37i9dQZF1DX3Ogo9pFvBkY" },
    Stressed: { name: "Chill Hits", url: "https://open.spotify.com/playlist/37i9dQZF1DX4WYpdgoIcn6" },
    Neutral: { name: "Easy Indie", url: "https://open.spotify.com/playlist/37i9dQZF1DX2Nc3B70tvx0" },
    Good: { name: "Feel Good Pop", url: "https://open.spotify.com/playlist/37i9dQZF1DXdPec7aLTmlC" },
    Vibes: { name: "Office Party Bangers", url: "https://open.spotify.com/playlist/37i9dQZF1DXaXB8fQg7xif" }
  };
  return map[moodLabel] || map.Neutral;
}

interface MessageWithTimestamp {
  text: string;
  timestamp: number;
}

async function fetchSlackMessagesFromChannel(channelId: string): Promise<MessageWithTimestamp[]> {
  const url = `https://slack.com/api/conversations.history?channel=${encodeURIComponent(
    channelId
  )}&limit=100`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}` }
  });
  const data = await res.json();

  if (!data.ok) throw new Error(`Slack error for channel ${channelId}: ${data.error}`);

  console.log(`Fetched ${data.messages?.length || 0} raw messages from channel ${channelId}`);

  const allMessages = data.messages || [];
  const typeFiltered = allMessages.filter((m: any) => m.type === "message");
  const subtypeFiltered = typeFiltered.filter((m: any) => !m.subtype || m.subtype === "thread_broadcast");
  const botFiltered = subtypeFiltered.filter((m: any) => !m.bot_id);
  const fileFiltered = botFiltered.filter((m: any) => !m.files);
  const textMessages = fileFiltered.filter((m: any) => m.text);

  const cleaned = textMessages
    .map((m: any) => {
      const text = cleanSlackText(m.text);
      let finalText = text;
      // Include reactions if they exist
      if (m.reactions && m.reactions.length > 0) {
        const reactionEmojis = m.reactions.map((r: any) => `:${r.name}:`).join(' ');
        finalText = `${text} [Reactions: ${reactionEmojis}]`;
      }
      return {
        text: finalText,
        timestamp: parseFloat(m.ts || "0")
      };
    })
    .filter((msg: MessageWithTimestamp) => msg.text.length > 3);

  console.log(`After filtering: ${cleaned.length} messages (${allMessages.length} -> ${typeFiltered.length} -> ${subtypeFiltered.length} -> ${botFiltered.length} -> ${fileFiltered.length} -> ${textMessages.length} -> ${cleaned.length})`);

  return cleaned;
}

async function fetchSlackFromMultipleChannels(): Promise<string[]> {
  const channelIds = process.env.SLACK_CHANNEL_IDS!.split(',').map(id => id.trim());

  const allMessages = await Promise.all(
    channelIds.map(channelId => fetchSlackMessagesFromChannel(channelId))
  );

  const flatMessages = allMessages.flat();

  // Sort by timestamp (newest first)
  flatMessages.sort((a, b) => b.timestamp - a.timestamp);

  // Apply recency weighting: duplicate recent messages to give them more weight
  // Messages from last 24 hours get 3x weight, last week 2x weight
  const now = Date.now() / 1000;
  const oneDayAgo = now - (24 * 60 * 60);
  const oneWeekAgo = now - (7 * 24 * 60 * 60);

  const weightedMessages: string[] = [];

  for (const msg of flatMessages) {
    if (msg.timestamp > oneDayAgo) {
      // Last 24 hours: 3x weight
      weightedMessages.push(msg.text, msg.text, msg.text);
    } else if (msg.timestamp > oneWeekAgo) {
      // Last week: 2x weight
      weightedMessages.push(msg.text, msg.text);
    } else {
      // Older: 1x weight
      weightedMessages.push(msg.text);
    }
  }

  return weightedMessages;
}

async function analyzeWithOpenAI(messages: string[]): Promise<MoodAnalysis> {
  const prompt = `
Return JSON ONLY with:
{
  "mood_score": number (0-100),
  "mood_label": "Chaos" | "Stressed" | "Neutral" | "Good" | "Vibes",
  "summary": string,
  "positive_signals": string[],
  "negative_signals": string[],
  "top_emojis": string[]
}

IMPORTANT: Recent messages appear multiple times in the list to indicate recency importance.
Messages that appear 3 times are from the last 24 hours (highest priority).
Messages that appear 2 times are from the last week (medium priority).
Messages that appear 1 time are older (lower priority).

Pay special attention to:
- Sad, concerning, or distressing content (accidents, incidents, safety concerns)
- Negative emotions expressed through reactions like :sob:, :disappointed:, :broken_heart:
- Words indicating grief, shock, trauma, or distress
- If recent messages (appearing 2-3 times) contain negative sentiment, weight them heavily in your mood score

Analyze these Slack messages (with recency weighting applied):
${messages.map(m => `- ${m}`).join("\n")}
`.trim();

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You are an office mood analyzer. Be highly sensitive to negative emotions, especially in recent messages. Prioritize safety concerns, distressing events, and grief. You must respond with valid JSON only." },
        { role: "user", content: prompt }
      ]
    })
  });

  const data = await res.json();

  if (data.error) {
    throw new Error(`OpenAI API error: ${data.error.message || JSON.stringify(data.error)}`);
  }

  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned no content");
  }

  try {
    const parsed: MoodAnalysis = JSON.parse(content);
    // Convert Slack emoji codes to Unicode emojis
    parsed.top_emojis = await Promise.all(
      parsed.top_emojis.map(emoji => convertSlackEmojiToUnicode(emoji))
    );
    return parsed;
  } catch (parseError: any) {
    throw new Error(`Failed to parse OpenAI response as JSON: ${content.substring(0, 100)}...`);
  }
}

export async function GET() {
  try {
    const msgs = await fetchSlackFromMultipleChannels();
    const mood = await analyzeWithOpenAI(msgs);
    const playlist = playlistsForMood(mood.mood_label);

    return Response.json({
      ...mood,
      playlist,
      sample_size: msgs.length,
      generated_at: new Date().toISOString()
    });
  } catch (e: any) {
    return Response.json({ error: String(e.message || e) }, { status: 500 });
  }
}

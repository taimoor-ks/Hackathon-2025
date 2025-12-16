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
  return (
    text
      .replace(/<@[^>]+>/g, "")
      .replace(/<http[^>]+>/g, "")
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      // Keep emoji codes - don't strip them, AI needs to see them
      .replace(/\s+/g, " ")
      .trim()
  );
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
    const res = await fetch("https://slack.com/api/emoji.list", {
      headers: { Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}` },
    });
    const data = await res.json();

    if (!data.ok) {
      console.error("Failed to fetch Slack emojis:", data.error);
      return getBasicEmojiMap();
    }

    // Build emoji map: Slack custom emojis are URLs, standard emojis are aliases
    const emojiMap: Record<string, string> = {};

    for (const [name, value] of Object.entries(data.emoji)) {
      if (typeof value === "string") {
        if (value.startsWith("alias:")) {
          // It's an alias to another emoji
          const aliasName = value.replace("alias:", "");
          emojiMap[`:${name}:`] =
            emojiMap[`:${aliasName}:`] || getUnicodeForEmojiName(aliasName);
        } else if (value.startsWith("http")) {
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
    console.error("Error fetching Slack emojis:", error);
    return getBasicEmojiMap();
  }
}

function getBasicEmojiMap(): Record<string, string> {
  // Common standard emojis as fallback
  return {
    ":pray:": "🙏",
    ":pray::skin-tone-2:": "🙏🏻",
    ":pray::skin-tone-3:": "🙏🏼",
    ":pray::skin-tone-4:": "🙏🏽",
    ":pray::skin-tone-5:": "🙏🏾",
    ":pray::skin-tone-6:": "🙏🏿",
    ":cry:": "😢",
    ":sob:": "😭",
    ":disappointed:": "😞",
    ":broken_heart:": "💔",
    ":heart:": "❤️",
    ":white_heart:": "🤍",
    ":clap:": "👏",
    ":clap::skin-tone-2:": "👏🏻",
    ":clap::skin-tone-3:": "👏🏼",
    ":clap::skin-tone-4:": "👏🏽",
    ":clap::skin-tone-5:": "👏🏾",
    ":clap::skin-tone-6:": "👏🏿",
    ":party_blob:": "🎉",
    ":partying_face:": "🥳",
    ":joy:": "😂",
    ":raised_hands:": "🙌",
    ":raised_hands::skin-tone-2:": "🙌🏻",
    ":raised_hands::skin-tone-3:": "🙌🏼",
    ":raised_hands::skin-tone-4:": "🙌🏽",
    ":raised_hands::skin-tone-5:": "🙌🏾",
    ":raised_hands::skin-tone-6:": "🙌🏿",
    ":fire:": "🔥",
    ":thumbsup:": "👍",
    ":thumbsup::skin-tone-2:": "👍🏻",
    ":thumbsup::skin-tone-3:": "👍🏼",
    ":thumbsup::skin-tone-4:": "👍🏽",
    ":thumbsup::skin-tone-5:": "👍🏾",
    ":thumbsup::skin-tone-6:": "👍🏿",
    ":+1:": "👍",
    ":+1::skin-tone-2:": "👍🏻",
    ":+1::skin-tone-3:": "👍🏼",
    ":+1::skin-tone-4:": "👍🏽",
    ":+1::skin-tone-5:": "👍🏾",
    ":+1::skin-tone-6:": "👍🏿",
    ":thumbsdown:": "👎",
    ":thumbsdown::skin-tone-2:": "👎🏻",
    ":thumbsdown::skin-tone-3:": "👎🏼",
    ":thumbsdown::skin-tone-4:": "👎🏽",
    ":thumbsdown::skin-tone-5:": "👎🏾",
    ":thumbsdown::skin-tone-6:": "👎🏿",
    ":-1:": "👎",
    ":-1::skin-tone-2:": "👎🏻",
    ":-1::skin-tone-3:": "👎🏼",
    ":-1::skin-tone-4:": "👎🏽",
    ":-1::skin-tone-5:": "👎🏾",
    ":-1::skin-tone-6:": "👎🏿",
    ":tada:": "🎊",
    ":star:": "⭐",
    ":100:": "💯",
    ":muscle:": "💪",
    ":muscle::skin-tone-2:": "💪🏻",
    ":muscle::skin-tone-3:": "💪🏼",
    ":muscle::skin-tone-4:": "💪🏽",
    ":muscle::skin-tone-5:": "💪🏾",
    ":muscle::skin-tone-6:": "💪🏿",
    ":sparkles:": "✨",
    ":rocket:": "🚀",
    ":eyes:": "👀",
    ":thinking_face:": "🤔",
    ":thinking:": "🤔",
    ":sweat_smile:": "😅",
    ":scream:": "😱",
    ":worried:": "😟",
    ":fearful:": "😨",
    ":weary:": "😩",
    ":pensive:": "😔",
    ":relieved:": "😌",
    ":triumph:": "😤",
    ":persevere:": "😣",
    ":confounded:": "😖",
    ":rage:": "😡",
    ":angry:": "😠",
    ":smile:": "😊",
    ":grin:": "😁",
    ":laughing:": "😆",
    ":blush:": "😊",
    ":wink:": "😉",
    ":heart_eyes:": "😍",
    ":kissing_heart:": "😘",
    ":sunglasses:": "😎",
    ":smirk:": "😏",
    ":innocent:": "😇",
    ":nerd_face:": "🤓",
    ":face_with_monocle:": "🧐",
    ":star_struck:": "🤩",
    ":upside_down_face:": "🙃",
    ":slightly_smiling_face:": "🙂",
    ":grimacing:": "😬",
    ":neutral_face:": "😐",
    ":expressionless:": "😑",
    ":confused:": "😕",
    ":frowning:": "☹️",
    ":slightly_frowning_face:": "🙁",
    ":unamused:": "😒",
    ":taco:": "🌮",
    ":kudosity-logo:": "🔮",
    ":rolling_on_the_floor_laughing:": "🤣",
    ":arrow_up:": "⬆️",
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
    Chaos: {
      name: "Calm Lo-Fi Focus",
      url: "https://open.spotify.com/playlist/37i9dQZF1DX3Ogo9pFvBkY",
    },
    Stressed: {
      name: "Peaceful Piano",
      url: "https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwBtn3A",
    },
    Neutral: {
      name: "Easy Indie",
      url: "https://open.spotify.com/playlist/37i9dQZF1DX2Nc3B70tvx0",
    },
    Good: {
      name: "Feel Good Pop",
      url: "https://open.spotify.com/playlist/37i9dQZF1DXdPec7aLTmlC",
    },
    Vibes: {
      name: "Office Party Bangers",
      url: "https://open.spotify.com/playlist/37i9dQZF1DXaXB8fQg7xif",
    },
  };
  return map[moodLabel] || map.Neutral;
}

interface MessageWithTimestamp {
  text: string;
  timestamp: number;
}

async function fetchSlackMessagesFromChannel(
  channelId: string
): Promise<MessageWithTimestamp[]> {
  // Fetch messages from the last 24 hours
  const oldest = Math.floor(Date.now() / 1000) - 24 * 60 * 60;
  const url = `https://slack.com/api/conversations.history?channel=${encodeURIComponent(
    channelId
  )}&oldest=${oldest}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}` },
  });
  const data = await res.json();

  if (!data.ok)
    throw new Error(`Slack error for channel ${channelId}: ${data.error}`);

  console.log(
    `Fetched ${
      data.messages?.length || 0
    } raw messages from channel ${channelId}`
  );

  const allMessages = data.messages || [];
  const typeFiltered = allMessages.filter((m: any) => m.type === "message");
  const subtypeFiltered = typeFiltered.filter(
    (m: any) => !m.subtype || m.subtype === "thread_broadcast"
  );
  const botFiltered = subtypeFiltered.filter((m: any) => !m.bot_id);
  const fileFiltered = botFiltered.filter((m: any) => !m.files);
  const textMessages = fileFiltered.filter((m: any) => m.text);

  const cleaned = textMessages
    .map((m: any) => {
      return {
        text: cleanSlackText(m.text),
        timestamp: parseFloat(m.ts || "0"),
      };
    })
    .filter((msg: MessageWithTimestamp) => msg.text.length > 3);

  console.log(
    `After filtering: ${cleaned.length} messages (${allMessages.length} -> ${typeFiltered.length} -> ${subtypeFiltered.length} -> ${botFiltered.length} -> ${fileFiltered.length} -> ${textMessages.length} -> ${cleaned.length})`
  );

  return cleaned;
}

async function fetchSlackFromMultipleChannels(): Promise<string[]> {
  const channelIds = process.env
    .SLACK_CHANNEL_IDS!.split(",")
    .map((id) => id.trim());

  const allMessages = await Promise.all(
    channelIds.map((channelId) => fetchSlackMessagesFromChannel(channelId))
  );

  const flatMessages = allMessages.flat();

  // Sort by timestamp (newest first)
  flatMessages.sort((a, b) => b.timestamp - a.timestamp);

  // Apply recency weighting: duplicate recent messages to give them more weight
  // Since we're only fetching last 24h, weight more recent messages within that window
  const now = Date.now() / 1000;
  const oneHourAgo = now - 60 * 60;
  const sixHoursAgo = now - 6 * 60 * 60;

  const weightedMessages: string[] = [];

  for (const msg of flatMessages) {
    if (msg.timestamp > oneHourAgo) {
      // Last hour: 3x weight (most recent)
      weightedMessages.push(msg.text, msg.text, msg.text);
    } else if (msg.timestamp > sixHoursAgo) {
      // Last 6 hours: 2x weight
      weightedMessages.push(msg.text, msg.text);
    } else {
      // Older than 6 hours (but within 24h): 1x weight
      weightedMessages.push(msg.text);
    }
  }

  return weightedMessages;
}

async function analyzeWithAI(messages: string[]): Promise<MoodAnalysis> {
  const analysisPrompt = `
Analyze the OVERALL mood of the office by considering ALL types of content:

POSITIVE indicators (should increase mood score):
- Celebrations, achievements, wins, milestones
- Excitement, enthusiasm, humor, laughter
- Collaboration, support, helping each other
- Positive reactions: :fire:, :tada:, :clap:, :heart:, :100:, :rocket:
- Gratitude, appreciation, encouragement

NEGATIVE indicators (should decrease mood score):
- Distressing events (accidents, incidents, safety concerns)
- Stress signals (deadlines, pressure, overwhelm)
- Frustration, complaints, blockers
- Negative reactions: :sob:, :disappointed:, :broken_heart:, :weary:
- Words indicating grief, shock, trauma, or distress

NEUTRAL indicators:
- General updates, status reports, routine work
- Questions, clarifications, neutral discussions
- Planning, scheduling, logistics

Balance your analysis:
- Weight recent messages (appearing 2-3 times) more heavily
- Consider the PROPORTION of positive vs negative vs neutral content
- If mostly positive with some neutral → "Good" or "Vibes" (70-100)
- If balanced or mixed → "Neutral" (40-60)
- If concerning/stressful content → "Stressed" (20-40)
- If critical incidents or widespread distress → "Chaos" (0-20)

IMPORTANT: Recent messages appear multiple times in the list to indicate recency importance.
Messages that appear 3 times are from the last hour (highest priority).
Messages that appear 2 times are from the last 6 hours (medium priority).
Messages that appear 1 time are older than 6 hours but within the last 24 hours (lower priority).
NOTE: All messages are from the last 24 hours only.

Analyze these Slack messages (with recency weighting applied):
${messages.map((m) => `- ${m}`).join("\n")}
`.trim();

  console.log("Analyzing with OpenAI...");
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are an office mood analyzer. Provide a balanced, accurate assessment of team sentiment by weighing positive, negative, and neutral signals proportionally. Be sensitive to both celebrations and concerns. You must respond with valid JSON only.",
        },
        {
          role: "user",
          content: `Return JSON ONLY with:\n{\n  "mood_score": number (0-100),\n  "mood_label": "Chaos" | "Stressed" | "Neutral" | "Good" | "Vibes",\n  "summary": string,\n  "positive_signals": string[],\n  "negative_signals": string[],\n  "top_emojis": string[]\n}\n\n${analysisPrompt}`,
        },
      ],
    }),
  });

  const data = await res.json();

  if (data.error) {
    throw new Error(
      `OpenAI API error: ${data.error.message || JSON.stringify(data.error)}`
    );
  }

  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned no content");
  }

  const parsed: MoodAnalysis = JSON.parse(content);
  parsed.top_emojis = await Promise.all(
    parsed.top_emojis.map((emoji) => convertSlackEmojiToUnicode(emoji))
  );
  console.log("Successfully analyzed with OpenAI");
  return parsed;
}

export async function GET() {
  try {
    const msgs = await fetchSlackFromMultipleChannels();
    const mood = await analyzeWithAI(msgs);
    const playlist = playlistsForMood(mood.mood_label);

    return Response.json({
      ...mood,
      playlist,
      sample_size: msgs.length,
      generated_at: new Date().toISOString(),
    });
  } catch (e: any) {
    return Response.json({ error: String(e.message || e) }, { status: 500 });
  }
}

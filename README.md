![](http://i.imgur.com/C6nTeCS.png)

Easy way to write Telegram bots.

[![Build Status](https://travis-ci.org/kosmodrey/telebot.svg?branch=dev)](https://travis-ci.org/kosmodrey/telebot) [![Dependency Status](https://david-dm.org/kosmodrey/telebot.svg)](https://david-dm.org/kosmodrey/telebot) ![Node.js Version](http://img.shields.io/node/v/telebot.svg)

**Library features:**

- Simple. Easy to use.
- Full Telegram Bot API support.
- Support modules.
- No callbacks, Promises only.
- Build-in modification and event system.
- Extendable and hackable.

## Installation

Download and install via [npm package manager](https://www.npmjs.com/package/telebot) (stable):

```
npm install telebot
```

Or clone fresh code directly from git:

```
git clone https://github.com/kosmodrey/telebot.git
cd telebot
npm install
```

## Usage

Import `telebot` module and create a new bot object:

```js
const TeleBot = require('telebot');

const bot = new TeleBot({
  token: '-PASTEYOURTELEGRAMBOTAPITOKENHERE-', // Required.
  sleep: 1000, // Optional. How often check updates (in ms).
  timeout: 0, // Optional. Update pulling timeout (0 - short polling).
  limit: 100, // Optional. Limits the number of updates to be retrieved.
  retryTimeout: 5000 // Optional. Reconnecting timeout (in ms).
  modules: {
    // Optional. Module configuration.
    //
    // Example:
    //
    // myModuleName: {
    //   data: 'my module data'
    // }
    }
  }
});
```

Or just:

```js
const TeleBot = require('telebot');
const bot = new TeleBot('-PASTEYOURTELEGRAMBOTAPITOKENHERE-');
```

*Replace `token` value to your [Telegram Bot API](https://core.telegram.org/bots#create-a-new-bot) token key.*

To start getting updates, use ```bot.connect()```.

```js
bot.on('text', msg => {
  let fromId = msg.from.id;
  let firstName = msg.from.first_name;
  let reply = msg.message_id;
  return bot.sendMessage(fromId, `Welcome, ${ firstName }!`, { reply });
});

bot.connect();
```

This code will send a "welcome" to every users `text` type message as a reply.

***[See more examples!](/examples)***

## Events

Use ```bot.on(<event>, <function>)``` to handle all possible TeleBot events.

To catch a command with arguments, just add a slash:

```js
bot.on('/hello', msg => {
  let [cmdName, firstName, lastName] = msg.text.split(' ');
  return bot.sendMessage(msg.from.id, `Hello, ${ firstName } ${ lastName }!`);
});
```

Also, you can catch multiple events:

```js
bot.on(['/start', '/help', 'sticker'], msg => {
  return bot.sendMessage(msg.from.id, 'Bam!');
});
```

### TeleBot events:

- **/&#42;** – any user command
- **/\<cmd\>** – on specific command
- **inlineQuery** - on inline query
- **inlineChoice** - on inline choice result
- **callbackQuery** - on button callback
- **connect** – bot connected
- **disconnect** – bot disconnected
- **reconnecting** – bot reconnecting
- **reconnected** – bot successfully reconnected
- **update** - on update
- **tick** – on bot tick
- **error** – an error occurred

#### Action events:

*keyboard*, *button*, *inlineKeyboard*, *inlineButton*, *answerList*, *getMe*, *sendMessage*, *forwardMessage*, *sendPhoto*, *sendAudio*, *sendDocument*, *sendSticker*, *sendVideo*, *sendVoice*, *sendLocation*, *sendVenue*, *sendContact*, *sendChatAction*, *getUserProfilePhotos*, *getFile*, *kickChatMember*, *unbanChatMember*, *answerInlineQuery*, *answerCallbackQuery*, *editMessageText*, *editMessageCaption*, *editMessageReplyMarkup*, *setWebhook*

### Telegram message events:

- **&#42;** - any type of message
- **text** – text message
- **audio** – audio file
- **voice** – voice message
- **document** – document file (any kind)
- **photo** – photo
- **sticker** – sticker
- **video** – video file
- **contact** – contact data
- **location** – location data
- **venue** – venue data

*Read more about Telegram Bot API response types: https://core.telegram.org/bots/api#available-types*

## Modifiers

You can add modifier to process data before passing it to event.

```js
bot.mod('text', data => {
  let msg = data.msg;
  msg.text = `📢 ${ msg.text }`;
  return data;
});
```

This code adds emoji to every `text` message.

### TeleBot modifiers:

- **property** - mod form properties
- **updateList** - list of updates in one tick
- **update** - every update
- **message** - process any type of message
- **\<type\>** - specific type of message (*text, voice, document, photo, sticker, video, contact, location* or *venue*)

## Modules

Use ```bot.use(require(<module_path>))``` to add a module.

**[Check out module folder!](/modules)**

## Methods

### TeleBot methods:

##### `on(<events>, <function>)`

Handles events.

##### `event(<event>, <data>)`

Invokes the event handlers.

##### `mod(<name>, <fn>)`

Add data modifier.

##### `runMod(<names>, <data>)`

Run data modifiers.

##### `keyboard([array of arrays], {resize, once, selective})`

Creates `ReplyKeyboardMarkup` keyboard `markup` object.

##### `button(<location|contact>, <text>)`

Creates `KeyboardButton` button.

##### `inlineButton(<text>, {url|callback|inline})`

Creates `InlineKeyboardButton` button object.

##### `answerList(<inline_query_id>)`

Creates `answerInlineQuery` answer list object.

##### `connect()`

Start pulling updates.

##### `disconnect(<message>)`

Stop pulling updates.

### Telegram methods:

TeleBot use standard [Telegram Bot API](https://core.telegram.org/bots/api#available-methods) method names.

##### `getMe()`

A simple method for testing your bot's auth token.

##### `answerQuery(<answerList>)`

Use this method to send `answerList` to an inline query.

##### `getFile(<file_id>)`

Use this method to get basic info about a file and prepare it for downloading.

##### `sendMessage(<chat_id>, <text>, {reply, markup, notify})`

Use this method to send text messages.

##### `forwardMessage(<chat_id>, <from_chat_id>, <message_id>, {notify})`

Use this method to forward messages of any kind.

##### `sendPhoto(<chat_id>, <file_id|path|url|buffer|stream>, {caption, fileName, reply, markup, notify})`

Use this method to send photos.

##### `sendAudio(<chat_id>, <file_id|path|url|buffer|stream>, {fileName, reply, markup, notify})`

Use this method to send audio files, if you want Telegram clients to display the file as a playable voice message.

##### `sendDocument(<chat_id>, <file_id|path|url|buffer|stream>, {caption, fileName, reply, markup, notify})`

Use this method to send general files.

##### `sendSticker(<chat_id>, <file_id|path|url|buffer|stream>, {fileName, reply, markup, notify})`

Use this method to send `.webp` stickers.

##### `sendVideo(<chat_id>, <file_id|path|url|buffer|stream>, {caption, fileName, reply, markup, notify})`

Use this method to send video files, Telegram clients support `mp4` videos (other formats may be sent as `Document`).

##### `sendVoice(<chat_id>, <file_id|path|url|buffer|stream>, {fileName, reply, markup, notify})`

Use this method to send audio files, if you want Telegram clients to display the file as a playable voice message.

##### `sendLocation(<chat_id>, [<latitude>, <longitude>], {reply, markup, notify})`

Use this method to send point on the map.

##### `sendVenue(<chat_id>, [<latitude>, <longitude>], <title>, <address>, {foursquare, reply, markup, notify})`

Use this method to send information about a venue.

##### `sendContact(<chat_id>, <number>, <firstName>, <lastName>, { reply, markup, notify})`

Use this method to send phone contacts.

##### `sendAction(<chat_id>, <action>)`

Use this method when you need to tell the user that something is happening on the bot's side.

##### `getUserProfilePhotos` as `getUserPhoto(<chat_id>, {offset, limit})`

Use this method to get a list of profile pictures for a user.

##### `getFile(<file_id>)`

Use this method to get basic info about a file and prepare it for downloading.

##### `kickChatMember` as `kick(<chat_id>, <user_id>)`

Use this method to kick a user from a group or a supergroup.

##### `unbanChatMember` as `unban(<chat_id>, <user_id>)`

Use this method to unban a previously kicked user in a supergroup.

##### `editMessageText` as `editMessage({chat & message|inline}, <text>)`

Use this method to edit text messages sent by the bot or via the bot (for inline bots).

##### `editMessageCaption` as `editCaption({chat & message|inline}, <caption>)`

Use this method to edit captions of messages sent by the bot or via the bot (for inline bots).

##### `editMessageReplyMarkup` as `editMarkup({chat & message|inline}, <markup>)`

Use this method to edit only the reply markup of messages sent by the bot or via the bot (for inline bots).

##### `answerCallbackQuery` as `answerCallback(<callback_query_id>, <text>, <show_alert>)`

Use this method to send answers to callback queries sent from inline keyboards.

##### `setWebhook(<url>, <certificate>)`

Use this method to specify a url and receive incoming updates via an outgoing webhook.

## Full Documentation

Read [wiki on GitHub](https://github.com/kosmodrey/telebot/wiki).

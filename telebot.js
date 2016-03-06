'use strict';

const
  request = require('request'),
  mime = require('mime-db');

/* Globals */

const MESSAGE_TYPES = [
  'text', 'audio', 'voice', 'document', 'photo',
  'sticker', 'video', 'contact', 'location', 'query'
];

const ANSWER_METHODS = {
  addArticle: 'article', addPhoto: 'photo', addVideo: 'video',
  addGif: 'gif', addVideoGif: 'mpeg4_gif'
};

const REGEX = {
  cmd: /^\/([а-я\w\d]+)/,
  url: /^https?\:\/\/|www\./,
  name: /[^/\\&\?]+\.\w{3,4}(?=([\?&].*$|$))/
};

/* Telegram Bot */

class TeleBot {
  constructor(cfg) {
    this.cfg = cfg;
    this.token = cfg.token;
    this.id = this.token.split(':')[0];
    this.api = 'https://api.telegram.org/bot' + this.token;
    this.fileLink = 'https://api.telegram.org/file/bot' + this.token + '/';
    this.limit = Number(cfg.limit) || 100;
    this.timeout = cfg.timeout >= 0 ? cfg.timeout : 0;
    this.retryTimeout = cfg.retryTimeout >= 0 ? cfg.retryTimeout : 5000;
    this.retry = false;
    this.pool = true;
    this.loopFn = null;
    this.looping = false;
    this.sleep = Number(cfg.sleep) || 1000;
    this.updateId = 0;
    this.eventList = {};
    this.modList = {};
  }
  /* Modules */
  use(fn) {
    return fn.call(this, this);
  }
  /* Keyboard */
  keyboard(keyboard, opt) {
    opt = opt || {};
    const markup = { keyboard };
    if (opt.resize === true) markup['resize_keyboard'] = true;
    if (opt.once === true) markup['one_time_keyboard'] = true;
    if (opt.selective) markup['selective'] = opt.selective;
    return JSON.stringify(markup);
  }
  /* Answer */
  answerList(id) {
    return answerList(id);
  }
  /* Actions */
  getMe() {
    this.event('getMe', arguments);
    return this.request('/getMe');
  }
  answerQuery(answers, opt) {
    this.event('answerQuery', arguments);
    return this.request('/answerInlineQuery', {
      inline_query_id: answers.id, results: answers.results(),
    });
  }
  getFile(fileId) {
    this.event('getFile', arguments);
    return this.request('/getFile', { file_id: fileId }).then(file => {
      const result = file.result;
      result.fileLink = this.fileLink + result.file_path;
      return result;
    });
  }
  forwardMessage(id, fromId, messageId) {
    this.event('forwardMessage', arguments);
    return this.request('/forwardMessage', {
      chat_id: id, from_chat_id: fromId, message_id: messageId
    });
  }
  getUserPhoto(id, opt) {
    this.event('getUserPhoto', arguments);
    opt = opt || {};
    const form = { user_id: id };
    if (opt.offset) form['offset'] = opt.offset;
    if (opt.limit) form['limit'] = opt.limit;
    return this.request('/getUserProfilePhotos', form);
  }
  sendAction(id, action) {
    this.event('sendAction', arguments);
    return this.request('/sendChatAction', { chat_id: id, action });
  }
  sendMessage(id, text, opt) {
    this.event('sendMessage', arguments);
    opt = opt || {};
    const form = props({ chat_id: id, text }, opt);
    if (opt.preview === false) form['disable_web_page_preview'] = true;
    return this.request('/sendMessage', form);
  }
  sendLocation(id, position, opt) {
    this.event('sendLocation', arguments);
    opt = opt || {};
    const form = props({
      chat_id: id, latitude: position[0], longitude: position[1]
    }, opt);
    return this.request('/sendLocation', form);
  }
  sendPhoto(id, photo, opt) {
    return sendFile.call(this, 'photo', id,  photo, opt);
  }
  sendAudio(id, audio, opt) {
    return sendFile.call(this, 'audio', id, audio, opt);
  }
  sendVoice(id, voice, opt) {
    return sendFile.call(this, 'voice', id, voice, opt);
  }
  sendDocument(id, doc, opt) {
    return sendFile.call(this, 'document', id, doc, opt);
  }
  sendSticker(id, sticker, opt) {
    return sendFile.call(this, 'sticker', id, sticker, opt);
  }
  sendVideo(id, video, opt) {
    return sendFile.call(this, 'video', id, video, opt);
  }
  setWebhook(url, certificate) {
    this.event('setWebhook', arguments);
    return this.request('/setWebhook', { url, certificate });
  }
  /* Send request to server */
  request(url, form, data) {
    const options = { url: this.api + url, json: true };
    if (form) { options.form = form; } else { options.formData = data; };
    return new Promise((resolve, reject) => {
      request.post(options, (error, response, body) => {
        if (error || !body.ok || response.statusCode == 404) {
          return reject(error || body.description || body.error_code || 404);
        }
        return resolve(body);
      });
    });
  }
  /* Connection */
  connect() {
    this.looping = true;
    console.log('[info] bot started');
    this.event('connect');
    this.loopFn = setInterval(x => {
      if (!this.looping) clearInterval(this.loopFn);
      if (!this.pool) return;
      this.pool = false;
      this.getUpdate().then(x => {
        if (this.retry) {
          const now = Date.now();
          const diff = (now - this.retry) / 1000;
          console.log('[info.update] reconnected after ' + diff + ' seconds');
          this.event('reconnected', {
            startTime: this.retry, endTime: now, diffTime: diff
          });
          this.retry = false;
        }
        return this.event('tick');
      }).then(x => {
        this.pool = true;
      }).catch(error => {
        if (this.retry === false) this.retry = Date.now();
        console.error('[error.update]', error.stack || error);
        this.event('error', { error });
        return Promise.reject();
      }).catch(x => {
        const seconds = this.retryTimeout / 1000;
        console.log('[info.update] reconnecting in ' + seconds + ' seconds...');
        this.event('reconnecting');
        setTimeout(x => (this.pool = true), this.retryTimeout);
      });
    }, this.sleep);
  }
  disconnect(message) {
    this.looping = false;
    console.log('[info] bot disconnected' + (message ? ': ' + message : ''));
    this.event('disconnect', message);
  }
  /* Fetch updates */
  getUpdate() {
    // Request an update
    return this.request('/getUpdates', {
      offset: this.updateId, limit: this.limit, timeout: this.timeout
    }).then(body => {
      // Check for update
      var data = body.result;
      if (!data.length) return Promise.resolve();
      return new Promise((resolve, reject) => {
        this.event('update', data).then(output => {
          var me = extend({}, output);
          // Run update processors
          var temp = this.modRun('update', { data, me });
          data = temp.data, me = temp.me;
          // Check every message in update
          for (let update of data) {
            // Set update ID
            let nextId = ++update['update_id'];
            if (this.updateId < nextId) this.updateId = nextId;
            // Run message processors
            let temp = this.modRun('message', {
              me, msg:
                update['message'] || update['inline_query'] ||
                update['chosen_inline_result'] || {}
            });
            var msg = temp.msg, me = temp.me;
            for (let type of MESSAGE_TYPES) {
              // Check for Telegram API documented types
              if (!(type in msg)) continue;
              me.type = type;
              // Send type event
              this.event(['*', type], msg, me);
              // Check for command
              if (type == 'text') {
                const match = REGEX.cmd.exec(msg.text);
                if (!match) continue;
                // Command found
                me.cmd = msg.text.split(' ');
                this.event(['/*', '/' + match[1]], msg, me);
              }
            }
          }
        }).then(resolve).catch(reject);
      });
    });
  }
  get(url, json) {
    return new Promise((resolve, reject) => {
      request.get({ url, json: !!json }, (error, response, data) => {
        if (error || !data) return reject(response);
        return resolve(data);
      });
    });
  }
  mod(name, fn) {
    if (!this.modList[name]) this.modList[name] = [];
    if (this.modList[name].indexOf(fn) !== -1) return;
    this.modList[name].push(fn);
  }
  modRun(name, data) {
    const list = this.modList[name];
    if (!list || !list.length) return data;
    for (let fn of list) data = fn.call(this, data);
    return data;
  }
  /* Events */
  on(types, fn) {
    if (typeof types == 'string') types = [types];
    for (let type of types) {
      let event = this.eventList[type];
      if (!event) {
        this.eventList[type] = { fired: null, list: [] };
      } else if (event.fired) {
        const fired = event.fired;
        const out = fn.call(fired.self, fired.data, fired.details);
        if (out instanceof Promise) out.catch(error => {
          console.error('[error.event.fired]', error.stack || error);
          if (type != 'error')
            this.event('error', { error, data: fired.data });
        });
      }
      event = this.eventList[type].list;
      if (event.indexOf(fn) !== -1) return;
      event.push(fn);
    }
  }
  event(types, data, me) {
    const promises = [];
    if (typeof types == 'string') types = [types];
    for (let type of types) {
      let event = this.eventList[type];
      const details = { type, time: Date.now() };
      const props = { self: me, data, details };
      if (!event) {
        this.eventList[type] = { fired: props, list: [] };
        continue;
      }
      event.fired = props;
      event = event.list;
      for (let fn of event) {
        promises.push(new Promise((resolve, reject) => {
          try {
            fn = fn.call(me, data, details);
            if (fn instanceof Promise)
              return fn.then(resolve).catch(errorHandler);
            return resolve(fn);
          } catch(error) {
            return errorHandler(error);
          }
          function errorHandler(error) {
            console.error('[error.event]', error.stack || error);
            if (type != 'error')
              this.event('error', { error, data });
            return reject(error);
          }
        }));
      }
    }
    return Promise.all(promises);
  }
  clean(type) {
    if (!this.eventList.hasOwnProperty(type)) return;
    this.eventList[type].fired = null;
  }
  remove(type, fn) {
    if (!this.eventList.hasOwnProperty(type)) return;
    const event = this.eventList[type].list;
    const index = event.indexOf(fn);
    if (index === -1) return;
    event.splice(index, 1);
  }
  destroy(type) {
    if (!this.eventList.hasOwnProperty(type)) return;
    delete this.eventList[type];
  }
};

/* Answer List */

function answerList(queryId) {
  this.id = queryId;
  this.list = [];
};

answerList.prototype = {
  results() {
    return JSON.stringify(this.list);
  },
  add(type, set) {
    set = set || {};
    set.type = type;
    this.list.push(set);
    return set;
  }
};

// Add answer methods
{
  for (let prop in ANSWER_METHODS) {
    answerList.prototype[prop] = (name => {
      return function(set) {
        return this.add(name, set);
      };
    })(ANSWER_METHODS[prop]);
  }
}

/* Functions */

function props(form, opt) {
  opt = opt || {};
  form = form || {};
  // Reply to message
  if (opt.reply) form['reply_to_message_id'] = opt.reply;
  // Markdown/HTML support for message (bold, italic, urls and preformatted text)
  if (opt.parse) form['parse_mode'] = opt.parse;
  // Markup object
  if (opt.markup !== undefined) {
    if (opt.markup == 'hide' || opt.markup === false) {
      // Hide keyboard
      form['reply_markup'] = JSON.stringify({ hide_keyboard: true });
    } else if (opt.markup == 'reply') {
      // Fore reply
      form['reply_markup'] = JSON.stringify({ force_reply: true });
    } else {
      // JSON keyboard
      form['reply_markup'] = opt.markup;
    }
  }
  return form;
}

function sendFile(type, id, file, opt) {
  opt = opt || {};
  const form = props({ chat_id: id }, opt);
  let url = 'send' + type.charAt(0).toUpperCase() + type.slice(1);
  // Send bot action event
  this.event(url, [].slice.call(arguments).splice(0, 1));
  // Add caption to photo
  if (type == 'photo' && opt.caption) form.caption = opt.caption;
  url = '/' + url;
  if (typeof file == 'string' && REGEX.url.test(file)) {
    // If url, get blob and send to user
    return getBlob(file).then(data => {
      if (!opt.name) {
        const match = REGEX.name.exec(file);
        opt.name = match ? match[0] : type + '.' + mime[data.type].extensions[0];
      }
      form[type] = {
        value: data.buffer,
        options: { filename: opt.name, contentType: data.type }
      };
      return this.request(url, null, form);
    });
  } else {
    // String as 'file_id'
    form[type] = file;
    return this.request(url, null, form);
  }
}

function getBlob(url) {
  return new Promise((resolve, reject) => {
    request.get({ url, encoding: null }, (error, response, buffer) => {
      if (error || !buffer) return reject(error);
      return resolve({ buffer, type: response.headers['content-type'] });
    });
  });
}

function extend(me, input) {
  for (let obj of input) {
    for (let name in obj) {
      const key = me[name], value = obj[name];
      if (key !== undefined) {
        if (!Array.isArray(key)) me[name] = [key];
        me[name].push(value);
        continue;
      }
      me[name] = value;
    }
  }
  return me;
}

/* Exports */

module.exports = TeleBot;

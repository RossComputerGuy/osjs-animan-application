import osjs from 'osjs';
import {name as applicationName} from './metadata.json';

import {app,h} from 'hyperapp';
import {Box,BoxContainer,Menubar,MenubarItem,Tabs,TextField} from '@osjs/gui';

import * as languages from './locales';

const startApp = (proc,core,metadata,_) => {
  let ws = proc.socket();
  const req = obj => new Promise((resolve,reject) => {
    ws.send(JSON.stringify(obj));
    ws.once('message',resp => {
      resp = JSON.parse(resp.data);
      if(resp.type == 'error') return reject(resp);
      resolve(resp);
    });
  });
  const onwindowcreate = win => {
    req({ type: 'user.list' }).then(data => {
      data = data.MediaListCollection.lists[0].entries || [];
      var entry = null;
      for(var entry of data) {
        if(win.state.title.indexOf(entry.media.title.userPreferred) == -1) continue;
        const episode = win.state.title.substr(win.state.title.indexOf(entry.media.title.userPreferred)).match(/\d+/g).map(Number)[0];
        core.make('osjs/notification',{
          message: 'Currently watching episode '+episode+' of '+entry.media.title.userPreferred
        });
        if(isNaN(episode)) continue;
        win.on('destroy',() => {
          core.make('osjs/notification',{
            message: _('NOTIF_UPDATING',entry.media.title.userPreferred,episode)
          });
          entry.progress = episode;
          req({ type: 'anime.update', vars: entry }).then(console.log).catch(err => core.make('osjs/dialog','alert',{ message: err.message },(btn, value) => {}));
        });
        return;
      }
    }).catch(err => core.make('osjs/dialog','alert',{ message: err.message },(btn, value) => {}));
  };
  ws.on('open',() => {
    ws.send(JSON.stringify({ type: 'auth', token: proc.settings.token }));
  });
  core.on('osjs/window:render',onwindowcreate);
  const entry = core.make('osjs/tray',{
    title: _('TRAY_NAME'),
    oncontextmenu: ev => {
      ev.stopPropagation();
      ev.preventDefault();
      core.make('osjs/contextmenu').show({
        position: ev.target,
        menu: [
          { label: _('QUIT'), onclick: () => proc.destroy() }
        ]
      });
    }
  });
  proc.on('destroy',() => {
    core.off('osjs/window:render',onwindowcreate);
    entry.destroy();
    ws.close();
  });
};

const register = (core,args,options,metadata) => {
  const proc = core.make('osjs/application',{args,options,metadata});
  const {translatable} = core.make('osjs/locale');
  const _ = translatable(languages);
  if(typeof(proc.settings.token) == 'undefined') {
    let ws = proc.socket();
    ws.on('open',() => {
      ws.send(JSON.stringify({ type: 'config' }));
      ws.on('error',err => core.make('osjs/dialog','alert',{ message: err.message },(btn, value) => {}));
      ws.once('message',msg => {
        msg = JSON.parse(msg.data.toString());
        let client_id = msg.client_id;
        window.open('https://anilist.co/api/v2/oauth/authorize?client_id='+client_id+'&response_type=token');
        ws.close();
        core.make('osjs/dialog','prompt',{ message: _('LOGIN') },(btn,value) => {
          if(btn == 'ok') {
            proc.settings.token = value;
            proc.saveSettings();
            return startApp(proc,core,metadata,_);
          }
          return proc.destroy();
        });
      });
    });
  } else startApp(proc,core,metadata,_);
  return proc;
};
osjs.register(applicationName,register);

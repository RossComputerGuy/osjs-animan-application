import osjs from 'osjs';
import {name as applicationName} from './metadata.json';

import {app,h} from 'hyperapp';
import {Box,BoxContainer,Menubar,MenubarItem,Tabs,TextField} from '@osjs/gui';

const isPlaying = (core,animeTitle) => core.make('osjs/windows').list().filter(win => {
  const episode = win.state.title.substr(win.state.title.indexOf(animeTitle)).match(/\d+/g).map(Number);
  return win.state.title.contains(animeTitle) && !isNaN(episode);
}).map(win => {
  const episode = win.state.title.substr(win.state.title.indexOf(animeTitle)).match(/\d+/g).map(Number);
  if(isNaN(episode)) return null;
  return { animeTitle, episode };
});

const startApp = (proc,core,metadata) => {
  let win = null;
  let ws = proc.socket();
  const req = obj => new Promise((resolve,reject) => {
    ws.send(JSON.stringify(obj));
    ws.once('message',resp => {
      resp = JSON.parse(resp.data);
      if(resp.type == 'error') return reject(resp);
      resolve(resp);
    });
  });
  let animeList = {
    'CURRENT': [],
    'PLANNING': [],
    'COMPLETED': [],
    'DROPPED': [],
    'PAUSED': [],
    'REPEATING': []
  };
  const refreshList = status => {
    if(typeof(status) == 'string') {
      req({
        type: 'user.list',
        vars: {
          status: status
        }
      }).then(data => {
        if(typeof(data.MediaListCollection.lists[0].entries) == "undefined") console.log(data);
        animeList[status] = data.MediaListCollection.lists[0].entries;
        console.log(status+' =>',animeList[status]);
      }).catch(err => core.make('osjs/dialog','alert',{ message: err.message },(btn, value) => {}));
    } else {
      for(status in animeList) refreshList(status);
    }
  };
  ws.on('open',() => {
    ws.send(JSON.stringify({ type: 'auth', token: proc.settings.token }));
    refreshList();
  });
  const AnimeListTable = (props,status) => h('table',{},[
    h('tr',{},[
      h('th',{},'Title'),
      h('th',{},'Progress'),
      h('th',{},'Episodes'),
      h('th',{},'Score')
    ]),
    animeList[status].map(elem => h('tr',Object.assign({
      onclick: ev => (status,actions) => {
        // TODO: show anime dialog
      }
    },props),[
      h('th',{},elem.media.title.userPreferred),
      h('th',{},elem.progress),
      h('th',{},elem.media.episodes)
    ]))
  ]);
  const createWindow = () => {
    win = proc.createWindow({
      id: 'AniManWindow',
      title: metadata.title.en_EN,
      dimension: {width: 500,height: 400}
    }).render($content => {
      app({
      },{
        menuFile: ev => (state,actions) => {
          core.make('osjs/contextmenu').show({
            position: ev.target,
            menu: [
              { label: 'Refresh', onclick: () => refreshList() },
              { label: 'Quit', onclick: () => proc.destroy() }
            ]
          });
        }
      },(state,actions) => h(Box,{ grow: 1, padding: false },[
        h(Menubar,{},[
          h(MenubarItem,{ onclick: ev => actions.menuFile(ev) },'File')
        ]),
        h(Tabs,{
          labels: ['Anime List','Now Playing']
        },[
          /* TAB: Anime List */
          h(Tabs,{
            labels: ['Watching','Plan to Watch','Completed','Dropped','Paused','Repeating']
          },[
            /* TAB: Watching */,
            h(AnimeListTable,{},'CURRENT'),
            /* TAB: Plan to Watch */
            h(AnimeListTable,{},'PLANNING'),
            /* TAB: Completed */
            h(AnimeListTable,{},'COMPLETED'),
            /* TAB: Dropped */
            h(AnimeListTable,{},'DROPPED'),
            /* TAB: Paused */
            h(AnimeListTable,{},'PAUSED'),
            /* TAB: Repeating */
            h(AnimeListTable,{},'REPEATING'),
          ]),
          /* TAB: Now Playing */
          h(Box,{},[
          ])
        ])
      ]),$content);
    }).on('destroy',() => {
      win = null;
    });
  };
  const entry = core.make('osjs/tray',{
    title: 'AniMan',
    onclick: ev => {
      if(win) {
        win.raise();
        win.focus();
      } else createWindow();
    },
    oncontextmenu: ev => {
      ev.stopPropagation();
      ev.preventDefault();
      core.make('osjs/contextmenu').show({
        position: ev.target,
        menu: [
          { label: 'Restore', onclick: () => {
            if(win) {
              win.raise();
              win.focus();
            } else createWindow();
          } },
          { label: 'Quit', onclick: () => proc.destroy() }
        ]
      });
    }
  });
  proc.on('destroy',() => {
    entry.destroy();
    ws.close();
  });
  createWindow();
};

const register = (core,args,options,metadata) => {
  const proc = core.make('osjs/application',{args,options,metadata});
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
        core.make('osjs/dialog','prompt',{ message: 'Please paste token' },(btn,value) => {
          if(btn == 'ok') {
            proc.settings.token = value;
            proc.saveSettings();
            return startApp(proc,core,metadata);
          }
          return proc.destroy();
        });
      });
    });
  } else startApp(proc,core,metadata);
  return proc;
};
osjs.register(applicationName,register);

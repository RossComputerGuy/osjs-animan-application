import osjs from 'osjs';
import {name as applicationName} from './metadata.json';

import {app,h} from 'hyperapp';
import {Box,Menubar,MenubarItem} from '@osjs/gui';

const createWindow = (proc,metadata) => {
  return proc.createWindow({
    id: 'AniManWindow',
    title: metadata.title.en_EN,
    dimension: {width: 400,height: 400}
  })
  .render($content => {
    app({},{
      menuFile: ev => (state,actions) => {
        core.make('osjs/contextmenu').show({
          position: ev.target,
          menu: [
            { label: 'Quit', onclick: () => proc.destroy() }
          ]
        });
      }
    },(state,actions) => h(Box,{ grow: 1, padding: false},[
      h(Menubar,{ onclick: ev => actions.menuFile(ev) },'File')
    ]));
  });
};

const register = (core,args,options,metadata) => {
  const proc = core.make('osjs/application',{args,options,metadata});
  var win = null;
  const entry = core.make('osjs/tray',{
    title: 'AniMan',
    onclick: ev => {
      if(win) {
        win.raise();
        win.focus();
      } else {
        win = createWindow(proc,metadata);
        win.on('destroy',() => win = null);
      }
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
            } else {
              win = createWindow(proc,metadata);
              win.on('destroy',() => win = null);
            }
          } },
          { label: 'Quit', onclick: () => proc.destroy() }
        ]
      });
    }
  });
  proc.on('destroy',() => entry.destroy());
  return proc;
};
osjs.register(applicationName,register);

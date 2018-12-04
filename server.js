const AniList = require('aniwrapper/node');

module.exports = (core,proc) => ({
  init: async () => {
    core.app.ws(proc.resource('/socket'),(ws,req) => {
      let anilist = null;
      const respWrapper = promise => promise.then(data => ws.send(JSON.stringify(data))).catch(err => ws.send(JSON.stringify(({ type: 'error', name: err.name, message: err.message }))));
      ws.on('message',msg => {
        msg = JSON.parse(msg.toString());
        console.log(proc.resource('/socket')+' >',msg);
        switch(msg.type) {
          case 'config':
            ws.send(JSON.stringify(core.config().animan));
            break;
          case 'auth':
            anilist = new AniList(msg.token);
            break;
          case 'anime.remove':
            respWrapper(anilist.removeAnime(msg.id));
            break;
          case 'anime.add':
            respWrapper(anilist.addAnime(msg.vars));
            break;
          case 'anime.update':
            respWrapper(anilist.updateAnime(msg.vars));
            break;
          case 'anime.search':
            respWrapper(anilist.searchAnime(msg.name));
            break;
          case 'user.list':
            if(typeof(msg.vars) == 'object') {
              return respWrapper(anilist.getUserListForUser(Object.assign({
                id: anilist.decode.sub,
                listType: 'ANIME',
                status: 'CURRENT'
              },msg.vars)));
            }
            respWrapper(anilist.getUserList());
            break;
          default:
            ws.send(JSON.stringify(({ type: 'error', name: 'Error', message: 'Invalid request type' })));
            break;
        }
      });
    });
  }
});

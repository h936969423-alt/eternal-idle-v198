/* Notification-only worker: no fetch interception or game caching. */
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  event.waitUntil((async()=>{
    const target=new URL('/',self.location.origin).href;
    const clientsList=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    const game=clientsList.find(client=>client.url.startsWith(self.location.origin));
    if(game){await game.focus();return;}
    await self.clients.openWindow(target);
  })());
});

// Photo previews and canvas exports decode locally created object URLs.
// Twitch is the only external script/frame origin; images remain local.
module.exports = {
  contentSecurityPolicy: {
    directives: {
      imgSrc: ["'self'", 'data:', 'blob:'],
      scriptSrc: ["'self'", 'https://player.twitch.tv'],
      frameSrc: ["'self'", 'https://player.twitch.tv'],
    },
  },
}

// Run locally yourself; never paste the private key in chat or commit it.
const { generateVAPIDKeys } = require('web-push')
const keys = generateVAPIDKeys()
console.log(
  `VAPID_PUBLIC_KEY=${keys.publicKey}\nVAPID_PRIVATE_KEY=${keys.privateKey}\nVAPID_SUBJECT=https://legal-branding.com`
)
